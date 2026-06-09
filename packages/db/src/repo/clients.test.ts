import { describe, expect, it, vi } from 'vitest'
import type { Db } from '../client'
import type { Client } from '../schema/clients'
import { makeClientsRepo } from './clients'

function createFakeDb(selectResponses: Client[][]) {
  const where = vi.fn(async () => selectResponses.shift() ?? [])
  const from = vi.fn(() => ({ where }))
  const select = vi.fn(() => ({ from }))

  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- focused Drizzle test double.
    db: { select } as unknown as Db,
    select,
    where,
  }
}

function createFakeUpdateDb() {
  const where = vi.fn(async () => undefined)
  const set = vi.fn(() => ({ where }))
  const update = vi.fn(() => ({ set }))

  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- focused Drizzle test double.
    db: { update } as unknown as Db,
    update,
    set,
    where,
  }
}

function makeClient(overrides: Partial<Client> = {}): Client {
  const now = new Date('2026-04-29T00:00:00.000Z')
  return {
    id: overrides.id ?? 'client_1',
    firmId: overrides.firmId ?? 'firm_1',
    name: overrides.name ?? 'Acme LLC',
    ein: overrides.ein ?? null,
    state: overrides.state ?? null,
    county: overrides.county ?? null,
    entityType: overrides.entityType ?? 'llc',
    legalEntity: overrides.legalEntity ?? 'multi_member_llc',
    taxClassification: overrides.taxClassification ?? 'partnership',
    taxYearType: overrides.taxYearType ?? 'calendar',
    fiscalYearEndMonth: overrides.fiscalYearEndMonth ?? null,
    fiscalYearEndDay: overrides.fiscalYearEndDay ?? null,
    externalClientId: overrides.externalClientId ?? null,
    addressLine1: overrides.addressLine1 ?? null,
    city: overrides.city ?? null,
    postalCode: overrides.postalCode ?? null,
    primaryPhone: overrides.primaryPhone ?? null,
    sourceStatus: overrides.sourceStatus ?? null,
    email: overrides.email ?? null,
    notes: overrides.notes ?? null,
    assigneeId: overrides.assigneeId ?? null,
    assigneeName: overrides.assigneeName ?? null,
    ownerCount: overrides.ownerCount ?? 2,
    hasForeignAccounts: overrides.hasForeignAccounts ?? false,
    hasPayroll: overrides.hasPayroll ?? false,
    hasSalesTax: overrides.hasSalesTax ?? false,
    has1099Vendors: overrides.has1099Vendors ?? false,
    hasK1Activity: overrides.hasK1Activity ?? true,
    primaryContactName: overrides.primaryContactName ?? null,
    primaryContactEmail: overrides.primaryContactEmail ?? null,
    importanceWeight: overrides.importanceWeight ?? 2,
    lateFilingCountLast12mo: overrides.lateFilingCountLast12mo ?? 0,
    estimatedTaxLiabilityCents: overrides.estimatedTaxLiabilityCents ?? null,
    estimatedTaxLiabilitySource: overrides.estimatedTaxLiabilitySource ?? null,
    equityOwnerCount: overrides.equityOwnerCount ?? null,
    migrationBatchId: overrides.migrationBatchId ?? null,
    isSample: overrides.isSample ?? false,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    deletedAt: overrides.deletedAt ?? null,
  }
}

describe('makeClientsRepo.findManyByIds', () => {
  it('returns early without querying for an empty id list', async () => {
    const fake = createFakeDb([])
    const repo = makeClientsRepo(fake.db, 'firm_1')

    await expect(repo.findManyByIds([])).resolves.toEqual([])

    expect(fake.select).not.toHaveBeenCalled()
  })

  it('queries by bounded id chunks and preserves requested id order', async () => {
    const ids = Array.from({ length: 101 }, (_, index) => `client_${index}`)
    const fake = createFakeDb([
      [makeClient({ id: 'client_98' }), makeClient({ id: 'client_0' })],
      [makeClient({ id: 'client_100' }), makeClient({ id: 'client_99' })],
    ])
    const repo = makeClientsRepo(fake.db, 'firm_1')

    const rows = await repo.findManyByIds(ids)

    expect(fake.select).toHaveBeenCalledTimes(2)
    expect(fake.where).toHaveBeenCalledTimes(2)
    expect(rows.map((row) => row.id)).toEqual(['client_0', 'client_98', 'client_99', 'client_100'])
  })
})

describe('makeClientsRepo.updateJurisdiction', () => {
  it('updates state and county in one tenant-scoped statement', async () => {
    const fake = createFakeUpdateDb()
    const repo = makeClientsRepo(fake.db, 'firm_1')

    await repo.updateJurisdiction('client_1', { state: 'WA', county: 'King' })

    expect(fake.update).toHaveBeenCalledTimes(1)
    expect(fake.set).toHaveBeenCalledWith({ state: 'WA', county: 'King' })
    expect(fake.where).toHaveBeenCalledTimes(1)
  })
})

describe('makeClientsRepo.updateTaxYearProfile', () => {
  it('updates fiscal year profile in one tenant-scoped statement', async () => {
    const fake = createFakeUpdateDb()
    const repo = makeClientsRepo(fake.db, 'firm_1')

    await repo.updateTaxYearProfile('client_1', {
      taxYearType: 'fiscal',
      fiscalYearEndMonth: 6,
      fiscalYearEndDay: 30,
    })

    expect(fake.update).toHaveBeenCalledTimes(1)
    expect(fake.set).toHaveBeenCalledWith({
      taxYearType: 'fiscal',
      fiscalYearEndMonth: 6,
      fiscalYearEndDay: 30,
    })
    expect(fake.where).toHaveBeenCalledTimes(1)
  })

  it('clears fiscal year end fields for calendar-year clients', async () => {
    const fake = createFakeUpdateDb()
    const repo = makeClientsRepo(fake.db, 'firm_1')

    await repo.updateTaxYearProfile('client_1', {
      taxYearType: 'calendar',
      fiscalYearEndMonth: 6,
      fiscalYearEndDay: 30,
    })

    expect(fake.set).toHaveBeenCalledWith({
      taxYearType: 'calendar',
      fiscalYearEndMonth: null,
      fiscalYearEndDay: null,
    })
  })
})
