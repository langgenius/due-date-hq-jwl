/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Drizzle builders are mocked narrowly so repo tests can inspect mirror writes.
 */
import { describe, expect, it, vi } from 'vitest'
import type { RuleConcreteDraftCacheInput } from '@duedatehq/ports/rule-concrete-drafts'
import type { Db } from '../client'
import { ruleConcreteDraft } from '../schema/ai'
import { makeRuleConcreteDraftRepo } from './rule-concrete-drafts'

function createDb(rows: unknown[] = []) {
  const values: unknown[] = []
  const onConflictDoUpdate = vi.fn(async () => undefined)
  const insert = vi.fn((table: unknown) => ({
    values: (value: unknown) => {
      values.push({ table, value })
      return { onConflictDoUpdate }
    },
  }))
  const orderBy = vi.fn(async () => rows)
  const where = vi.fn(() => ({ orderBy }))
  const from = vi.fn(() => ({ where }))
  const select = vi.fn(() => ({ from }))

  return {
    db: { insert, select } as unknown as Db,
    insert,
    values,
    onConflictDoUpdate,
    select,
    where,
    orderBy,
  }
}

function cacheInput(
  overrides: Partial<RuleConcreteDraftCacheInput> = {},
): RuleConcreteDraftCacheInput {
  return {
    aiOutputId: 'ai-output-1',
    firmId: null,
    userId: null,
    inputContextRef: 'rule:rule-1:v1:source-1',
    inputHash: 'hash-1',
    promptVersion: 'rule-concrete-draft@v2',
    model: 'test-model',
    ruleId: 'rule-1',
    ruleVersion: 1,
    sourceId: 'source-1',
    sourceSnapshotId: null,
    sourceUrl: 'https://example.test/source',
    sourceFetchedAt: new Date('2026-05-25T00:00:00.000Z'),
    sourcePublishedAt: null,
    sourceExcerpt: 'Return due April 15.',
    sourceText: 'Return due April 15.',
    outputText: '{"confidence":1}',
    citations: { sourceId: 'source-1' },
    generatedAt: new Date('2026-05-25T00:00:01.000Z'),
    ...overrides,
  }
}

describe('makeRuleConcreteDraftRepo', () => {
  it('upserts successful concrete drafts into the mirror table', async () => {
    const fake = createDb()
    const repo = makeRuleConcreteDraftRepo(fake.db)

    await repo.upsert(cacheInput())

    expect(fake.insert).toHaveBeenCalledWith(ruleConcreteDraft)
    expect(fake.values[0]).toMatchObject({
      table: ruleConcreteDraft,
      value: expect.objectContaining({
        aiOutputId: 'ai-output-1',
        inputContextRef: 'rule:rule-1:v1:source-1',
        outputText: '{"confidence":1}',
      }),
    })
    expect(fake.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ target: ruleConcreteDraft.aiOutputId }),
    )
  })

  it('reports missing mirror context refs from the current target set', async () => {
    const fake = createDb([{ inputContextRef: 'rule:ready:v1:source-1' }])
    const repo = makeRuleConcreteDraftRepo(fake.db)

    const result = await repo.health({
      inputContextRefs: ['rule:ready:v1:source-1', 'rule:missing:v1:source-1'],
      promptVersion: 'rule-concrete-draft@v2',
      retiredModel: 'deterministic-source-text',
    })

    expect(result).toEqual({
      readyContextRefs: ['rule:ready:v1:source-1'],
      missingContextRefs: ['rule:missing:v1:source-1'],
    })
  })
})
