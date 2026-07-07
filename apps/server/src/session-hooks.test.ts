/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Test stubs fake the drizzle chain with minimal shapes. Building the real
 * Db type would require the whole drizzle schema bundle — the factory only
 * touches db.select / from / innerJoin / where / orderBy / limit.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Db } from '@duedatehq/db'
import { buildDatabaseHooks } from './session-hooks'

function makeFakeDb(input: {
  userRows?: Array<{ twoFactorEnabled: boolean }>
  membershipRows?: Array<{ organizationId: string }>
}): {
  db: Db
  limitSpy: ReturnType<typeof vi.fn>
  innerJoinSpy: ReturnType<typeof vi.fn>
} {
  const rows = [input.userRows ?? [{ twoFactorEnabled: false }], input.membershipRows ?? []]
  const limitSpy = vi.fn(async () => rows.shift() ?? [])
  const orderBy = vi.fn(() => ({ limit: limitSpy }))
  const where = vi.fn(() => ({ limit: limitSpy, orderBy }))
  const innerJoinSpy = vi.fn(() => ({ where }))
  const from = vi.fn(() => ({ innerJoin: innerJoinSpy, where }))
  const select = vi.fn(() => ({ from }))
  const db = { select } as unknown as Db
  return { db, limitSpy, innerJoinSpy }
}

function baseSession(userId: string | undefined) {
  return {
    id: 'sess_x',
    userId: userId as string,
    expiresAt: new Date(),
    token: 'tok',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

describe('buildDatabaseHooks.session.create.before', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sets activeOrganizationId from the earliest active membership when the user has one', async () => {
    const { db, limitSpy, innerJoinSpy } = makeFakeDb({
      membershipRows: [{ organizationId: 'firm_early' }],
    })
    const hooks = buildDatabaseHooks(db, 'secret')
    const before = hooks.session?.create?.before
    expect(before).toBeDefined()

    const result = await before!(baseSession('user_1'), null)

    expect(limitSpy).toHaveBeenCalledTimes(2)
    expect(innerJoinSpy).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      data: {
        activeOrganizationId: 'firm_early',
        twoFactorVerified: true,
        userId: 'user_1',
      },
    })
  })

  it('relies on the firm_profile active join before choosing a returning firm', async () => {
    const { db, innerJoinSpy } = makeFakeDb({
      membershipRows: [{ organizationId: 'firm_active_second' }],
    })
    const hooks = buildDatabaseHooks(db, 'secret')

    const result = await hooks.session!.create!.before!(baseSession('user_1'), null)

    expect(innerJoinSpy).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      data: { activeOrganizationId: 'firm_active_second', userId: 'user_1' },
    })
  })

  it('still stamps MFA state when the user has no active memberships yet', async () => {
    const { db, limitSpy } = makeFakeDb({ membershipRows: [] })
    const hooks = buildDatabaseHooks(db, 'secret')
    const result = await hooks.session!.create!.before!(baseSession('user_new'), null)

    expect(limitSpy).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({
      data: { twoFactorVerified: true, userId: 'user_new' },
    })
  })

  it('requires MFA verification for new sessions when the user has 2FA enabled', async () => {
    const { db } = makeFakeDb({
      userRows: [{ twoFactorEnabled: true }],
      membershipRows: [{ organizationId: 'firm_1' }],
    })
    const hooks = buildDatabaseHooks(db, 'secret')
    const result = await hooks.session!.create!.before!(baseSession('user_1'), null)

    expect(result).toMatchObject({
      data: { activeOrganizationId: 'firm_1', twoFactorVerified: false, userId: 'user_1' },
    })
  })

  it('returns undefined without hitting the db when userId is missing', async () => {
    const { db, limitSpy } = makeFakeDb({})
    const hooks = buildDatabaseHooks(db, 'secret')
    const result = await hooks.session!.create!.before!(baseSession(undefined), null)

    expect(limitSpy).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })
})
