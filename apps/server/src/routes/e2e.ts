import { Hono } from 'hono'
import { makeSignature } from 'better-auth/crypto'
import { and, eq, inArray } from 'drizzle-orm'
import { authSchema, createDb, firmSchema, scoped } from '@duedatehq/db'
import { internalDeadlineFromBaseDueDate } from '@duedatehq/core/deadlines'
import type { ContextVars, Env } from '../env'

type SeedMode = 'empty' | 'obligations' | 'pulse' | 'mfa' | 'mfaVerified' | 'team' | 'filingPlan'
type DemoRole = 'owner' | 'partner' | 'manager' | 'preparer' | 'coordinator'
type DemoPlan = 'solo' | 'pro' | 'team'
type SeedRole = DemoRole
type BillingPlan = DemoPlan | 'firm'
type BillingStatus = 'active' | 'trialing' | 'past_due' | 'paused'
type BillingInterval = 'month' | 'year'

interface E2ESeedRequest {
  seed?: SeedMode
  role?: SeedRole
  testId?: string
}

interface E2ESwitchRoleRequest {
  firmId: string | null
  role: DemoRole | null
}

const COOKIE_NAME = 'duedatehq.session_token'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
const DEMO_FIRM_ID = 'mock_firm_brightline'
export const DEMO_ACCOUNTS = [
  {
    id: 'brightline-owner',
    role: 'owner',
    userId: 'mock_user_owner_sarah',
    firmId: DEMO_FIRM_ID,
    plan: 'pro',
    name: 'Sarah Martinez',
    email: 'sarah.demo@duedatehq.test',
  },
  {
    id: 'brightline-manager',
    role: 'manager',
    userId: 'mock_user_manager_miguel',
    firmId: DEMO_FIRM_ID,
    plan: 'pro',
    name: 'Miguel Chen',
    email: 'miguel.manager@duedatehq.test',
  },
  {
    id: 'brightline-partner',
    role: 'partner',
    userId: 'mock_user_partner_priya',
    firmId: DEMO_FIRM_ID,
    plan: 'pro',
    name: 'Priya Shah',
    email: 'priya.partner@duedatehq.test',
  },
  {
    id: 'brightline-preparer',
    role: 'preparer',
    userId: 'mock_user_preparer_avery',
    firmId: DEMO_FIRM_ID,
    plan: 'pro',
    name: 'Avery Patel',
    email: 'avery.preparer@duedatehq.test',
  },
  {
    id: 'brightline-coordinator',
    role: 'coordinator',
    userId: 'mock_user_coordinator_jules',
    firmId: DEMO_FIRM_ID,
    plan: 'pro',
    name: 'Jules Rivera',
    email: 'jules.coordinator@duedatehq.test',
  },
  {
    id: 'plan-solo',
    role: 'owner',
    userId: 'mock_user_plan_solo',
    firmId: 'mock_firm_plan_solo',
    plan: 'solo',
    name: 'Sofia Solo',
    email: 'sofia.solo@duedatehq.test',
  },
  {
    id: 'plan-pro',
    role: 'owner',
    userId: 'mock_user_plan_pro',
    firmId: 'mock_firm_plan_pro',
    plan: 'pro',
    name: 'Priya Pro',
    email: 'priya.pro@duedatehq.test',
  },
  {
    id: 'plan-team',
    role: 'owner',
    userId: 'mock_user_plan_team',
    firmId: 'mock_firm_plan_team',
    plan: 'team',
    name: 'Taylor Team',
    email: 'taylor.team@duedatehq.test',
  },
] as const satisfies readonly {
  id: string
  role: DemoRole
  userId: string
  firmId: string
  plan: DemoPlan
  name: string
  email: string
}[]

type DemoAccountId = (typeof DEMO_ACCOUNTS)[number]['id']

const DEMO_ACCOUNT_IDS = DEMO_ACCOUNTS.map((account) => account.id)
const DEMO_USER_IDS = DEMO_ACCOUNTS.map((account) => account.userId)
const DEMO_ROLES = DEMO_ACCOUNTS.map((account) => account.role)
const DEMO_FIRM_IDS = Array.from(new Set(DEMO_ACCOUNTS.map((account) => account.firmId)))
const DEMO_DATA_MISSING = 'Demo data is missing. Run `pnpm db:seed:demo` first.'

function hasE2ESeedAccess(c: { env: Env; req: { header(name: string): string | undefined } }) {
  if (c.env.ENV === 'development') return true
  const token = c.env.E2E_SEED_TOKEN
  if (c.env.ENV !== 'staging' || !token) return false
  const header = c.req.header('authorization')
  return header === `Bearer ${token}` || c.req.header('x-e2e-seed-token') === token
}

