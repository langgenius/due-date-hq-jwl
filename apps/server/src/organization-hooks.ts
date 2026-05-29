import { APIError } from 'better-auth/api'
import { and, count, eq, gt, isNull } from 'drizzle-orm'
import { planHasFeature } from '@duedatehq/core/plan-entitlements'
import { authSchema, firmSchema, type Db } from '@duedatehq/db'
import { createAuditWriter } from '@duedatehq/db/audit-writer'
import type { OrganizationHooks } from '@duedatehq/auth'

/**
 * Build the organization-plugin lifecycle hooks for the running Worker.
 *
 * Lives in the server layer (NOT in packages/auth) because it imports the
 * firm_profile schema — the dep-direction DAG (scripts/check-dep-direction.mjs)
 * forbids packages/auth from importing @duedatehq/db.
 *
 * Exported as a standalone factory so unit tests can mock `db.insert` and
 * assert the inserted row shape without spinning up a real Worker / D1.
 *
 * Failure semantics (recorded in dev-log 2026-04-24):
 *   - `afterCreateOrganization` swallows DB errors and only logs.
 *     Better Auth does not roll back the organization row when this hook
 *     throws — throwing only surfaces an opaque error to the user. The
 *     real safety net is `tenantMiddleware` lazy-creating the firm_profile
 *     on the next request, so the worst-case is one extra round-trip.
 *   - Member/invitation hooks are the Better Auth bypass guard for the
 *     Members gateway: oRPC owns product UX, but direct Better Auth calls
 *     still must obey role, active firm, and seat gates.
 */
export function buildOrganizationHooks(db: Db): OrganizationHooks {
  const audit = createAuditWriter(db)
  return {
    afterCreateOrganization: async ({ organization, user }) => {
      const now = new Date()
      try {
        await db.insert(firmSchema.firmProfile).values({
          id: organization.id,
          name: organization.name,
          plan: 'solo',
          seatLimit: 1,
          // Default tz is a P0 ICP assumption (PRD §2.1: US CPA).
          // P1 onboarding will let the user pick — see ADR 0010 follow-ups.
          timezone: 'America/New_York',
          internalDeadlineOffsetDays: 14,
          monitoringStartDate: now.toISOString().slice(0, 10),
          ownerUserId: user.id,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        })
      } catch (err) {
        // Swallow + log. Throwing here would surface to the onboarding
        // submit, but the org row stays committed (better-auth doesn't
        // roll back), leaving an orphan that tenantMiddleware's lazy
        // create handles cleanly. Preferring deterministic behavior over
        // fail-fast since the next request fixes things automatically.
        console.error('[firm_profile.afterCreateOrganization] insert failed', {
          orgId: organization.id,
          userId: user.id,
          message: err instanceof Error ? err.message : String(err),
        })
      }
    },
    beforeAddMember: async ({ member }) => {
      if (member.role === 'owner') {
        await assertOwnerBootstrap(db, member.organizationId)
        return
      }
      assertManagedRole(member.role)
      await assertFirmCanAddSeat(db, member.organizationId)
    },
    beforeUpdateMemberRole: async ({ member, newRole }) => {
      assertManagedRole(newRole)
      if (member.role === 'owner') {
        throw new APIError('FORBIDDEN', { message: 'Owner transfer is not available yet.' })
      }
    },
    beforeRemoveMember: async ({ member }) => {
      if (member.role === 'owner') {
        throw new APIError('FORBIDDEN', { message: 'Owner removal is not available yet.' })
      }
    },
    beforeCreateInvitation: async ({ invitation }) => {
      assertManagedRole(invitation.role)
      await assertFirmCanInvite(db, invitation.organizationId)
    },
    afterCreateInvitation: async ({ invitation, inviter }) => {
      await audit.write({
        firmId: invitation.organizationId,
        actorId: inviter.id,
        entityType: 'member_invitation',
        entityId: invitation.id,
        action: 'member.invited',
        after: { email: invitation.email, role: invitation.role },
      })
    },
    afterCancelInvitation: async ({ invitation, cancelledBy }) => {
      await audit.write({
        firmId: invitation.organizationId,
        actorId: cancelledBy.id,
        entityType: 'member_invitation',
        entityId: invitation.id,
        action: 'member.invitation.canceled',
        before: { email: invitation.email, role: invitation.role },
      })
    },
    beforeAcceptInvitation: async ({ invitation, organization }) => {
      assertManagedRole(invitation.role)
      await assertFirmCanAddSeat(db, organization.id)
    },
    afterAcceptInvitation: async ({ invitation, member }) => {
      await audit.write({
        firmId: member.organizationId,
        actorId: member.userId,
        entityType: 'member',
        entityId: member.id,
        action: 'member.accepted',
        after: { email: invitation.email, role: member.role },
      })
    },
    afterUpdateMemberRole: async ({ member, previousRole }) => {
      await audit.write({
        firmId: member.organizationId,
        actorId: null,
        entityType: 'member',
        entityId: member.id,
        action: 'member.role.updated',
        before: { role: previousRole },
        after: { role: member.role },
        reason: 'better-auth direct member role update',
      })
    },
    afterRemoveMember: async ({ member }) => {
      await audit.write({
        firmId: member.organizationId,
        actorId: null,
        entityType: 'member',
        entityId: member.id,
        action: 'member.removed',
        before: { role: member.role, userId: member.userId },
        reason: 'better-auth direct member removal',
      })
    },
  }
}

