import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorCodes } from '@duedatehq/contracts/errors'
import type { ContextVars, Env } from '../env'
import { hashAuditValue } from '../lib/audit-request-metadata'
import { tenantMiddleware } from './tenant'

type TenantTestEnv = Pick<Env, 'AUTH_SECRET' | 'DB'>

const testD1: D1Database = {
  prepare(_query) {
    throw new Error('test D1 prepare not implemented')
  },
  batch: async <T = unknown>(_statements: D1PreparedStatement[]): Promise<D1Result<T>[]> => [],
  exec: async (_query) => ({ count: 0, duration: 0 }),
  withSession(_constraintOrBookmark) {
    throw new Error('test D1 session not implemented')
  },
  dump: async () => new ArrayBuffer(0),
}

const testEnv: TenantTestEnv = {
  AUTH_SECRET: 'test-secret-test-secret-test-secret-123',
  DB: testD1,
}

/**
 * Drizzle's chained query builder is mocked at the leaf-call boundary.
 * The middleware does these chains in order on a fresh `select()`:
 *   1. SELECT member.status FROM member WHERE ... LIMIT 1
 *   2. SELECT * FROM firm_profile WHERE id=? LIMIT 1
 * On the lazy-create branch it adds two more before re-reading firm_profile:
 *   3. SELECT id, name FROM organization WHERE id=? LIMIT 1
 *   4. SELECT userId FROM member WHERE role='owner' ORDER BY createdAt LIMIT 1
 *
 * `enqueueLimit(...)` arms one `.limit()` resolution per chain in FIFO order.
 */
const dbMocks = vi.hoisted(() => {
  const limitQueue: Array<unknown[]> = []
  const limit = vi.fn(async () => {
    const next = limitQueue.shift()
    return next ?? []
  })
  const orderBy = vi.fn(() => ({ limit }))
  const where = vi.fn(() => ({ limit, orderBy }))
  const from = vi.fn(() => ({ where }))
  const select = vi.fn(() => ({ from }))
  const onConflictDoNothing = vi.fn(async () => undefined)
  const values = vi.fn(() => ({ onConflictDoNothing }))
  const insert = vi.fn(() => ({ values }))
  const fakeDb = { select, insert }
  const createDb = vi.fn(() => fakeDb)
  const auditWrite = vi.fn(async () => ({ id: 'audit_1' }))
  const auditWriteBatch = vi.fn(async (events: unknown[]) => ({
    ids: events.map((_, index) => `audit_${index + 1}`),
  }))
  const scoped = vi.fn((_db, firmId: string) => ({
    firmId,
    audit: {
      firmId,
      write: auditWrite,
      writeBatch: auditWriteBatch,
    },
  }))

  return {
    createDb,
    limit,
    orderBy,
    select,
    insert,
    values,
    onConflictDoNothing,
    scoped,
    auditWrite,
    auditWriteBatch,
    enqueueLimit(...rows: Array<unknown[]>) {
      limitQueue.push(...rows)
    },
    resetQueue() {
      limitQueue.length = 0
    },
  }
})

vi.mock('@duedatehq/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duedatehq/db')>()

  return {
    ...actual,
    createDb: dbMocks.createDb,
    scoped: dbMocks.scoped,
  }
})

function createTestApp(vars: Pick<ContextVars, 'firmId' | 'userId'> = {}) {
  const app = new Hono<{ Bindings: TenantTestEnv; Variables: ContextVars }>()

  app.use('/rpc/*', async (c, next) => {
    if (vars.firmId) {
      c.set('firmId', vars.firmId)
    }
    if (vars.userId) {
      c.set('userId', vars.userId)
    }
    await next()
  })
  app.use('/rpc/*', tenantMiddleware)
  app.get('/rpc/test', (c) => {
    const tenant = c.get('tenantContext')
    return c.json({
      scopedFirmId: c.get('scoped')?.firmId,
      tenant,
    })
  })
  app.get('/rpc/write-audit', async (c) => {
    const scoped = c.get('scoped')
    const result = await scoped?.audit.write({
      actorId: 'user_123',
      entityType: 'rule',
      entityId: 'rule_123',
      action: 'rule.accepted',
    })
    return c.json(result)
  })

  return app
}