function isSeedMode(value: unknown): value is SeedMode {
  return (
    value === 'empty' ||
    value === 'obligations' ||
    value === 'pulse' ||
    value === 'mfa' ||
    value === 'mfaVerified' ||
    value === 'team' ||
    value === 'filingPlan'
  )
}

export function isDemoRole(value: unknown): value is DemoRole {
  return (
    value === 'owner' ||
    value === 'partner' ||
    value === 'manager' ||
    value === 'preparer' ||
    value === 'coordinator'
  )
}

export function isDemoAccountId(value: unknown): value is DemoAccountId {
  return typeof value === 'string' && (DEMO_ACCOUNT_IDS as readonly string[]).includes(value)
}

export function readDemoRoleParam(value: string | null): DemoRole | null {
  if (value === null || value.length === 0) return 'owner'
  return isDemoRole(value) ? value : null
}

export function readDemoAccountParam(value: string | null): DemoAccountId | null {
  if (value === null || value.length === 0) return null
  return isDemoAccountId(value) ? value : null
}

export function pickSafeDemoRedirect(raw: string | null, fallback = '/'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback
  return raw
}

function demoAccountForRole(role: DemoRole) {
  return DEMO_ACCOUNTS.find((account) => account.role === role) ?? DEMO_ACCOUNTS[0]
}

function demoAccountForId(accountId: DemoAccountId) {
  return DEMO_ACCOUNTS.find((account) => account.id === accountId) ?? null
}

function roleLabel(role: DemoRole): string {
  if (role === 'owner') return 'Owner'
  if (role === 'partner') return 'Partner'
  if (role === 'manager') return 'Manager'
  if (role === 'preparer') return 'Preparer'
  return 'Coordinator'
}

function dateOnlyToUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function demoInternalDeadline(baseDueDate: Date): Date {
  return internalDeadlineFromBaseDueDate(baseDueDate, 14)
}

function orderDemoAccounts<T extends { id: string }>(rows: T[]): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]))
  return DEMO_ACCOUNT_IDS.map((id) => byId.get(id)).filter((row): row is T => Boolean(row))
}

export const e2eRoute = new Hono<{ Bindings: Env; Variables: ContextVars }>().post(
  '/session',
  async (c) => {
    if (!hasE2ESeedAccess(c)) {
      return c.notFound()
    }

    const input = await readSeedRequest(c.req.raw)
    const seed = input.seed ?? 'empty'
    const role = input.role ?? 'owner'
    const suffix = buildStableSuffix(input.testId)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000)
    const userId = `e2e_user_${suffix}`
    const ownerUserId = role === 'owner' ? userId : `e2e_owner_${suffix}`
    const firmId = `e2e_firm_${suffix}`
    const sessionId = `e2e_session_${suffix}`
    const token = `e2e_token_${suffix}_${crypto.randomUUID().replaceAll('-', '')}`
    const userName = role === 'owner' ? 'E2E Owner' : `E2E ${roleLabel(role)}`
    const userEmail = `${suffix}@e2e.duedatehq.test`
    const firmPlan: BillingPlan = seed === 'pulse' ? 'pro' : 'solo'
    const db = createDb(c.env.DB)

    await db.insert(authSchema.user).values({
      id: userId,
      name: userName,
      email: userEmail,
      emailVerified: true,
      // 'mfa' = enabled-but-unverified (forces the challenge route)
      // 'mfaVerified' = enabled AND verified (lands on /account/security
      // with the Disable MFA control reachable).
      twoFactorEnabled: seed === 'mfa' || seed === 'mfaVerified',
      image: null,
      createdAt: now,
      updatedAt: now,
    })

    if (ownerUserId !== userId) {
      await db.insert(authSchema.user).values({
        id: ownerUserId,
        name: 'E2E Practice Owner',
        email: `owner-${suffix}@e2e.duedatehq.test`,
        emailVerified: true,
        image: null,
        createdAt: now,
        updatedAt: now,
      })
    }

    await db.insert(authSchema.organization).values({
      id: firmId,
      name: 'E2E Practice',
      slug: `e2e-${suffix}`,
      logo: null,
      createdAt: now,
      metadata: null,
    })

    if (ownerUserId !== userId) {
      await db.insert(authSchema.member).values({
        id: `e2e_owner_member_${suffix}`,
        organizationId: firmId,
        userId: ownerUserId,
        role: 'owner',
        createdAt: now,
        status: 'active',
      })
    }

    await db.insert(authSchema.member).values({
      id: `e2e_member_${suffix}`,
      organizationId: firmId,
      userId,
      role,
      createdAt: now,
      status: 'active',
    })

    await db.insert(firmSchema.firmProfile).values({
      id: firmId,
      name: 'E2E Practice',
      plan: firmPlan,
      seatLimit: billingSeatLimit(firmPlan),
      timezone: 'America/New_York',
      internalDeadlineOffsetDays: 14,
      ownerUserId,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })

    await db.insert(authSchema.session).values({
      id: sessionId,
      token,
      userId,
      activeOrganizationId: firmId,
      twoFactorVerified: seed !== 'mfa',
      expiresAt,
      createdAt: now,
      updatedAt: now,
      ipAddress: '127.0.0.1',
      userAgent: 'Playwright E2E',
    })

    const seeded =
      seed === 'pulse'
        ? await seedPulse(db, firmId, userId)
        : seed === 'obligations'
          ? await seedObligationQueue(db, firmId)
          : seed === 'team'
            ? await seedTeamMember(db, firmId, suffix, now)
            : seed === 'filingPlan'
              ? await seedFilingPlan(db, firmId)
              : { obligationQueueRows: [] }
    const signedToken = `${token}.${await makeSignature(token, c.env.AUTH_SECRET)}`
    const requestUrl = new URL(c.req.url)
    const cookie = {
      name: COOKIE_NAME,
      value: signedToken,
      domain: requestUrl.hostname,
      path: '/',
      httpOnly: true,
      secure: requestUrl.protocol === 'https:',
      sameSite: 'Lax' as const,
      expires: Math.floor(expiresAt.getTime() / 1000),
    }

    c.header('Set-Cookie', serializeCookie(cookie))
    return c.json({
      user: { id: userId, name: userName, email: userEmail },
      firmId,
      role,
      cookie,
      seeded,
    })
  },
)

