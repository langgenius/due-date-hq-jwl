import { and, asc, eq, inArray } from 'drizzle-orm'
import type { StripeBillingHooks, StripeSubscriptionSyncInput } from '@duedatehq/auth'
import { authSchema, firmSchema, type Db } from '@duedatehq/db'

function isOwnerRole(role: string | null | undefined): boolean {
  return role === 'owner'
}

export function buildBillingHooks(db: Db): StripeBillingHooks {
  return {
    async authorizeReference(input) {
      if (input.activeOrganizationId !== input.referenceId) return false

      const [membership] = await db
        .select({ role: authSchema.member.role, status: authSchema.member.status })
        .from(authSchema.member)
        .where(
          and(
            eq(authSchema.member.organizationId, input.referenceId),
            eq(authSchema.member.userId, input.userId),
          ),
        )
        .limit(1)

      // billing.read is owner-only (mirrors core's FIRM_PERMISSION_ROLES) —
      // every billing action, read or write, requires the owner role.
      if (!membership || membership.status !== 'active') return false
      return isOwnerRole(membership.role)
    },

    async syncSubscription(input: StripeSubscriptionSyncInput) {
      await db
        .update(firmSchema.firmProfile)
        .set({
          plan: input.plan,
          seatLimit: input.seatLimit,
          billingCustomerId: input.stripeCustomerId ?? null,
          billingSubscriptionId: input.stripeSubscriptionId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(firmSchema.firmProfile.id, input.referenceId))

      await reconcileSeatLimit(db, input)
    },
  }
}

// When the seat limit shrinks, keep the highest-ranked roles active and
// suspend from the bottom of the hierarchy (Partner >= Manager > Preparer >
// Coordinator); within a rank, the newest member is suspended first. Owners
// never get suspended. Pure so the policy is unit-testable.
const SEAT_KEEP_RANK: Record<string, number> = {
  partner: 0,
  manager: 1,
  preparer: 2,
  coordinator: 3,
}

export function seatOverflowMemberIds(
  activeMembers: ReadonlyArray<{ id: string; role: string | null; createdAt: Date }>,
  seatLimit: number,
): string[] {
  const ownerCount = activeMembers.filter((member) => isOwnerRole(member.role)).length
  const nonOwnerSeatLimit = Math.max(seatLimit - ownerCount, 0)
  const rank = (role: string | null) => SEAT_KEEP_RANK[role ?? ''] ?? Number.MAX_SAFE_INTEGER
  return activeMembers
    .filter((member) => !isOwnerRole(member.role))
    .toSorted(
      (a, b) => rank(a.role) - rank(b.role) || a.createdAt.getTime() - b.createdAt.getTime(),
    )
    .slice(nonOwnerSeatLimit)
    .map((member) => member.id)
}

async function reconcileSeatLimit(db: Db, input: StripeSubscriptionSyncInput): Promise<void> {
  const activeMembers = await db
    .select({
      id: authSchema.member.id,
      role: authSchema.member.role,
      createdAt: authSchema.member.createdAt,
    })
    .from(authSchema.member)
    .where(
      and(
        eq(authSchema.member.organizationId, input.referenceId),
        eq(authSchema.member.status, 'active'),
      ),
    )
    .orderBy(asc(authSchema.member.createdAt))

  const suspendMemberIds = seatOverflowMemberIds(activeMembers, input.seatLimit)

  if (suspendMemberIds.length > 0) {
    await db
      .update(authSchema.member)
      .set({ status: 'suspended' })
      .where(inArray(authSchema.member.id, suspendMemberIds))
  }

  const activeSeatCount = activeMembers.length - suspendMemberIds.length
  const allowedPendingInvitations = Math.max(input.seatLimit - activeSeatCount, 0)
  const pendingInvitations = await db
    .select({ id: authSchema.invitation.id })
    .from(authSchema.invitation)
    .where(
      and(
        eq(authSchema.invitation.organizationId, input.referenceId),
        eq(authSchema.invitation.status, 'pending'),
      ),
    )
    .orderBy(asc(authSchema.invitation.createdAt))
  const cancelInvitationIds = pendingInvitations
    .slice(allowedPendingInvitations)
    .map((invitation) => invitation.id)

  if (cancelInvitationIds.length > 0) {
    await db
      .update(authSchema.invitation)
      .set({ status: 'canceled' })
      .where(inArray(authSchema.invitation.id, cancelInvitationIds))
  }
}
