import { describe, expect, it, vi } from 'vitest'
import type { Db } from '../client'
import { makeEvidenceRepo } from './evidence'
import { makeObligationsRepo } from './obligations'

function createFakeDb(selectResponses: Array<Array<Record<string, unknown>>>) {
  const insertValues = vi.fn(async () => undefined)
  const insert = vi.fn(() => ({ values: insertValues }))
  const where = vi.fn(async () => selectResponses.shift() ?? [])
  const from = vi.fn(() => ({ where }))
  const select = vi.fn(() => ({ from }))

  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- focused Drizzle test double.
    db: { insert, select } as unknown as Db,
    insert,
    insertValues,
    select,
    where,
  }
}

describe('tenant-scoped repo cross-reference guards', () => {
  it('rejects obligation creates for clients outside the current firm', async () => {
    const fake = createFakeDb([[]])
    const repo = makeObligationsRepo(fake.db, 'firm_current')

    await expect(
      repo.createBatch([
        {
          clientId: 'client_other',
          taxType: '1120S',
          baseDueDate: new Date('2026-03-15T00:00:00.000Z'),
        },
      ]),
    ).rejects.toThrow(
      'Cannot create obligations for clients outside the current firm: client_other',
    )
    expect(fake.insert).not.toHaveBeenCalled()
  })

  it('allows obligation creates after validating referenced clients in the firm', async () => {
    const fake = createFakeDb([[{ id: 'client_1' }]])
    const repo = makeObligationsRepo(fake.db, 'firm_current')

    await expect(
      repo.createBatch([
        {
          clientId: 'client_1',
          taxType: '1120S',
          baseDueDate: new Date('2026-03-15T00:00:00.000Z'),
        },
        {
          clientId: 'client_1',
          taxType: '1065',
          baseDueDate: new Date('2026-03-15T00:00:00.000Z'),
        },
      ]),
    ).resolves.toEqual({ ids: [expect.any(String), expect.any(String)] })

    expect(fake.select).toHaveBeenCalledTimes(1)
    expect(fake.insertValues).toHaveBeenCalledTimes(1)
  })

  it('persists generated rule metadata for obligations', async () => {
    const fake = createFakeDb([[{ id: 'client_1' }]])
    const repo = makeObligationsRepo(fake.db, 'firm_current')
    const baseDueDate = new Date('2027-04-15T00:00:00.000Z')
    const taxPeriodStart = new Date('2026-01-01T00:00:00.000Z')
    const taxPeriodEnd = new Date('2026-12-31T00:00:00.000Z')

    await repo.createBatch([
      {
        clientId: 'client_1',
        taxType: 'ca_100',
        taxYear: 2026,
        taxPeriodStart,
        taxPeriodEnd,
        taxPeriodKind: 'calendar',
        taxPeriodSource: 'manual_cpa_confirmed',
        ruleId: 'ca_100_2027',
        ruleVersion: 3,
        rulePeriod: 'annual',
        generationSource: 'annual_rollover',
        baseDueDate,
      },
    ])

    expect(fake.insertValues).toHaveBeenCalledWith([
      expect.objectContaining({
        ruleId: 'ca_100_2027',
        ruleVersion: 3,
        rulePeriod: 'annual',
        generationSource: 'annual_rollover',
        taxPeriodStart,
        taxPeriodEnd,
        taxPeriodKind: 'calendar',
        taxPeriodSource: 'manual_cpa_confirmed',
        taxPeriodReviewReason: null,
        filingDueDate: baseDueDate,
        paymentDueDate: baseDueDate,
      }),
    ])
  })

  it('returns generated obligation rows for duplicate lookup', async () => {
    const duplicate = {
      id: 'oi_existing',
      clientId: 'client_1',
      ruleId: 'ca_100_2027',
      taxYear: 2026,
      rulePeriod: 'annual',
    }
    const fake = createFakeDb([[duplicate]])
    const repo = makeObligationsRepo(fake.db, 'firm_current')

    await expect(
      repo.listGeneratedByClientAndTaxYears({
        clientIds: ['client_1'],
        taxYears: [2026],
      }),
    ).resolves.toEqual([duplicate])
  })

  it('rejects evidence writes for obligations outside the current firm', async () => {
    const fake = createFakeDb([[]])
    const repo = makeEvidenceRepo(fake.db, 'firm_current')

    await expect(
      repo.write({
        obligationInstanceId: 'oi_other',
        sourceType: 'user_override',
      }),
    ).rejects.toThrow('Cannot access evidence for obligations outside the current firm: oi_other')
    expect(fake.insert).not.toHaveBeenCalled()
  })

  it('allows evidence writes after validating referenced obligations in the firm', async () => {
    const fake = createFakeDb([[{ id: 'oi_1' }]])
    const repo = makeEvidenceRepo(fake.db, 'firm_current')

    await expect(
      repo.writeBatch([
        {
          obligationInstanceId: 'oi_1',
          sourceType: 'user_override',
        },
        {
          aiOutputId: 'ai_1',
          sourceType: 'ai_mapper',
        },
      ]),
    ).resolves.toEqual({ ids: [expect.any(String), expect.any(String)] })

    expect(fake.select).toHaveBeenCalledTimes(1)
    expect(fake.insertValues).toHaveBeenCalledTimes(1)
  })

  it('rejects evidence reads for obligations outside the current firm', async () => {
    const fake = createFakeDb([[]])
    const repo = makeEvidenceRepo(fake.db, 'firm_current')

    await expect(repo.listByObligation('oi_other')).rejects.toThrow(
      'Cannot access evidence for obligations outside the current firm: oi_other',
    )
  })
})