e2eRoute.get('/demo-login', async (c) => {
  if (!hasE2ESeedAccess(c)) {
    return c.notFound()
  }

  const requestUrl = new URL(c.req.url)
  const accountParam = requestUrl.searchParams.get('account')
  const accountId = readDemoAccountParam(accountParam)
  if (accountParam !== null && !accountId) return c.json({ error: 'Invalid demo account.' }, 400)

  const role = accountParam === null ? readDemoRoleParam(requestUrl.searchParams.get('role')) : null
  if (accountParam === null && !role) return c.json({ error: 'Invalid demo role.' }, 400)

  const demoAccount = accountId ? demoAccountForId(accountId) : demoAccountForRole(role ?? 'owner')
  if (!demoAccount) return c.json({ error: 'Invalid demo account.' }, 400)
  const db = createDb(c.env.DB)
  const [demoMember] = await db
    .select({
      userId: authSchema.user.id,
      firmId: authSchema.member.organizationId,
      role: authSchema.member.role,
    })
    .from(authSchema.member)
    .innerJoin(authSchema.user, eq(authSchema.user.id, authSchema.member.userId))
    .where(
      and(
        eq(authSchema.member.organizationId, demoAccount.firmId),
        eq(authSchema.member.userId, demoAccount.userId),
        eq(authSchema.member.role, demoAccount.role),
        eq(authSchema.member.status, 'active'),
      ),
    )
    .limit(1)
  const [demoFirm] = await db
    .select({ id: firmSchema.firmProfile.id, plan: firmSchema.firmProfile.plan })
    .from(firmSchema.firmProfile)
    .where(eq(firmSchema.firmProfile.id, demoAccount.firmId))
    .limit(1)

  if (!demoMember || !demoFirm || demoFirm.plan !== demoAccount.plan) {
    return c.text(DEMO_DATA_MISSING, 409)
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000)
  const sessionId = `mock_demo_session_${crypto.randomUUID().replaceAll('-', '')}`
  const token = `mock_demo_token_${crypto.randomUUID().replaceAll('-', '')}`
  await db.insert(authSchema.session).values({
    id: sessionId,
    token,
    userId: demoAccount.userId,
    activeOrganizationId: demoAccount.firmId,
    twoFactorVerified: true,
    expiresAt,
    createdAt: now,
    updatedAt: now,
    ipAddress: '127.0.0.1',
    userAgent: 'DueDateHQ live demo',
  })

  const signedToken = `${token}.${await makeSignature(token, c.env.AUTH_SECRET)}`
  c.header(
    'Set-Cookie',
    serializeCookie({
      name: COOKIE_NAME,
      value: signedToken,
      path: '/',
      httpOnly: true,
      secure: requestUrl.protocol === 'https:',
      sameSite: 'Lax',
      expires: Math.floor(expiresAt.getTime() / 1000),
    }),
  )
  const redirectTo = requestUrl.searchParams.get('redirectTo')
  return c.redirect(
    redirectTo === null ? c.env.APP_URL || '/' : pickSafeDemoRedirect(redirectTo),
    302,
  )
})

