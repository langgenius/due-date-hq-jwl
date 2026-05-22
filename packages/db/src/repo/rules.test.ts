/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Drizzle builders are mocked narrowly so repo tests can inspect write intent.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Db } from '../client'
import { practiceRule, practiceRuleReviewTask } from '../schema/rules'
import { makeRulesOpsRepo } from './rules'

const NOW = new Date('2026-05-25T09:00:00.000Z')

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

  it('keeps reconcile run creation idempotent by run key', async () => {
    const existingRun = {
      id: 'existing-run',
      runKey: 'cadence:2026-05-25T09:00Z',
      status: 'running',
      triggeredBy: 'scheduled_cron',
      startedAt: NOW,
      completedAt: null,
      sourceCount: 2,
      checkedCount: 0,
      unchangedCount: 0,
      changedCount: 0,
      proposalCount: 0,
      failureCount: 0,
      errorText: null,
      createdAt: NOW,
      updatedAt: NOW,
    }
    const fake = fakeDb([[existingRun]])
    const repo = makeRulesOpsRepo(fake.db)

    const result = await repo.startReconcileRun({
      runKey: 'cadence:2026-05-25T09:00Z',
      sourceCount: 2,
      startedAt: NOW,
    })

    expect(result).toEqual({ run: existingRun, inserted: false })
    expect(fake.insertValues[0]).toMatchObject({
      value: {
        id: '00000000-0000-4000-8000-000000000000',
        runKey: 'cadence:2026-05-25T09:00Z',
        sourceCount: 2,
      },
    })
  })

  it('records changed source proposals with snapshot, AI output, and rule ids', async () => {
    const proposalRow = {
      id: 'proposal-1',
      runId: 'run-1',
      sourceId: 'source-1',
      sourceSnapshotId: 'snapshot-1',
      contentHash: 'hash-1',
      rawR2Key: 'raw/source.html',
      proposalType: 'existing_rule_update',
      status: 'open',
      affectedRuleIdsJson: ['rule-1'],
      proposedRuleIdsJson: ['rule-2'],
      normalizedRuleJson: { rules: [] },
      diffSummary: 'Due date semantics changed.',
      aiOutputId: 'ai-output-1',
      failureReason: null,
      createdAt: NOW,
      updatedAt: NOW,
    }
    const fake = fakeDb([[proposalRow]])
    const repo = makeRulesOpsRepo(fake.db)

    const result = await repo.recordChangeProposal({
      runId: 'run-1',
      sourceId: 'source-1',
      sourceSnapshotId: 'snapshot-1',
      contentHash: 'hash-1',
      rawR2Key: 'raw/source.html',
      proposalType: 'existing_rule_update',
      affectedRuleIds: ['rule-1'],
      proposedRuleIds: ['rule-2'],
      normalizedRuleJson: { rules: [] },
      diffSummary: 'Due date semantics changed.',
      aiOutputId: 'ai-output-1',
    })

    expect(fake.insertValues[0]).toMatchObject({
      value: {
        runId: 'run-1',
        sourceId: 'source-1',
        sourceSnapshotId: 'snapshot-1',
        contentHash: 'hash-1',
        rawR2Key: 'raw/source.html',
        proposalType: 'existing_rule_update',
        status: 'open',
        affectedRuleIdsJson: ['rule-1'],
        proposedRuleIdsJson: ['rule-2'],
        normalizedRuleJson: { rules: [] },
        diffSummary: 'Due date semantics changed.',
        aiOutputId: 'ai-output-1',
      },
    })
    expect(result).toMatchObject({
      id: 'proposal-1',
      affectedRuleIds: ['rule-1'],
      proposedRuleIds: ['rule-2'],
    })
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
