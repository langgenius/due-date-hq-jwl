/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Drizzle builders are mocked narrowly so repo tests can inspect write intent.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Db } from '../client'
import { practiceRule, practiceRuleReviewTask, ruleTemplate } from '../schema/rules'
import { isTemporaryRuleExpired, makeRulesOpsRepo } from './rules'

function selectChain(response: unknown[]) {
  const chain = response.slice() as unknown[] & {
    from: ReturnType<typeof vi.fn>
    where: ReturnType<typeof vi.fn>
    orderBy: ReturnType<typeof vi.fn>
    limit: ReturnType<typeof vi.fn>
  }
  chain.from = vi.fn(() => chain)
  chain.where = vi.fn(() => chain)
  chain.orderBy = vi.fn(() => chain)
  chain.limit = vi.fn(async () => response)
  return chain
}

function fakeDb(selectResponses: unknown[][]) {
  const insertValues: unknown[] = []
  const updateValues: Array<{ table: unknown; value: unknown }> = []
  const db = {
    select: vi.fn(() => selectChain(selectResponses.shift() ?? [])),
    insert: vi.fn((table: unknown) => ({
      values: (value: unknown) => {
        insertValues.push({ table, value })
        const statement = {
          onConflictDoNothing: vi.fn(async () => undefined),
        }
        return statement
      },
    })),
    update: vi.fn((table: unknown) => ({
      set: (value: unknown) => ({
        where: async () => {
          updateValues.push({ table, value })
          return undefined
        },
      }),
    })),
  }
  return {
    db: db as unknown as Db,
    insertValues,
    updateValues,
    select: db.select,
    insert: db.insert,
    update: db.update,
  }
}

describe('makeRulesOpsRepo', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000000')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fans out catalog review tasks without changing active practice rule state', async () => {
    const fake = fakeDb([
      [{ id: 'firm-a' }, { id: 'firm-b' }],
      [{ firmId: 'firm-a' }],
      [{ firmId: 'firm-b' }],
    ])
    const repo = makeRulesOpsRepo(fake.db)

    await repo.fanoutReviewTasks({
      newRules: [{ ruleId: 'new-rule', templateVersion: 1 }],
      changedRules: [{ ruleId: 'changed-rule', templateVersion: 2 }],
    })

    expect(fake.updateValues.every((write) => write.table !== practiceRule)).toBe(true)
    expect(fake.updateValues).toEqual(
      expect.arrayContaining([
        {
          table: practiceRuleReviewTask,
          value: expect.objectContaining({ status: 'superseded' }),
        },
      ]),
    )
    expect(fake.insertValues).toEqual(
      expect.arrayContaining([
        {
          table: practiceRuleReviewTask,
          value: expect.objectContaining({
            firmId: 'firm-a',
            ruleId: 'new-rule',
            templateVersion: 1,
            reason: 'new_template',
          }),
        },
        {
          table: practiceRuleReviewTask,
          value: expect.objectContaining({
            firmId: 'firm-b',
            ruleId: 'changed-rule',
            templateVersion: 2,
            reason: 'source_changed',
          }),
        },
      ]),
    )
  })

  it('marks stale global rule templates deprecated without deleting audit history', async () => {
    const fake = fakeDb([])
    const repo = makeRulesOpsRepo(fake.db)

    const count = await repo.deprecateGlobalRuleTemplates(['old-rule', 'old-rule', 'older-rule'])

    expect(count).toBe(2)
    expect(fake.updateValues).toEqual([
      {
        table: ruleTemplate,
        value: expect.objectContaining({ status: 'deprecated' }),
      },
    ])
    expect(fake.updateValues.every((write) => write.table !== practiceRule)).toBe(true)
  })
})

describe('isTemporaryRuleExpired', () => {
  // Fixed "today" so the suite is deterministic regardless of wall-clock.
  const NOW = new Date('2026-06-09T12:00:00.000Z')
  const day = (isoDay: string) => new Date(`${isoDay}T00:00:00.000Z`)

  it('is not expired while the relief window ends in the future', () => {
    expect(isTemporaryRuleExpired('active', day('2026-06-30'), day('2026-06-30'), NOW)).toBe(false)
  })

  it('is expired once the relief window (effectiveUntil) is before today', () => {
    expect(isTemporaryRuleExpired('active', day('2026-06-08'), null, NOW)).toBe(true)
  })

  it('still reads active on the boundary day itself (expires strictly after)', () => {
    expect(isTemporaryRuleExpired('active', day('2026-06-09'), null, NOW)).toBe(false)
  })

  it('falls back to overrideDueDate when effectiveUntil is null', () => {
    expect(isTemporaryRuleExpired('active', null, day('2026-06-01'), NOW)).toBe(true)
    expect(isTemporaryRuleExpired('active', null, day('2026-07-01'), NOW)).toBe(false)
  })

  it('prefers effectiveUntil over overrideDueDate when both are set', () => {
    // Window already closed even though the postponed due date is still in the
    // future → the stated relief-window end wins → expired.
    expect(isTemporaryRuleExpired('active', day('2026-06-01'), day('2026-12-31'), NOW)).toBe(true)
  })

  it('never expires when no date is known (e.g. penalty waiver without a window)', () => {
    expect(isTemporaryRuleExpired('active', null, null, NOW)).toBe(false)
  })

  it('never re-labels a reverted or retracted rule, regardless of date', () => {
    expect(isTemporaryRuleExpired('reverted', day('2020-01-01'), null, NOW)).toBe(false)
    expect(isTemporaryRuleExpired('retracted', day('2020-01-01'), null, NOW)).toBe(false)
  })
})