e2eRoute.get('/demo-accounts', async (c) => {
  if (!hasE2ESeedAccess(c)) {
    return c.notFound()
  }

  const db = createDb(c.env.DB)
  const demoFirms = await db
    .select({ id: firmSchema.firmProfile.id })
    .from(firmSchema.firmProfile)
    .where(inArray(firmSchema.firmProfile.id, DEMO_FIRM_IDS))

  const rows = await db
    .select({
      userId: authSchema.user.id,
      name: authSchema.user.name,
      email: authSchema.user.email,
      firmId: authSchema.member.organizationId,
      role: authSchema.member.role,
      plan: firmSchema.firmProfile.plan,
    })
    .from(authSchema.member)
    .innerJoin(authSchema.user, eq(authSchema.user.id, authSchema.member.userId))
    .innerJoin(
      firmSchema.firmProfile,
      eq(firmSchema.firmProfile.id, authSchema.member.organizationId),
    )
    .where(
      and(
        inArray(authSchema.member.organizationId, DEMO_FIRM_IDS),
        eq(authSchema.member.status, 'active'),
        inArray(authSchema.member.userId, DEMO_USER_IDS),
        inArray(authSchema.member.role, DEMO_ROLES),
      ),
    )

  const accounts = orderDemoAccounts(
    rows
      .map((row) => {
        const account = DEMO_ACCOUNTS.find(
          (item) =>
            item.userId === row.userId &&
            item.firmId === row.firmId &&
            item.role === row.role &&
            item.plan === row.plan,
        )
        if (!account || !isDemoRole(row.role)) return null
        return {
          id: account.id,
          userId: row.userId,
          firmId: row.firmId,
          name: row.name,
          email: row.email,
          role: row.role,
          plan: account.plan,
        }
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row)),
  )

  if (demoFirms.length !== DEMO_FIRM_IDS.length || accounts.length !== DEMO_ACCOUNTS.length) {
    return c.text(DEMO_DATA_MISSING, 409)
  }

  return c.json({ accounts })
})

e2eRoute.post('/switch-role', async (c) => {
  if (!hasE2ESeedAccess(c)) {
    return c.notFound()
  }

  const input = await readSwitchRoleRequest(c.req.raw)
  if (!input.firmId || !input.role) {
    return c.json({ error: 'firmId and role are required' }, 400)
  }
  if (!input.firmId.startsWith('e2e_firm_')) {
    return c.json({ error: 'Only E2E firms can be switched by this route.' }, 400)
  }

  const db = createDb(c.env.DB)
  const [member] = await db
    .select({
      userId: authSchema.user.id,
      name: authSchema.user.name,
      email: authSchema.user.email,
      firmId: authSchema.member.organizationId,
    })
    .from(authSchema.member)
    .innerJoin(authSchema.user, eq(authSchema.user.id, authSchema.member.userId))
    .where(
      and(
        eq(authSchema.member.organizationId, input.firmId),
        eq(authSchema.member.role, input.role),
        eq(authSchema.member.status, 'active'),
      ),
    )
    .limit(1)
  const [firm] = await db
    .select({ id: firmSchema.firmProfile.id })
    .from(firmSchema.firmProfile)
    .where(eq(firmSchema.firmProfile.id, input.firmId))
    .limit(1)

  if (!member || !firm) {
    return c.json({ error: 'No active member found for that firm and role.' }, 404)
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000)
  const sessionId = `e2e_switch_session_${crypto.randomUUID().replaceAll('-', '')}`
  const token = `e2e_switch_token_${crypto.randomUUID().replaceAll('-', '')}`
  await db.insert(authSchema.session).values({
    id: sessionId,
    token,
    userId: member.userId,
    activeOrganizationId: input.firmId,
    twoFactorVerified: true,
    expiresAt,
    createdAt: now,
    updatedAt: now,
    ipAddress: '127.0.0.1',
    userAgent: 'Playwright E2E role switch',
  })

  const requestUrl = new URL(c.req.url)
  const signedToken = `${token}.${await makeSignature(token, c.env.AUTH_SECRET)}`
  const cookie = {
    name: COOKIE_NAME,
    value: signedToken,
    domain: requestUrl.hostname,
    path: '/',
    httpOnly: true,
    secure: requestUrl.protocol === 'https:',
    sameSite: 'Lax' as const,
    expires: Math.floor(expiresAt.getTime() / 1000),
  }
  c.header('Set-Cookie', serializeCookie(cookie))
  return c.json({
    user: {
      id: member.userId,
      name: member.name ?? roleLabel(input.role),
      email: member.email,
    },
    firmId: input.firmId,
    role: input.role,
    cookie,
  })
})

