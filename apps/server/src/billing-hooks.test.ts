/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Test doubles model the exact drizzle chain this hook factory uses.
 */
import { describe, expect, it, vi } from 'vitest'
import type { Db } from '@duedatehq/db'
import { buildBillingHooks, seatOverflowMemberIds } from './billing-hooks'

function makeAuthzDb(rows: Array<{ role: string; status: string }>) {
  const limit = vi.fn(async () => rows)
  const where = vi.fn(() => ({ limit }))
  const from = vi.fn(() => ({ where }))
  const select = vi.fn(() => ({ from }))
  return { db: { select } as unknown as Db, limit }
}

function makeUpdateDb() {
  const updateWhere = vi.fn(async () => undefined)
  const set = vi.fn(() => ({ where: updateWhere }))
  const update = vi.fn(() => ({ set }))
  const selectResults = [
    [] as Array<{ id: string; role: string; createdAt: Date }>,
    [] as Array<{ id: string }>,
  ]
  const orderBy = vi.fn(async () => selectResults.shift() ?? [])
  const selectWhere = vi.fn(() => ({ orderBy }))
  const from = vi.fn(() => ({ where: selectWhere }))
  const select = vi.fn(() => ({ from }))
  return { db: { update, select } as unknown as Db, set, updateWhere }
}

function makeOverLimitUpdateDb() {
  const updateWhere = vi.fn(async () => undefined)
  const set = vi.fn(() => ({ where: updateWhere }))
  const update = vi.fn(() => ({ set }))
  const selectResults = [
    [
      { id: 'member_owner', role: 'owner', createdAt: new Date('2026-01-01T00:00:00.000Z') },
      { id: 'member_manager', role: 'manager', createdAt: new Date('2026-01-02T00:00:00.000Z') },
      { id: 'member_preparer', role: 'preparer', createdAt: new Date('2026-01-03T00:00:00.000Z') },
    ],
    [{ id: 'invitation_1' }, { id: 'invitation_2' }],
  ]
  const orderBy = vi.fn(async () => selectResults.shift() ?? [])
  const selectWhere = vi.fn(() => ({ orderBy }))
  const from = vi.fn(() => ({ where: selectWhere }))
  const select = vi.fn(() => ({ from }))
  return { db: { update, select } as unknown as Db, set, updateWhere }
}

describe('buildBillingHooks', () => {
  it('lets owners list subscriptions', async () => {
    const { db } = makeAuthzDb([{ role: 'owner', status: 'active' }])
    const hooks = buildBillingHooks(db)

    await expect(
      hooks.authorizeReference({
        userId: 'user_1',
        sessionId: 'session_1',
        activeOrganizationId: 'firm_1',
        referenceId: 'firm_1',
        action: 'list-subscription' as never,
      }),
    ).resolves.toBe(true)
  })

  // billing.read returned to owner-only (2026-06-11): manager used to pass
  // this gate while partner did not, breaking Owner > Partner >= Manager.
  it('rejects every non-owner billing read', async () => {
    const input = {
      userId: 'user_1',
      sessionId: 'session_1',
      activeOrganizationId: 'firm_1',
      referenceId: 'firm_1',
      action: 'list-subscription' as never,
    }

    for (const role of ['partner', 'manager', 'preparer', 'coordinator']) {
      const hooks = buildBillingHooks(makeAuthzDb([{ role, status: 'active' }]).db)
      // oxlint-disable-next-line no-await-in-loop -- sequential per-role assertions for test isolation
      await expect(hooks.authorizeReference(input)).resolves.toBe(false)
    }
  })

  it('reserves billing management for owners', async () => {
    const { db } = makeAuthzDb([{ role: 'manager', status: 'active' }])
    const hooks = buildBillingHooks(db)

    await expect(
      hooks.authorizeReference({
        userId: 'user_1',
        sessionId: 'session_1',
        activeOrganizationId: 'firm_1',
        referenceId: 'firm_1',
        action: 'upgrade-subscription' as never,
      }),
    ).resolves.toBe(false)
  })

  it('rejects reference ids outside the active firm before reading membership', async () => {
    const { db, limit } = makeAuthzDb([{ role: 'owner', status: 'active' }])
    const hooks = buildBillingHooks(db)

    await expect(
      hooks.authorizeReference({
        userId: 'user_1',
        sessionId: 'session_1',
        activeOrganizationId: 'firm_1',
        referenceId: 'firm_2',
        action: 'list-subscription' as never,
      }),
    ).resolves.toBe(false)
    expect(limit).not.toHaveBeenCalled()
  })

  it('writes null subscription cache when sync input omits stripeSubscriptionId', async () => {
    const { db, set } = makeUpdateDb()
    const hooks = buildBillingHooks(db)

    await hooks.syncSubscription({
      referenceId: 'firm_1',
      plan: 'solo',
      seatLimit: 1,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: undefined,
      status: 'canceled' as never,
    })

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'solo',
        seatLimit: 1,
        billingCustomerId: 'cus_123',
        billingSubscriptionId: null,
      }),
    )
  })

  it('writes Team plan and seat limit from subscription sync input', async () => {
    const { db, set } = makeUpdateDb()
    const hooks = buildBillingHooks(db)

    await hooks.syncSubscription({
      referenceId: 'firm_1',
      plan: 'team',
      seatLimit: 10,
      stripeCustomerId: 'cus_team',
      stripeSubscriptionId: 'sub_team',
      status: 'active' as never,
    })

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'team',
        seatLimit: 10,
        billingCustomerId: 'cus_team',
        billingSubscriptionId: 'sub_team',
      }),
    )
  })

  it('suspends over-limit non-owners and cancels excess pending invitations', async () => {
    const { db, set } = makeOverLimitUpdateDb()
    const hooks = buildBillingHooks(db)

    await hooks.syncSubscription({
      referenceId: 'firm_1',
      plan: 'solo',
      seatLimit: 1,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: undefined,
      status: 'canceled' as never,
    })

    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: 'suspended' }))
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: 'canceled' }))
  })
})

describe('seatOverflowMemberIds', () => {
  const at = (day: number) => new Date(`2026-01-0${day}T00:00:00.000Z`)

  it('suspends the lowest-ranked roles first, not the newest members', () => {
    // Coordinator joined first, partner joined last. A join-date policy would
    // suspend the partner; the hierarchy policy keeps partner + manager.
    const members = [
      { id: 'member_owner', role: 'owner', createdAt: at(1) },
      { id: 'member_coordinator', role: 'coordinator', createdAt: at(2) },
      { id: 'member_manager', role: 'manager', createdAt: at(3) },
      { id: 'member_partner', role: 'partner', createdAt: at(4) },
    ]

    expect(seatOverflowMemberIds(members, 3)).toEqual(['member_coordinator'])
  })

  it('breaks rank ties by suspending the newest member', () => {
    const members = [
      { id: 'member_owner', role: 'owner', createdAt: at(1) },
      { id: 'member_preparer_old', role: 'preparer', createdAt: at(2) },
      { id: 'member_preparer_new', role: 'preparer', createdAt: at(3) },
    ]

    expect(seatOverflowMemberIds(members, 2)).toEqual(['member_preparer_new'])
  })

  it('never suspends owners and returns empty when seats cover everyone', () => {
    const members = [
      { id: 'member_owner', role: 'owner', createdAt: at(1) },
      { id: 'member_partner', role: 'partner', createdAt: at(2) },
    ]

    expect(seatOverflowMemberIds(members, 2)).toEqual([])
    expect(seatOverflowMemberIds(members, 0)).toEqual(['member_partner'])
  })
})
