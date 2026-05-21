import { describe, expect, it, vi } from 'vitest'
import type { Db } from '../client'
import { makeAiRepo } from './ai'

function createFindDb(rows: unknown[]) {
  const limit = vi.fn(async (_limit: number) => rows)
  const orderBy = vi.fn(() => ({ limit }))
  const where = vi.fn(() => ({ orderBy }))
  const from = vi.fn(() => ({ where }))
  const select = vi.fn(() => ({ from }))
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- focused Drizzle test double.
    db: { select } as unknown as Db,
    select,
    where,
    orderBy,
    limit,
  }
}

describe('makeAiRepo', () => {
  it('finds the latest successful run by exact context and input hash', async () => {
    const generatedAt = new Date('2026-05-21T09:00:00.000Z')
    const fake = createFindDb([
      {
        id: 'ai-output-1',
        firmId: 'firm-1',
        userId: 'user-1',
        kind: 'rule_concrete_draft',
        promptVersion: 'rule-concrete-draft@v1',
        model: 'test-model',
        inputContextRef: 'rule:rule-1:source-1',
        inputHash: 'hash-1',
        outputText: '{"confidence":1}',
        citations: { sourceId: 'source-1' },
        guardResult: 'ok',
        refusalCode: null,
        generatedAt,
      },
    ])

    const repo = makeAiRepo(fake.db, 'firm-1')
    const row = await repo.findSuccessfulRun({
      kind: 'rule_concrete_draft',
      inputContextRef: 'rule:rule-1:source-1',
      inputHash: 'hash-1',
      promptVersion: 'rule-concrete-draft@v1',
    })

    expect(row).toMatchObject({
      id: 'ai-output-1',
      firmId: 'firm-1',
      outputText: '{"confidence":1}',
      generatedAt,
    })
    expect(fake.select).toHaveBeenCalledTimes(1)
    expect(fake.orderBy).toHaveBeenCalledTimes(1)
    expect(fake.limit).toHaveBeenCalledWith(1)
  })

  it('returns null when there is no reusable successful run', async () => {
    const fake = createFindDb([])
    const repo = makeAiRepo(fake.db, 'firm-1')

    await expect(
      repo.findSuccessfulRun({
        kind: 'rule_concrete_draft',
        inputContextRef: 'rule:rule-1:source-1',
        inputHash: 'hash-1',
        promptVersion: 'rule-concrete-draft@v1',
      }),
    ).resolves.toBeNull()
  })
})