e2eRoute.post('/billing/subscription', async (c) => {
  if (!hasE2ESeedAccess(c)) {
    return c.notFound()
  }

  const input = await readBillingRequest(c.req.raw)
  if (!input.firmId) {
    return c.json({ error: 'firmId is required' }, 400)
  }

  const db = createDb(c.env.DB)
  const now = new Date()
  const periodEnd =
    input.interval === 'year'
      ? new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000)
  const seatLimit = billingSeatLimit(input.plan)
  const customerId = `cus_e2e_${input.firmId.replace(/[^a-zA-Z0-9_]/g, '_')}`
  const stripeSubscriptionId = `sub_e2e_${crypto.randomUUID().replaceAll('-', '')}`

  await db
    .update(authSchema.organization)
    .set({ stripeCustomerId: customerId })
    .where(eq(authSchema.organization.id, input.firmId))

  await db
    .update(firmSchema.firmProfile)
    .set({
      plan: input.plan,
      seatLimit,
      billingCustomerId: customerId,
      billingSubscriptionId: stripeSubscriptionId,
      updatedAt: now,
    })
    .where(eq(firmSchema.firmProfile.id, input.firmId))

  const subscription = {
    id: `e2e_subscription_${crypto.randomUUID().replaceAll('-', '')}`,
    plan: input.plan,
    referenceId: input.firmId,
    stripeCustomerId: customerId,
    stripeSubscriptionId,
    status: input.status,
    periodStart: now,
    periodEnd,
    seats: seatLimit,
    billingInterval: input.interval,
    trialStart: null,
    trialEnd: null,
    cancelAtPeriodEnd: false,
    cancelAt: null,
    canceledAt: null,
    endedAt: null,
    stripeScheduleId: null,
    createdAt: now,
    updatedAt: now,
  }
  await db.insert(authSchema.subscription).values(subscription)

  return c.json({
    subscription: {
      ...subscription,
      periodStart: subscription.periodStart.toISOString(),
      periodEnd: subscription.periodEnd.toISOString(),
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
    },
    firm: {
      id: input.firmId,
      plan: input.plan,
      seatLimit,
      billingCustomerId: customerId,
      billingSubscriptionId: stripeSubscriptionId,
    },
  })
})

async function readSeedRequest(request: Request): Promise<E2ESeedRequest> {
  try {
    const raw = await request.json()
    if (!raw || typeof raw !== 'object') return {}
    const seed = (raw as { seed?: unknown }).seed
    const role = (raw as { role?: unknown }).role
    const testId = (raw as { testId?: unknown }).testId
    return {
      seed: isSeedMode(seed) ? seed : 'empty',
      role: isDemoRole(role) ? role : 'owner',
      ...(typeof testId === 'string' ? { testId } : {}),
    }
  } catch {
    return {}
  }
}

async function readSwitchRoleRequest(request: Request): Promise<E2ESwitchRoleRequest> {
  try {
    const raw: unknown = await request.json()
    if (!raw || typeof raw !== 'object') return { firmId: null, role: null }
    const input = raw as { firmId?: unknown; role?: unknown }
    return {
      firmId: typeof input.firmId === 'string' ? input.firmId : null,
      role: isDemoRole(input.role) ? input.role : null,
    }
  } catch {
    return { firmId: null, role: null }
  }
}

async function readBillingRequest(request: Request): Promise<{
  firmId: string | null
  plan: BillingPlan
  status: BillingStatus
  interval: BillingInterval
}> {
  try {
    const raw: unknown = await request.json()
    if (!raw || typeof raw !== 'object') {
      return { firmId: null, plan: 'pro', status: 'active', interval: 'month' }
    }
    const input = raw as {
      firmId?: unknown
      plan?: unknown
      status?: unknown
      interval?: unknown
    }
    return {
      firmId: typeof input.firmId === 'string' ? input.firmId : null,
      plan: isBillingPlan(input.plan) ? input.plan : 'pro',
      status: isBillingStatus(input.status) ? input.status : 'active',
      interval: input.interval === 'year' ? 'year' : 'month',
    }
  } catch {
    return { firmId: null, plan: 'pro', status: 'active', interval: 'month' }
  }
}

function isBillingStatus(value: unknown): value is BillingStatus {
  return value === 'active' || value === 'trialing' || value === 'past_due' || value === 'paused'
}

function isBillingPlan(value: unknown): value is BillingPlan {
  return value === 'solo' || value === 'pro' || value === 'team' || value === 'firm'
}

function billingSeatLimit(plan: BillingPlan): number {
  if (plan === 'solo') return 1
  if (plan === 'pro') return 3
  return 10
}

function buildStableSuffix(value: string | undefined): string {
  const titleSlug = (value ?? 'session')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 44)
  const randomSlug = crypto.randomUUID().replaceAll('-', '').slice(0, 16)
  return `${titleSlug || 'session'}_${randomSlug}`
}

