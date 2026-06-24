/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Drizzle select builders are mocked narrowly so we can inspect generated SQL.
 */
import { describe, expect, it, vi } from 'vitest'
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core'
import type { SQL } from 'drizzle-orm'
import type { Db } from '../client'
import { makeFirmsRepo } from './firms'

type FirmSelectRow = {
  id: string
  name: string
  slug: string
  plan: 'solo'
  seatLimit: number
  timezone: string
  internalDeadlineOffsetDays: number
  monitoringStartDate: string
  status: 'active'
  role: string
  ownerUserId: string
  coordinatorCanSeeDollars: boolean
  smartPriorityProfileJson: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

function makeFirmRow(overrides: Partial<FirmSelectRow> = {}): FirmSelectRow {
  const now = new Date('2026-05-25T00:00:00.000Z')
  return {
    id: overrides.id ?? 'firm_a',
    name: overrides.name ?? 'Firm A',
    slug: overrides.slug ?? 'firm-a',
    plan: overrides.plan ?? 'solo',
    seatLimit: overrides.seatLimit ?? 1,
    timezone: overrides.timezone ?? 'America/New_York',
    internalDeadlineOffsetDays: overrides.internalDeadlineOffsetDays ?? 14,
    monitoringStartDate: overrides.monitoringStartDate ?? '2026-05-25',
    status: overrides.status ?? 'active',
    role: overrides.role ?? 'owner',
    ownerUserId: overrides.ownerUserId ?? 'user_1',
    coordinatorCanSeeDollars: overrides.coordinatorCanSeeDollars ?? false,
    smartPriorityProfileJson: overrides.smartPriorityProfileJson ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    deletedAt: overrides.deletedAt ?? null,
  }
}

function createFirmSelectDb(rows: FirmSelectRow[] = []) {
  const orderBy = vi.fn(async () => rows)
  const limit = vi.fn(async () => rows)
  const where = vi.fn((_expr: SQL) => ({ orderBy, limit }))
  const innerJoinOrganization = vi.fn(() => ({ where }))
  const innerJoinFirmProfile = vi.fn(() => ({ innerJoin: innerJoinOrganization }))
  const from = vi.fn(() => ({ innerJoin: innerJoinFirmProfile }))
  const groupedCountGroupBy = vi.fn(async () => rows.map((row) => ({ firmId: row.id, value: 0 })))
  const groupedCountWhere = vi.fn((_expr: SQL) => ({ groupBy: groupedCountGroupBy }))
  const groupedCountInnerJoin = vi.fn((_table: unknown, _expr: SQL) => ({
    where: groupedCountWhere,
  }))
  const groupedCountFrom = vi.fn(() => ({ innerJoin: groupedCountInnerJoin }))
  const singleCountWhere = vi.fn(async (_expr: SQL) => [{ value: 0 }])
  const singleCountInnerJoin = vi.fn((_table: unknown, _expr: SQL) => ({
    where: singleCountWhere,
  }))
  const singleCountFrom = vi.fn(() => ({ innerJoin: singleCountInnerJoin }))
  const select = vi.fn((shape?: Record<string, unknown>) => {
    const keys = Object.keys(shape ?? {})
    if (keys.length === 2 && keys.includes('firmId') && keys.includes('value')) {
      return { from: groupedCountFrom }
    }
    if (keys.length === 1 && keys.includes('value')) {
      return { from: singleCountFrom }
    }
    return { from }
  })

  return {
    db: { select } as unknown as Db,
    where,
    groupedCountInnerJoin,
    groupedCountWhere,
    singleCountInnerJoin,
    singleCountWhere,
  }
}

function normalizeWhere(expr: SQL) {
  const dialect = new SQLiteSyncDialect()
  return dialect.sqlToQuery(expr)
}

describe('makeFirmsRepo', () => {
  it('counts only active firms owned by the user for creation entitlement', async () => {
    const fake = createFirmSelectDb()
    const repo = makeFirmsRepo(fake.db)

    await repo.listOwnedActive('user_1')

    const where = normalizeWhere(fake.where.mock.calls[0]![0])
    expect(where.sql).toBe(
      [
        '("member"."user_id" = ?',
        'and "member"."status" = ?',
        'and "firm_profile"."owner_user_id" = ?',
        'and "firm_profile"."status" = ?',
        'and "firm_profile"."deleted_at" is null)',
      ].join(' '),
    )
    expect(where.params).toEqual(['user_1', 'active', 'user_1', 'active'])
  })

  it('counts listed firm deadlines with the same visible-client scope as the queue', async () => {
    const fake = createFirmSelectDb([makeFirmRow()])
    const repo = makeFirmsRepo(fake.db)

    await repo.listMine('user_1')

    const join = normalizeWhere(fake.groupedCountInnerJoin.mock.calls[0]![1])
    expect(join.sql).toBe(
      '("client"."id" = "obligation_instance"."client_id" and "client"."firm_id" = "obligation_instance"."firm_id")',
    )

    const where = normalizeWhere(fake.groupedCountWhere.mock.calls[0]![0])
    expect(where.sql).toContain('"client"."deleted_at" is null')
    expect(where.params).toEqual([
      'firm_a',
      'pending',
      'in_progress',
      'waiting_on_client',
      'review',
      'blocked',
    ])
  })

  it('counts the current firm deadlines with the same visible-client scope as the queue', async () => {
    const fake = createFirmSelectDb([makeFirmRow()])
    const repo = makeFirmsRepo(fake.db)

    await repo.findActiveForUser('user_1', 'firm_a')

    const join = normalizeWhere(fake.singleCountInnerJoin.mock.calls[0]![1])
    expect(join.sql).toBe(
      '("client"."id" = "obligation_instance"."client_id" and "client"."firm_id" = "obligation_instance"."firm_id")',
    )

    const where = normalizeWhere(fake.singleCountWhere.mock.calls[0]![0])
    expect(where.sql).toContain('"client"."deleted_at" is null')
    expect(where.params).toEqual([
      'firm_a',
      'pending',
      'in_progress',
      'waiting_on_client',
      'review',
      'blocked',
    ])
  })

  it('grants the Team plan and records a trialing subscription window', async () => {
    const calls: { kind: 'update' | 'insert'; payload: Record<string, unknown> }[] = []
    const set = vi.fn((payload: Record<string, unknown>) => {
      calls.push({ kind: 'update', payload })
      return { where: vi.fn(async () => undefined) }
    })
    const values = vi.fn(async (payload: Record<string, unknown>) => {
      calls.push({ kind: 'insert', payload })
    })
    const db = {
      update: vi.fn(() => ({ set })),
      insert: vi.fn(() => ({ values })),
    } as unknown as Db
    const repo = makeFirmsRepo(db)

    await repo.grantTeamTrial('firm_a', 3)

    // The Team tier is the firm_profile.plan column + its seat allotment.
    const update = calls.find((c) => c.kind === 'update')
    expect(update?.payload).toMatchObject({ plan: 'team', seatLimit: 10 })

    // The subscription row records the trial window with no Stripe linkage.
    const insert = calls.find((c) => c.kind === 'insert')
    expect(insert?.payload).toMatchObject({
      plan: 'team',
      referenceId: 'firm_a',
      status: 'trialing',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      seats: 10,
    })
    const { trialStart, trialEnd } = insert!.payload as { trialStart: Date; trialEnd: Date }
    expect(trialStart).toBeInstanceOf(Date)
    expect(trialEnd).toBeInstanceOf(Date)
    const days = (trialEnd.getTime() - trialStart.getTime()) / (24 * 60 * 60 * 1000)
    expect(days).toBeGreaterThan(85)
    expect(days).toBeLessThan(95)
  })
})
