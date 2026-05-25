import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContextVars, Env } from '../env'
import { sessionMiddleware } from './session'

const authMocks = vi.hoisted(() => {
  const getSession = vi.fn()
  const createWorkerAuth = vi.fn(() => ({ api: { getSession } }))

  return { createWorkerAuth, getSession }
})

const dbMocks = vi.hoisted(() => {
  const createDb = vi.fn()
  return { createDb }
})

vi.mock('../auth', () => ({
  createWorkerAuth: authMocks.createWorkerAuth,
}))

vi.mock('@duedatehq/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duedatehq/db')>()
  return {
    ...actual,
    createDb: dbMocks.createDb,
  }
})

function makeDb(rows: Array<Array<{ id: string }>>) {
  const queuedRows = [...rows]
  const limit = vi.fn(async () => queuedRows.shift() ?? [])
  const orderBy = vi.fn(() => ({ limit }))
  const where = vi.fn(() => ({ limit, orderBy }))
  const innerJoin = vi.fn(() => ({ where }))
  const from = vi.fn(() => ({ innerJoin }))
  const select = vi.fn(() => ({ from }))
  const updateWhere = vi.fn()
  const set = vi.fn(() => ({ where: updateWhere }))
  const update = vi.fn(() => ({ set }))

  return {
    db: { select, update },
    limit,
    set,
    update,
    updateWhere,
  }
}

function createTestApp() {
  const app = new Hono<{ Bindings: Env; Variables: ContextVars }>()

  app.use('/rpc/*', sessionMiddleware)
  app.get('/rpc/test', (c) =>
    c.json({
      firmId: c.get('firmId'),
      hasSession: Boolean(c.get('session')),
      userEmail: c.get('user')?.email,
      userId: c.get('userId'),
    }),
  )

  return app
}

describe('sessionMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbMocks.createDb.mockReturnValue(makeDb([[{ id: 'firm_123' }]]).db)
  })

  it('rejects RPC requests without a Better Auth session', async () => {
    authMocks.getSession.mockResolvedValueOnce(null)

    const response = await createTestApp().request('/rpc/test', {}, { DB: {} })

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'UNAUTHORIZED' })
    expect(authMocks.getSession).toHaveBeenCalledWith({ headers: expect.any(Headers) })
  })

  it('injects session, user, userId, and active organization firmId', async () => {
    authMocks.getSession.mockResolvedValueOnce({
      session: {
        activeOrganizationId: 'firm_123',
        id: 'session_123',
      },
      user: {
        email: 'owner@example.com',
        id: 'user_123',
        name: 'Owner',
      },
    })

    const response = await createTestApp().request('/rpc/test', {}, { DB: {} })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      firmId: 'firm_123',
      hasSession: true,
      userEmail: 'owner@example.com',
      userId: 'user_123',
    })
  })

  it('repairs a stale active organization when the session points at a deleted firm', async () => {
    const fake = makeDb([[], [{ id: 'firm_active' }]])
    dbMocks.createDb.mockReturnValueOnce(fake.db)
    authMocks.getSession.mockResolvedValueOnce({
      session: {
        activeOrganizationId: 'firm_deleted',
        id: 'session_123',
      },
      user: {
        email: 'owner@example.com',
        id: 'user_123',
        name: 'Owner',
      },
    })

    const response = await createTestApp().request('/rpc/test', {}, { DB: {} })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      firmId: 'firm_active',
      hasSession: true,
      userId: 'user_123',
    })
    expect(fake.update).toHaveBeenCalledTimes(1)
    expect(fake.set).toHaveBeenCalledWith(
      expect.objectContaining({ activeOrganizationId: 'firm_active' }),
    )
  })
})