async function seedObligationQueue(db: ReturnType<typeof createDb>, firmId: string) {
  const repo = scoped(db, firmId)
  const workloadAsOfDate = dateOnlyToUtcDate('2026-04-30')
  const arbor = {
    id: crypto.randomUUID(),
    name: 'Arbor & Vale LLC',
    ein: '12-3456789',
    state: 'CA',
    county: 'Los Angeles',
    entityType: 'llc' as const,
    assigneeName: 'M. Chen',
    importanceWeight: 3,
    equityOwnerCount: 2,
  }
  const northstar = {
    id: crypto.randomUUID(),
    name: 'Northstar Dental Group',
    ein: '98-7654321',
    state: 'NY',
    county: 'Queens',
    entityType: 's_corp' as const,
    assigneeName: 'A. Rivera',
  }
  const copperline = {
    id: crypto.randomUUID(),
    name: 'Copperline Studios',
    ein: '45-1111111',
    state: 'TX',
    county: 'Travis',
    entityType: 'c_corp' as const,
    assigneeName: 'K. Patel',
    lateFilingCountLast12mo: 2,
  }
  const foundry = {
    id: crypto.randomUUID(),
    name: 'Unassigned Foundry LLC',
    ein: '37-2222222',
    state: 'CA',
    county: 'San Diego',
    entityType: 'llc' as const,
    assigneeName: null,
  }
  const clients = [arbor, northstar, copperline, foundry]

  await repo.clients.createBatch(clients)
  const arborDueDate = new Date('2026-03-15T00:00:00.000Z')
  const northstarDueDate = new Date('2026-03-18T00:00:00.000Z')
  const copperlineDueDate = new Date('2026-04-02T00:00:00.000Z')
  await repo.obligations.createBatch([
    {
      id: crypto.randomUUID(),
      clientId: arbor.id,
      taxType: 'federal_1065',
      taxYear: 2026,
      baseDueDate: arborDueDate,
      currentDueDate: demoInternalDeadline(arborDueDate),
      status: 'pending',
      migrationBatchId: null,
    },
    {
      id: crypto.randomUUID(),
      clientId: northstar.id,
      taxType: 'ny_ct3s',
      taxYear: 2026,
      baseDueDate: northstarDueDate,
      currentDueDate: demoInternalDeadline(northstarDueDate),
      status: 'review',
      migrationBatchId: null,
    },
    {
      id: crypto.randomUUID(),
      clientId: copperline.id,
      taxType: 'tx_franchise_report',
      taxYear: 2026,
      baseDueDate: copperlineDueDate,
      currentDueDate: demoInternalDeadline(copperlineDueDate),
      status: 'waiting_on_client',
      migrationBatchId: null,
    },
    {
      id: crypto.randomUUID(),
      clientId: foundry.id,
      taxType: 'ca_568',
      taxYear: 2026,
      baseDueDate: workloadAsOfDate,
      currentDueDate: demoInternalDeadline(workloadAsOfDate),
      status: 'pending',
      migrationBatchId: null,
    },
  ])

  return {
    obligationQueueRows: [
      { clientName: arbor.name, status: 'pending' },
      { clientName: northstar.name, status: 'review' },
      { clientName: copperline.name, status: 'waiting_on_client' },
      { clientName: foundry.name, status: 'pending' },
    ],
  }
}

