import { describe, expect, it } from 'vitest'
import { makeMigrationRepo } from './migration'

describe('makeMigrationRepo', () => {
  it('splits normalization inserts within the D1 bound variable limit', async () => {
    const insertBatchSizes: number[] = []
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 'batch-1' }],
          }),
        }),
      }),
      insert: () => ({
        values: (values: unknown[]) => {
          insertBatchSizes.push(values.length)
          return Promise.resolve()
        },
      }),
    }

    // @ts-expect-error fake db implements only the select/insert chains used by this method.
    const repo = makeMigrationRepo(db, 'firm-1')
    const count = await repo.createNormalizations(
      'batch-1',
      Array.from({ length: 11 }, (_, index) => ({
        field: 'entity_type',
        rawValue: `raw-${index}`,
        normalizedValue: 'llc',
        confidence: 0.85,
        model: null,
        promptVersion: 'dictionary@v1',
        reasoning: 'Local dictionary fallback.',
        userOverridden: false,
      })),
    )

    expect(count).toBe(11)
    expect(insertBatchSizes).toEqual([10, 1])
  })

  it('builds a full revert batch without requiring schema changes', async () => {
    const batchStatements: unknown[] = []
    let selectCall = 0
    const db = {
      select: () => {
        selectCall += 1
        return {
          from: () => ({
            where: () => {
              if (selectCall === 1) return { limit: async () => [{ id: 'batch-1' }] }
              if (selectCall === 2) return Promise.resolve([{ id: 'oi-1' }, { id: 'oi-2' }])
              return Promise.resolve([{ id: 'client-1' }])
            },
          }),
        }
      },
      insert: () => ({
        values: (value: unknown) => ({ kind: 'insert', value }),
      }),
      delete: () => ({
        where: () => ({ kind: 'delete' }),
      }),
      update: () => ({
        set: (value: unknown) => ({
          where: () => ({ kind: 'update', value }),
        }),
      }),
      batch: async (statements: [unknown, ...unknown[]]) => {
        batchStatements.push(...statements)
        return []
      },
    }

    // @ts-expect-error fake db implements only the chains used by revertImport.
    const repo = makeMigrationRepo(db, 'firm-1')
    const result = await repo.revertImport({
      batchId: 'batch-1',
      userId: 'user-1',
      revertedAt: new Date('2026-04-28T00:00:00.000Z'),
    })

    expect(result).toEqual({ clientCount: 1, obligationCount: 2 })
    expect(batchStatements).toHaveLength(6)
    expect(batchStatements).toEqual([
      expect.objectContaining({ kind: 'insert' }),
      expect.objectContaining({ kind: 'insert' }),
      expect.objectContaining({ kind: 'delete' }),
      expect.objectContaining({ kind: 'delete' }),
      expect.objectContaining({ kind: 'delete' }),
      expect.objectContaining({ kind: 'update' }),
    ])
  })
})
