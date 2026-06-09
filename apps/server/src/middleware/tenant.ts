import { createMiddleware } from 'hono/factory'
import { and, asc, eq } from 'drizzle-orm'
import { ErrorCodes } from '@duedatehq/contracts/errors'
import {
  authSchema,
  createDb,
  firmSchema,
  scoped,
  type Db,
  type FirmProfile,
  type TenantContext,
} from '@duedatehq/db'
import type { Env, ContextVars } from '../env'
import { createAuthSessionsRepo } from '../auth-sessions'
import { auditRequestMetadata, withAuditRequestMetadata } from '../lib/audit-request-metadata'

/**
 * Tenant isolation gate (docs/dev-file/06 §4.1, §4.2; ADR 0010).
 *
 * HARD CONTRACT:
 *   - `firmId` MUST come from `session.activeOrganizationId`; NEVER from request input.
 *   - `scoped(db, firmId)` is the sole DB entry point handed to procedures.
 *   - The resolved `tenantContext` (plan / seatLimit / timezone / status)
 *     is injected into `c.var.tenantContext` so procedures can gate behavior
 *     without re-querying firm_profile.
 *
 * Self-healing path (ADR 0010 §Consequences):
 *   If a session has a valid org + active membership but no firm_profile row
 *   (the `afterCreateOrganization` hook failed silently, or the row predates
 *   the firm_profile migration), this middleware lazy-creates the row using
 *   the earliest `member.role='owner'` as ownerUserId. The current request
 *   continues uninterrupted.
 */
export const tenantMiddleware = createMiddleware<{
  Bindings: Pick<Env, 'AUTH_SECRET' | 'DB'>
  Variables: ContextVars
}>(async (c, next) => {
  if (c.req.path.startsWith('/rpc/firms/')) {
    return next()
  }

  const firmId = c.get('firmId')
  if (!firmId) {
    return c.json({ error: ErrorCodes.TENANT_MISSING }, 401)
  }

  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const db = createDb(c.env.DB)

  // 1) Active membership check (existing invariant). DB has a UNIQUE
  //    (organization_id, user_id) index so exactly one row is expected; we
  //    still ORDER BY createdAt ASC + LIMIT 1 as defense in depth against
  //    future schema drift / manual writes that could sneak duplicates in.
  const [membership] = await db
    .select({ status: authSchema.member.status })
    .from(authSchema.member)
    .where(and(eq(authSchema.member.organizationId, firmId), eq(authSchema.member.userId, userId)))
    .orderBy(asc(authSchema.member.createdAt))
    .limit(1)

  if (!membership) {
    return c.json({ error: ErrorCodes.TENANT_MISMATCH }, 403)
  }

  if (membership.status !== 'active') {
    return c.json({ error: 'FORBIDDEN' }, 403)
  }

  // 2) Load firm_profile (the new business-tenant row).
  let profile = await loadFirmProfile(db, firmId)

  // 3) Lazy create self-heal: org + active membership exist but firm_profile
  //    is missing. Happens when the afterCreateOrganization hook silently
  //    failed (network blip, migration order issue) or for orgs predating
  //    the firm_profile migration. The current request fixes things and
  //    continues — no user-visible failure.
  if (!profile) {
    const [org] = await db
      .select({ id: authSchema.organization.id, name: authSchema.organization.name })
      .from(authSchema.organization)
      .where(eq(authSchema.organization.id, firmId))
      .limit(1)

    if (!org) {
      // Stale activeOrganizationId pointing at a deleted org.
      return c.json({ error: ErrorCodes.TENANT_MISSING }, 401)
    }

    const ownerUserId = await pickOwnerUserId(db, firmId, userId)
    profile = await insertLazyFirmProfile(db, { id: firmId, name: org.name, ownerUserId })
  }

  // 4) Business state gate. PRD §3.6.8 plan-downgrade flow flips this.
  if (profile.status !== 'active') {
    return c.json({ error: ErrorCodes.TENANT_SUSPENDED }, 403)
  }

  // 5) Inject tenantContext + scoped repo.
  const tenant: TenantContext = {
    firmId,
    plan: profile.plan,
    seatLimit: profile.seatLimit,
    timezone: profile.timezone,
    internalDeadlineOffsetDays: profile.internalDeadlineOffsetDays,
    monitoringStartDate: profile.monitoringStartDate,
    status: profile.status,
    ownerUserId: profile.ownerUserId,
    coordinatorCanSeeDollars: profile.coordinatorCanSeeDollars,
    // Public read-only demo visitor → all writes rejected downstream.
    isReadOnlyDemo: (c.get('userId') ?? '').startsWith('public_demo_'),
    createdAt: profile.createdAt,
  }
  c.set('tenantContext', tenant)
  c.set('authSessions', createAuthSessionsRepo(db))
  c.set(
    'scoped',
    withAuditRequestMetadata(
      scoped(db, firmId),
      await auditRequestMetadata(c.env.AUTH_SECRET, c.req.raw.headers),
    ),
  )
  return next()
})

async function loadFirmProfile(db: Db, firmId: string): Promise<FirmProfile | undefined> {
  const [row] = await db
    .select()
    .from(firmSchema.firmProfile)
    .where(eq(firmSchema.firmProfile.id, firmId))
    .limit(1)
  return row
}

/**
 * Lazy-create scenarios (`afterCreateOrganization` hook failed / migration
 * orphan / pre-firm_profile orgs) mean the requester is NOT necessarily the
 * original creator — derive owner from the member table instead. We pick the
 * earliest member.role='owner'; only fall back to the current user when no
 * owner row exists at all (which would itself be a Better Auth invariant
 * breach, so we log it).
 */
async function pickOwnerUserId(db: Db, firmId: string, fallbackUserId: string): Promise<string> {
  const [ownerMember] = await db
    .select({ userId: authSchema.member.userId })
    .from(authSchema.member)
    .where(and(eq(authSchema.member.organizationId, firmId), eq(authSchema.member.role, 'owner')))
    .orderBy(asc(authSchema.member.createdAt))
    .limit(1)

  if (!ownerMember) {
    console.warn('[tenant] lazy_create_no_owner_member', {
      firmId,
      fallbackUserId,
    })
    return fallbackUserId
  }
  return ownerMember.userId
}

async function insertLazyFirmProfile(
  db: Db,
  init: { id: string; name: string; ownerUserId: string },
): Promise<FirmProfile> {
  const now = new Date()
  // ON CONFLICT DO NOTHING makes lazy-create idempotent under the concurrent
  // first-RPC fan-out: if two parallel requests both observe a missing
  // firm_profile (hook silently failed) and both reach this insert, only one
  // of them will write the row; the other no-ops and falls through to the
  // re-read below. Without this guard, the loser hits a PK violation that
  // surfaces as an unhandled 500 to the user — the exact scenario the swallow
  // + log + lazy-create choreography was supposed to prevent.
  await db
    .insert(firmSchema.firmProfile)
    .values({
      id: init.id,
      name: init.name,
      plan: 'solo',
      seatLimit: 1,
      timezone: 'America/New_York',
      internalDeadlineOffsetDays: 14,
      monitoringStartDate: now.toISOString().slice(0, 10),
      ownerUserId: init.ownerUserId,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: firmSchema.firmProfile.id })

  const reloaded = await loadFirmProfile(db, init.id)
  if (!reloaded) {
    // INSERT or no-op succeeded but the row is gone — only path here is a
    // race with a CASCADE delete on the parent organization between INSERT
    // and re-read. Treat as the org being deleted under us.
    throw new Error(`firm_profile lazy create raced and re-read still empty for ${init.id}`)
  }
  return reloaded
}