async function seedPulse(db: ReturnType<typeof createDb>, firmId: string, userId: string) {
  const repo = scoped(db, firmId)
  const originalDueDate = new Date('2026-03-15T00:00:00.000Z')
  const northstarDueDate = new Date('2026-03-18T00:00:00.000Z')
  const newDueDate = new Date('2026-10-15T00:00:00.000Z')
  const publishedAt = new Date('2026-04-15T17:00:00.000Z')
  const reviewedAt = new Date('2026-04-15T18:00:00.000Z')
  const arbor = {
    id: crypto.randomUUID(),
    name: 'Arbor & Vale LLC',
    ein: '12-3456789',
    state: 'CA',
    county: 'Los Angeles',
    entityType: 'llc' as const,
    assigneeName: 'M. Chen',
  }
  const bright = {
    id: crypto.randomUUID(),
    name: 'Bright Studio S-Corp',
    ein: '21-2222222',
    state: 'CA',
    county: null,
    entityType: 's_corp' as const,
    assigneeName: 'A. Rivera',
  }
  const northstar = {
    id: crypto.randomUUID(),
    name: 'Northstar Dental Group',
    ein: '98-7654321',
    state: 'NY',
    county: 'Queens',
    entityType: 's_corp' as const,
    assigneeName: 'A. Rivera',
  }

  await repo.clients.createBatch([arbor, bright, northstar])
  await repo.obligations.createBatch([
    {
      id: crypto.randomUUID(),
      clientId: arbor.id,
      taxType: 'federal_1065',
      taxYear: 2026,
      jurisdiction: 'CA',
      baseDueDate: originalDueDate,
      currentDueDate: originalDueDate,
      status: 'pending',
      migrationBatchId: null,
    },
    {
      id: crypto.randomUUID(),
      clientId: bright.id,
      taxType: 'federal_1120s',
      taxYear: 2026,
      jurisdiction: 'CA',
      baseDueDate: originalDueDate,
      currentDueDate: originalDueDate,
      status: 'review',
      migrationBatchId: null,
    },
    {
      id: crypto.randomUUID(),
      clientId: northstar.id,
      taxType: 'ny_ct3s',
      taxYear: 2026,
      baseDueDate: northstarDueDate,
      currentDueDate: demoInternalDeadline(northstarDueDate),
      status: 'pending',
      migrationBatchId: null,
    },
  ])

  const seededPulses = await Promise.all([
    repo.pulse.createSeedAlert({
      source: 'IRS Disaster Relief',
      sourceUrl: 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations',
      rawR2Key: 'demo/pulse/irs-ca-storm-relief.html',
      publishedAt,
      aiSummary: 'IRS CA storm relief extends selected filing deadlines for Los Angeles County.',
      verbatimQuote:
        'Individuals and businesses in Los Angeles County have until October 15, 2026 to file various federal returns.',
      parsedJurisdiction: 'CA',
      parsedCounties: ['Los Angeles'],
      parsedForms: ['federal_1065', 'federal_1120s'],
      parsedEntityTypes: ['llc', 's_corp'],
      parsedOriginalDueDate: originalDueDate,
      parsedNewDueDate: newDueDate,
      parsedEffectiveFrom: publishedAt,
      confidence: 0.94,
      reviewedBy: userId,
      reviewedAt,
      requiresHumanReview: true,
      isSample: true,
    }),
    repo.pulse.createSeedAlert({
      source: 'CA FTB',
      sourceUrl: 'https://www.ftb.ca.gov/help/disaster-relief.html',
      rawR2Key: 'demo/pulse/ca-ftb-confidence-info.html',
      publishedAt: new Date('2026-04-14T17:00:00.000Z'),
      aiSummary: 'CA FTB storm notice has medium-confidence extraction for review.',
      verbatimQuote:
        'Taxpayers affected by severe storms may qualify for postponement relief for selected California filings.',
      parsedJurisdiction: 'CA',
      parsedCounties: ['Alameda'],
      parsedForms: ['ca_100s'],
      parsedEntityTypes: ['s_corp'],
      parsedOriginalDueDate: new Date('2026-04-15T00:00:00.000Z'),
      parsedNewDueDate: new Date('2026-06-15T00:00:00.000Z'),
      parsedEffectiveFrom: new Date('2026-04-14T17:00:00.000Z'),
      confidence: 0.82,
      reviewedBy: userId,
      reviewedAt,
      requiresHumanReview: true,
      isSample: true,
    }),
    repo.pulse.createSeedAlert({
      source: 'NY DTF',
      sourceUrl: 'https://www.tax.ny.gov/pit/file/extension_of_time_to_file.htm',
      rawR2Key: 'demo/pulse/ny-dtf-confidence-warning.html',
      publishedAt: new Date('2026-04-13T17:00:00.000Z'),
      aiSummary: 'NY DTF notice has low-confidence extraction and needs practice review.',
      verbatimQuote:
        'Some due dates and filing obligations may vary by taxpayer circumstance and form type.',
      parsedJurisdiction: 'NY',
      parsedCounties: ['Queens'],
      parsedForms: ['ny_it204'],
      parsedEntityTypes: ['partnership'],
      parsedOriginalDueDate: new Date('2026-04-15T00:00:00.000Z'),
      parsedNewDueDate: new Date('2026-06-15T00:00:00.000Z'),
      parsedEffectiveFrom: null,
      confidence: 0.58,
      reviewedBy: userId,
      reviewedAt,
      requiresHumanReview: true,
      isSample: true,
    }),
    repo.pulse.createSeedAlert({
      source: 'FL DOR',
      sourceUrl: 'https://floridarevenue.com/taxes/taxesfees/Pages/corporate.aspx',
      rawR2Key: 'demo/pulse/fl-dor-confidence-sub-50.html',
      publishedAt: new Date('2026-04-12T17:00:00.000Z'),
      aiSummary: 'FL DOR bulletin has very-low-confidence extraction for practice review.',
      verbatimQuote:
        'Corporate income tax filing dates may depend on entity status, fiscal year, and extension election.',
      parsedJurisdiction: 'FL',
      parsedCounties: [],
      parsedForms: ['fl_corp_income'],
      parsedEntityTypes: ['c_corp'],
      parsedOriginalDueDate: new Date('2026-05-12T00:00:00.000Z'),
      parsedNewDueDate: new Date('2026-06-01T00:00:00.000Z'),
      parsedEffectiveFrom: null,
      confidence: 0.46,
      reviewedBy: userId,
      reviewedAt,
      requiresHumanReview: true,
      isSample: true,
    }),
  ])

  return {
    obligationQueueRows: [
      { clientName: arbor.name, status: 'pending' },
      { clientName: bright.name, status: 'review' },
      { clientName: northstar.name, status: 'pending' },
    ],
    pulseAlerts: seededPulses.map((pulseSeed) => ({
      alertId: pulseSeed.alertId,
      pulseId: pulseSeed.pulseId,
    })),
  }
}

