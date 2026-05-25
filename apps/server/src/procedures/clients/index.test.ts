import { describe, expect, it, vi } from 'vitest'
import type { ClientRow } from './_serializers'
import { deleteClientRecord, rereadCreatedClientBatch } from './index'

function makeClient(overrides: Partial<ClientRow> = {}): ClientRow {
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
    email: overrides.email ?? null,
    notes: overrides.notes ?? null,
    externalClientId: overrides.externalClientId ?? null,
    addressLine1: overrides.addressLine1 ?? null,
    city: overrides.city ?? null,
    postalCode: overrides.postalCode ?? null,
    primaryPhone: overrides.primaryPhone ?? null,
    sourceStatus: overrides.sourceStatus ?? null,
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
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    deletedAt: overrides.deletedAt ?? null,
  }
}

describe('clients procedure batch reread', () => {
  it('uses targeted client lookup for the created ids', async () => {
    const findManyByIds = vi.fn(async () => [makeClient({ id: 'client_1' })])

    const rows = await rereadCreatedClientBatch({ findManyByIds }, ['client_1'])

    expect(findManyByIds).toHaveBeenCalledWith(['client_1'])
    expect(rows.map((row) => row.id)).toEqual(['client_1'])
  })

  it('fails closed if a created row cannot be re-read', async () => {
    const findManyByIds = vi.fn(async () => [makeClient({ id: 'client_1' })])

    await expect(
      rereadCreatedClientBatch({ findManyByIds }, ['client_1', 'client_2']),
    ).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
    })
  })
})

describe('clients procedure delete', () => {
  it('soft-deletes the client and writes an audit event', async () => {
    const client = makeClient({ id: 'client_1', name: 'Acme LLC', state: 'CA' })
    const findById = vi.fn(async () => client)
    const softDelete = vi.fn(async () => {})
    const write = vi.fn(async () => ({ id: 'audit_1' }))

    const result = await deleteClientRecord({
      clients: { findById, softDelete },
      audit: { write },
      clientId: 'client_1',
      actorId: 'user_1',
      deletedAt: new Date('2026-05-04T00:00:00.000Z'),
    })

    expect(result.auditId).toBe('audit_1')
    expect(softDelete).toHaveBeenCalledWith('client_1')
    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user_1',
        entityType: 'client',
        entityId: 'client_1',
        action: 'client.deleted',
        before: expect.objectContaining({ id: 'client_1', name: 'Acme LLC', state: 'CA' }),
        after: { deletedAt: '2026-05-04T00:00:00.000Z' },
      }),
    )
  })

  it('fails when the client is not in the current firm', async () => {
    const findById = vi.fn(async () => undefined)
    const softDelete = vi.fn(async () => {})
    const write = vi.fn(async () => ({ id: 'audit_1' }))

    await expect(
      deleteClientRecord({
        clients: { findById, softDelete },
        audit: { write },
        clientId: 'missing_client',
        actorId: 'user_1',
      }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })

    expect(softDelete).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })
})