const activeProfile = {
  id: 'firm_123',
  name: 'Bright CPA Practice',
  plan: 'solo',
  seatLimit: 1,
  timezone: 'America/New_York',
  internalDeadlineOffsetDays: 14,
  monitoringStartDate: '2026-05-29',
  ownerUserId: 'user_owner',
  status: 'active',
  createdAt: new Date(0),
  updatedAt: new Date(0),
  deletedAt: null,
}

describe('tenantMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbMocks.resetQueue()
  })

  it('rejects RPC requests without an active firm', async () => {
    const response = await createTestApp({ userId: 'user_123' }).request('/rpc/test', {}, testEnv)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: ErrorCodes.TENANT_MISSING })
    expect(dbMocks.createDb).not.toHaveBeenCalled()
  })

  it('rejects RPC requests without an authenticated user id', async () => {
    const response = await createTestApp({ firmId: 'firm_123' }).request('/rpc/test', {}, testEnv)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'UNAUTHORIZED' })
    expect(dbMocks.createDb).not.toHaveBeenCalled()
  })

  it('rejects RPC requests when the active firm is not a user membership', async () => {
    dbMocks.enqueueLimit([])

    const response = await createTestApp({ firmId: 'firm_123', userId: 'user_123' }).request(
      '/rpc/test',
      {},
      testEnv,
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: ErrorCodes.TENANT_MISMATCH })
    expect(dbMocks.scoped).not.toHaveBeenCalled()
  })

  it('rejects RPC requests for inactive firm memberships', async () => {
    dbMocks.enqueueLimit([{ status: 'suspended' }])

    const response = await createTestApp({ firmId: 'firm_123', userId: 'user_123' }).request(
      '/rpc/test',
      {},
      testEnv,
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'FORBIDDEN' })
    expect(dbMocks.scoped).not.toHaveBeenCalled()
  })

  it('rejects RPC requests when firm_profile is suspended (TENANT_SUSPENDED)', async () => {
    // (1) member status=active, (2) firm_profile.status='suspended'
    dbMocks.enqueueLimit([{ status: 'active' }], [{ ...activeProfile, status: 'suspended' }])

    const response = await createTestApp({ firmId: 'firm_123', userId: 'user_123' }).request(
      '/rpc/test',
      {},
      testEnv,
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: ErrorCodes.TENANT_SUSPENDED })
    expect(dbMocks.scoped).not.toHaveBeenCalled()
  })

  it('injects scoped + tenantContext for active firm memberships', async () => {
    // (1) member.status='active', (2) firm_profile row found
    dbMocks.enqueueLimit([{ status: 'active' }], [activeProfile])

    const response = await createTestApp({ firmId: 'firm_123', userId: 'user_123' }).request(
      '/rpc/test',
      {},
      testEnv,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      scopedFirmId: 'firm_123',
      tenant: {
        firmId: 'firm_123',
        plan: 'solo',
        seatLimit: 1,
        timezone: 'America/New_York',
        internalDeadlineOffsetDays: 14,
        isReadOnlyDemo: false,
        monitoringStartDate: '2026-05-29',
        status: 'active',
        ownerUserId: 'user_owner',
        createdAt: '1970-01-01T00:00:00.000Z',
      },
    })
    expect(dbMocks.scoped).toHaveBeenCalledWith(expect.anything(), 'firm_123')
    expect(dbMocks.insert).not.toHaveBeenCalled()
  })

  it('injects hashed request metadata into scoped audit writes', async () => {
    dbMocks.enqueueLimit([{ status: 'active' }], [activeProfile])

    const response = await createTestApp({ firmId: 'firm_123', userId: 'user_123' }).request(
      '/rpc/write-audit',
      {
        headers: {
          'x-forwarded-for': '198.51.100.5, 198.51.100.99',
          'user-agent': 'DueDateHQ Test Browser',
        },
      },
      testEnv,
    )

    expect(response.status).toBe(200)
    expect(dbMocks.auditWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        ipHash: await hashAuditValue(testEnv.AUTH_SECRET, '198.51.100.5'),
        userAgentHash: await hashAuditValue(testEnv.AUTH_SECRET, 'DueDateHQ Test Browser'),
      }),
    )
  })

  it('lazy-creates firm_profile when missing, deriving owner from earliest owner member', async () => {
    // (1) member.status='active'
    // (2) firm_profile missing (empty result)
    // (3) organization row found
    // (4) earliest owner member: user_first_owner
    // (5) re-read firm_profile after insert → returns active row
    dbMocks.enqueueLimit(
      [{ status: 'active' }],
      [],
      [{ id: 'firm_123', name: 'Bright CPA Practice' }],
      [{ userId: 'user_first_owner' }],
      [{ ...activeProfile, ownerUserId: 'user_first_owner' }],
    )

    const response = await createTestApp({
      firmId: 'firm_123',
      // Requesting user is NOT the owner — proves we don't fall back to it.
      userId: 'user_some_other_member',
    }).request('/rpc/test', {}, testEnv)

    expect(response.status).toBe(200)
    expect(dbMocks.insert).toHaveBeenCalledTimes(1)
    expect(dbMocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'firm_123',
        name: 'Bright CPA Practice',
        plan: 'solo',
        seatLimit: 1,
        timezone: 'America/New_York',
        internalDeadlineOffsetDays: 14,
        ownerUserId: 'user_first_owner',
        status: 'active',
      }),
    )
    expect(await response.json()).toMatchObject({
      tenant: { ownerUserId: 'user_first_owner' },
    })
  })

  it('lazy-creates firm_profile and falls back to current user when no owner member exists', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      // (1) member.status='active', (2) firm_profile missing,
      // (3) organization row, (4) NO owner member, (5) re-read profile
      dbMocks.enqueueLimit(
        [{ status: 'active' }],
        [],
        [{ id: 'firm_123', name: 'Bright CPA Practice' }],
        [],
        [{ ...activeProfile, ownerUserId: 'user_fallback' }],
      )

      const response = await createTestApp({
        firmId: 'firm_123',
        userId: 'user_fallback',
      }).request('/rpc/test', {}, testEnv)

      expect(response.status).toBe(200)
      expect(dbMocks.values).toHaveBeenCalledWith(
        expect.objectContaining({ ownerUserId: 'user_fallback' }),
      )
      expect(warn).toHaveBeenCalledWith(
        '[tenant] lazy_create_no_owner_member',
        expect.objectContaining({ firmId: 'firm_123', fallbackUserId: 'user_fallback' }),
      )
    } finally {
      warn.mockRestore()
    }
  })

  it('lazy-create insert goes through onConflictDoNothing for concurrency safety', async () => {
    // Two parallel first-RPC fan-outs both observe an empty firm_profile and
    // both reach the insert. The mock can't run them truly in parallel, but
    // we can confirm the insert path uses ON CONFLICT DO NOTHING (and the
    // values are correct), which is the SQL-level safeguard against the
    // PK race the code review caught.
    dbMocks.enqueueLimit(
      [{ status: 'active' }],
      [],
      [{ id: 'firm_123', name: 'Bright CPA Practice' }],
      [{ userId: 'user_first_owner' }],
      [{ ...activeProfile, ownerUserId: 'user_first_owner' }],
    )

    const response = await createTestApp({
      firmId: 'firm_123',
      userId: 'user_first_owner',
    }).request('/rpc/test', {}, testEnv)

    expect(response.status).toBe(200)
    expect(dbMocks.onConflictDoNothing).toHaveBeenCalledTimes(1)
  })

  it('returns TENANT_MISSING when activeOrganizationId points at a deleted org', async () => {
    // (1) Membership active (stale row),
    // (2) firm_profile missing,
    // (3) organization not found
    dbMocks.enqueueLimit([{ status: 'active' }], [], [])

    const response = await createTestApp({ firmId: 'firm_gone', userId: 'user_123' }).request(
      '/rpc/test',
      {},
      testEnv,
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: ErrorCodes.TENANT_MISSING })
    expect(dbMocks.insert).not.toHaveBeenCalled()
  })
})