/**
 * Seeds the firm with a second managed (non-owner) member so the
 * owner has someone to remove / suspend / downgrade.
 *
 * Surfaces the seeded member's email back to the test fixture via
 * `seeded.teamMember` so specs can target the row without hard-coding.
 */
async function seedTeamMember(
  db: ReturnType<typeof createDb>,
  firmId: string,
  suffix: string,
  now: Date,
) {
  const memberUserId = `e2e_team_member_${suffix}`
  const memberName = 'E2E Teammate'
  const memberEmail = `teammate-${suffix}@e2e.duedatehq.test`
  await db.insert(authSchema.user).values({
    id: memberUserId,
    name: memberName,
    email: memberEmail,
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(authSchema.member).values({
    id: `e2e_team_member_row_${suffix}`,
    organizationId: firmId,
    userId: memberUserId,
    role: 'preparer',
    createdAt: now,
    status: 'active',
  })
  return {
    obligationQueueRows: [],
    teamMember: {
      userId: memberUserId,
      name: memberName,
      email: memberEmail,
      role: 'preparer' as const,
    },
  }
}

/**
 * Seeds a single client with ≥2 obligations so the filing-plan
 * bulk-move dialog ("Move N deadlines to {status}?") is reachable.
 *
 * Surfaces the seeded client id+name back to the test fixture via
 * `seeded.filingPlanClient` so the test can navigate to
 * `/clients/{id}` directly.
 */
async function seedFilingPlan(db: ReturnType<typeof createDb>, firmId: string) {
  const repo = scoped(db, firmId)
  const client = {
    id: crypto.randomUUID(),
    name: 'Lakeview Manufacturing',
    ein: '55-1234567',
    state: 'NY',
    county: 'Erie',
    entityType: 'c_corp' as const,
    assigneeName: 'M. Chen',
    importanceWeight: 2,
  }
  await repo.clients.createBatch([client])
  const federalDueDate = new Date('2026-03-15T00:00:00.000Z')
  const stateDueDate = new Date('2026-04-15T00:00:00.000Z')
  const quarterlyDueDate = new Date('2026-07-31T00:00:00.000Z')
  await repo.obligations.createBatch([
    {
      id: crypto.randomUUID(),
      clientId: client.id,
      taxType: 'federal_1120',
      taxYear: 2026,
      baseDueDate: federalDueDate,
      currentDueDate: demoInternalDeadline(federalDueDate),
      status: 'pending',
      migrationBatchId: null,
    },
    {
      id: crypto.randomUUID(),
      clientId: client.id,
      taxType: 'ny_ct3',
      taxYear: 2026,
      baseDueDate: stateDueDate,
      currentDueDate: demoInternalDeadline(stateDueDate),
      status: 'pending',
      migrationBatchId: null,
    },
    {
      id: crypto.randomUUID(),
      clientId: client.id,
      taxType: 'federal_1120_estimated_tax',
      taxYear: 2026,
      baseDueDate: quarterlyDueDate,
      currentDueDate: demoInternalDeadline(quarterlyDueDate),
      status: 'pending',
      migrationBatchId: null,
    },
  ])
  return {
    obligationQueueRows: [],
    filingPlanClient: {
      id: client.id,
      name: client.name,
    },
  }
}

function serializeCookie(cookie: {
  name: string
  value: string
  path: string
  httpOnly: boolean
  secure: boolean
  sameSite: 'Lax'
  expires: number
}) {
  const parts = [
    `${cookie.name}=${cookie.value}`,
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    `Expires=${new Date(cookie.expires * 1000).toUTCString()}`,
    `Path=${cookie.path}`,
    `SameSite=${cookie.sameSite}`,
  ]
  if (cookie.httpOnly) parts.push('HttpOnly')
  if (cookie.secure) parts.push('Secure')
  return parts.join('; ')
}