export function buildOrganizationMembershipLimit(db: Db) {
  return async (_user: unknown, organization: { id: string }): Promise<number> =>
    loadActiveSeatLimit(db, organization.id)
}

export function buildAllowUserToCreateOrganization(db: Db) {
  return async (user: { id: string }): Promise<boolean> => {
    const ownedActiveFirms = await db
      .select({ plan: firmSchema.firmProfile.plan })
      .from(firmSchema.firmProfile)
      .innerJoin(authSchema.member, eq(authSchema.member.organizationId, firmSchema.firmProfile.id))
      .where(
        and(
          eq(authSchema.member.userId, user.id),
          eq(authSchema.member.status, 'active'),
          eq(firmSchema.firmProfile.ownerUserId, user.id),
          eq(firmSchema.firmProfile.status, 'active'),
          isNull(firmSchema.firmProfile.deletedAt),
        ),
      )

    if (ownedActiveFirms.length === 0) return true
    return ownedActiveFirms.some((firm) => planHasFeature(firm.plan, 'multiplePractices'))
  }
}

function assertManagedRole(
  role: string,
): asserts role is 'partner' | 'manager' | 'preparer' | 'coordinator' {
  if (role !== 'partner' && role !== 'manager' && role !== 'preparer' && role !== 'coordinator') {
    throw new APIError('FORBIDDEN', { message: 'Unsupported member role.' })
  }
}

async function loadActiveSeatLimit(db: Db, firmId: string): Promise<number> {
  const [profile] = await db
    .select({ seatLimit: firmSchema.firmProfile.seatLimit })
    .from(firmSchema.firmProfile)
    .where(and(eq(firmSchema.firmProfile.id, firmId), eq(firmSchema.firmProfile.status, 'active')))
    .limit(1)
  if (!profile) {
    throw new APIError('FORBIDDEN', { message: 'Firm is not active.' })
  }
  return profile.seatLimit
}

async function assertOwnerBootstrap(db: Db, firmId: string): Promise<void> {
  const [existing] = await db
    .select({ value: count() })
    .from(authSchema.member)
    .where(eq(authSchema.member.organizationId, firmId))
    .limit(1)
  if ((existing?.value ?? 0) > 0) {
    throw new APIError('FORBIDDEN', { message: 'Owner transfer is not available yet.' })
  }
}

async function assertFirmCanAddSeat(db: Db, firmId: string): Promise<void> {
  const seatLimit = await loadActiveSeatLimit(db, firmId)
  const [active] = await db
    .select({ value: count() })
    .from(authSchema.member)
    .where(
      and(eq(authSchema.member.organizationId, firmId), eq(authSchema.member.status, 'active')),
    )
  if ((active?.value ?? 0) >= seatLimit) {
    throw new APIError('FORBIDDEN', { message: 'Firm seat limit reached.' })
  }
}

async function assertFirmCanInvite(db: Db, firmId: string): Promise<void> {
  const seatLimit = await loadActiveSeatLimit(db, firmId)
  const now = new Date()
  const [active, pending] = await Promise.all([
    db
      .select({ value: count() })
      .from(authSchema.member)
      .where(
        and(eq(authSchema.member.organizationId, firmId), eq(authSchema.member.status, 'active')),
      ),
    db
      .select({ value: count() })
      .from(authSchema.invitation)
      .where(
        and(
          eq(authSchema.invitation.organizationId, firmId),
          eq(authSchema.invitation.status, 'pending'),
          gt(authSchema.invitation.expiresAt, now),
        ),
      ),
  ])
  if ((active[0]?.value ?? 0) + (pending[0]?.value ?? 0) >= seatLimit) {
    throw new APIError('FORBIDDEN', { message: 'Firm seat limit reached.' })
  }
}
