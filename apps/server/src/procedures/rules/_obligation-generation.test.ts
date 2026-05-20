import { describe, expect, it, vi } from 'vitest'
import { findRuleById, type ObligationRule } from '@duedatehq/core/rules'
import type { ClientFilingProfileRow } from '@duedatehq/ports/client-filing-profiles'
import type { ClientRow } from '@duedatehq/ports/clients'
import type { ObligationCreateInput } from '@duedatehq/ports/obligations'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import { generateObligationsForAcceptedRules } from './_obligation-generation'

const FIRM_ID = 'firm_123'
const USER_ID = 'user_123'
const CLIENT_ID = '22222222-2222-4222-8222-222222222222'
const PROFILE_ID = '33333333-3333-4333-8333-333333333333'

function mustRule(id: string): ObligationRule {
  const rule = findRuleById(id)
  if (!rule) throw new Error(`Missing fixture rule ${id}`)
  return rule
}

function makeClient(overrides: Partial<ClientRow> = {}): ClientRow {
  const now = new Date('2026-05-06T00:00:00.000Z')
  return {
    id: CLIENT_ID,
    firmId: FIRM_ID,
    name: 'Archive Demo LLC',
    ein: null,
    state: 'CA',
    county: null,
    entityType: 'llc',
    legalEntity: null,
    taxClassification: 'unknown',
    taxYearType: 'calendar',
    fiscalYearEndMonth: null,
    fiscalYearEndDay: null,
    email: null,
    notes: null,
    assigneeId: null,
    assigneeName: null,
    ownerCount: null,
    hasForeignAccounts: false,
    hasPayroll: false,
    hasSalesTax: false,
    has1099Vendors: false,
    hasK1Activity: false,
    primaryContactName: null,
    primaryContactEmail: null,
    importanceWeight: 2,
    lateFilingCountLast12mo: 0,
    estimatedTaxLiabilityCents: 125_000,
    estimatedTaxLiabilitySource: 'imported',
    equityOwnerCount: 2,
    migrationBatchId: 'batch_123',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

function makeProfile(overrides: Partial<ClientFilingProfileRow> = {}): ClientFilingProfileRow {
  const now = new Date('2026-05-06T00:00:00.000Z')
  return {
    id: PROFILE_ID,
    firmId: FIRM_ID,
    clientId: CLIENT_ID,
    state: 'CA',
    counties: [],
    taxTypes: ['ca_llc_franchise_min_800'],
    isPrimary: true,
    source: 'imported',
    migrationBatchId: 'batch_123',
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeScoped(input: {
  clients?: ClientRow[]
  profiles?: Map<string, ClientFilingProfileRow[]>
  duplicates?: Array<{
    id: string
    clientId: string
    jurisdiction: string | null
    ruleId: string | null
    taxYear: number | null
    rulePeriod: string | null
  }>
}) {
  const createdInputs: ObligationCreateInput[] = []
  const writeEvidenceBatch = vi.fn(async (rows: unknown[]) => ({
    ids: rows.map((_, index) => `evidence_${index + 1}`),
  }))
  const writeAudit = vi.fn(async () => ({ id: 'audit_1' }))
  const createBatch = vi.fn(async (rows: ObligationCreateInput[]) => {
    createdInputs.push(...rows)
    return { ids: rows.map((_, index) => `obligation_${index + 1}`) }
  })

  const clients = input.clients ?? [makeClient()]
  const profiles = input.profiles ?? new Map([[CLIENT_ID, [makeProfile()]]])

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- focused service test double implements only repos used by rule obligation generation.
  const scoped = {
    firmId: FIRM_ID,
    clients: {
      listByFirm: vi.fn(async () => clients),
    },
    filingProfiles: {
      listByClients: vi.fn(async () => profiles),
    },
    obligations: {
      listGeneratedByClientAndTaxYears: vi.fn(async () => input.duplicates ?? []),
      createBatch,
    },
    evidence: {
      writeBatch: writeEvidenceBatch,
    },
    audit: {
      write: writeAudit,
    },
  } as unknown as ScopedRepo

  return { scoped, createdInputs, createBatch, writeEvidenceBatch, writeAudit }
}

describe('generateObligationsForAcceptedRules', () => {
  it('creates missing obligations for existing imported clients when a matching rule is accepted', async () => {
    const { scoped, createdInputs, writeAudit, writeEvidenceBatch } = makeScoped({})

    const result = await generateObligationsForAcceptedRules({
      scoped,
      userId: USER_ID,
      rules: [mustRule('ca.llc.annual_tax.2026')],
      internalDeadlineOffsetDays: 14,
      now: new Date('2026-05-06T00:00:00.000Z'),
      reason: 'Accepted during onboarding.',
    })

    expect(result).toMatchObject({ candidateCount: 1, createdCount: 1, duplicateCount: 0 })
    expect(createdInputs).toEqual([
      expect.objectContaining({
        clientId: CLIENT_ID,
        clientFilingProfileId: PROFILE_ID,
        taxType: 'ca_llc_annual_tax',
        taxYear: 2026,
        ruleId: 'ca.llc.annual_tax.2026',
        generationSource: 'migration',
        migrationBatchId: 'batch_123',
        status: 'pending',
      }),
    ])
    expect(writeEvidenceBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        sourceType: 'verified_rule',
        sourceId: 'ca.llc.annual_tax.2026',
        rawValue: 'ca_llc_franchise_min_800',
        normalizedValue: 'ca_llc_annual_tax',
      }),
    ])
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'obligation.batch_created',
        after: expect.objectContaining({
          reason: 'rules.accepted',
          createdCount: 1,
          ruleIds: ['ca.llc.annual_tax.2026'],
        }),
      }),
    )
  })

  it('skips obligations that already exist for the same client, rule, tax year, and period', async () => {
    const { scoped, createBatch } = makeScoped({
      duplicates: [
        {
          id: 'existing_obligation',
          clientId: CLIENT_ID,
          jurisdiction: 'CA',
          ruleId: 'ca.llc.annual_tax.2026',
          taxYear: 2026,
          rulePeriod: 'tax_year',
        },
      ],
    })

    const result = await generateObligationsForAcceptedRules({
      scoped,
      userId: USER_ID,
      rules: [mustRule('ca.llc.annual_tax.2026')],
      internalDeadlineOffsetDays: 14,
      now: new Date('2026-05-06T00:00:00.000Z'),
    })

    expect(result).toMatchObject({ candidateCount: 1, createdCount: 0, duplicateCount: 1 })
    expect(createBatch).not.toHaveBeenCalled()
  })

  it('does not generate from profiles without tax types', async () => {
    const { scoped, createBatch } = makeScoped({
      profiles: new Map([[CLIENT_ID, [makeProfile({ taxTypes: [] })]]]),
    })

    const result = await generateObligationsForAcceptedRules({
      scoped,
      userId: USER_ID,
      rules: [mustRule('ca.llc.annual_tax.2026')],
      internalDeadlineOffsetDays: 14,
      now: new Date('2026-05-06T00:00:00.000Z'),
    })

    expect(result).toMatchObject({ candidateCount: 0, createdCount: 0, duplicateCount: 0 })
    expect(createBatch).not.toHaveBeenCalled()
  })

  it('persists CPA workflow dates and substates from accepted federal rules', async () => {
    const client = makeClient({
      entityType: 'individual',
      taxClassification: 'individual',
      migrationBatchId: null,
    })
    const profile = makeProfile({
      taxTypes: ['federal_1040', 'federal_1040_extension'],
      migrationBatchId: null,
    })
    const { scoped, createdInputs } = makeScoped({
      clients: [client],
      profiles: new Map([[CLIENT_ID, [profile]]]),
    })

    const result = await generateObligationsForAcceptedRules({
      scoped,
      userId: USER_ID,
      rules: [mustRule('fed.1040.return.2025'), mustRule('fed.1040.extension.2025')],
      internalDeadlineOffsetDays: 14,
      now: new Date('2026-05-06T00:00:00.000Z'),
    })

    expect(result).toMatchObject({ candidateCount: 2, createdCount: 2, duplicateCount: 0 })
    expect(createdInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clientFilingProfileId: null,
          taxType: 'federal_1040',
          obligationType: 'filing',
          formName: 'Form 1040',
          authority: 'IRS',
          filingDueDate: new Date('2026-04-15T00:00:00.000Z'),
          paymentDueDate: new Date('2026-04-15T00:00:00.000Z'),
          recurrence: 'annual',
          riskLevel: 'med',
          extensionState: 'not_started',
          extensionFormName: 'Form 4868',
          paymentState: 'estimate_needed',
          efileState: 'authorization_requested',
        }),
        expect.objectContaining({
          taxType: 'federal_1040_extension',
          obligationType: 'client_action',
          formName: 'Form 4868',
          filingDueDate: new Date('2026-04-15T00:00:00.000Z'),
          paymentDueDate: new Date('2026-04-15T00:00:00.000Z'),
          extensionState: 'ready_to_file',
          paymentState: 'estimate_needed',
        }),
      ]),
    )
  })
})
