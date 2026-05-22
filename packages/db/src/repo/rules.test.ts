/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Drizzle builders are mocked narrowly so repo tests can inspect write intent.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Db } from '../client'
import { practiceRule, practiceRuleReviewTask } from '../schema/rules'
import { makeRulesOpsRepo } from './rules'

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
})
