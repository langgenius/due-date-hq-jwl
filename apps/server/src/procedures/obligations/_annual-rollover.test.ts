import { describe, expect, it, vi } from 'vitest'
import type { ObligationRule } from '@duedatehq/core/rules'
import type { ClientRow } from '@duedatehq/ports/clients'
import type { ObligationCreateInput, ObligationInstanceRow } from '@duedatehq/ports/obligations'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import { runAnnualRollover } from './_annual-rollover'

const FIRM_ID = 'firm_123'
const USER_ID = 'user_123'
const CLIENT_ID = '22222222-2222-4222-8222-222222222222'

function makeClient(overrides: Partial<ClientRow> = {}): ClientRow {
  const now = new Date('2026-05-04T00:00:00.000Z')
  return {
    id: CLIENT_ID,
    firmId: FIRM_ID,
    name: 'Acme LLC',
    ein: null,
    state: 'CA',
    county: null,
    entityType: 'llc',
    legalEntity: 'multi_member_llc',
    taxClassification: 'partnership',
    taxYearType: 'calendar',
    fiscalYearEndMonth: null,
    fiscalYearEndDay: null,
    email: null,
    notes: null,
    assigneeId: null,
    assigneeName: null,
    ownerCount: 2,
    hasForeignAccounts: false,
    hasPayroll: false,
    hasSalesTax: false,
    has1099Vendors: false,
    hasK1Activity: true,
    primaryContactName: null,
    primaryContactEmail: null,
    importanceWeight: 3,
    lateFilingCountLast12mo: 0,
    estimatedTaxLiabilityCents: 250_000,
    estimatedTaxLiabilitySource: 'manual',
    equityOwnerCount: 2,
    migrationBatchId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

function makeSeed(overrides: Partial<ObligationInstanceRow> = {}): ObligationInstanceRow {
  const now = new Date('2026-05-04T00:00:00.000Z')
  const due = new Date('2026-04-15T00:00:00.000Z')
  return {
    id: '11111111-1111-4111-8111-111111111111',
    firmId: FIRM_ID,
    clientId: CLIENT_ID,
    clientFilingProfileId: null,
    taxType: 'ca_100',
    taxYear: 2025,
    taxYearType: 'calendar',
    fiscalYearEndMonth: null,
    fiscalYearEndDay: null,
    taxPeriodStart: new Date('2025-01-01T00:00:00.000Z'),
    taxPeriodEnd: new Date('2025-12-31T00:00:00.000Z'),
    taxPeriodKind: 'calendar',
    taxPeriodSource: 'client_default',
    taxPeriodReviewReason: null,
    ruleId: null,
    ruleVersion: null,
    rulePeriod: null,
    generationSource: null,
    jurisdiction: 'CA',
    obligationType: 'filing',
    formName: 'Form 100',
    authority: 'CA FTB',
    filingDueDate: due,
    paymentDueDate: null,
    sourceEvidenceJson: null,
    recurrence: 'annual',
    riskLevel: 'med',
    baseDueDate: due,
    currentDueDate: due,
    status: 'paid',
    blockedByObligationInstanceId: null,
    readiness: 'ready',
    extensionDecision: 'not_considered',
    extensionMemo: null,
    extensionSource: null,
    extensionExpectedDueDate: null,
    extensionDecidedAt: null,
    extensionDecidedByUserId: null,
    extensionState: 'not_started',
    extensionFormName: null,
    extensionFiledAt: null,
    extensionAcceptedAt: null,
    prepStage: 'not_started',
    reviewStage: 'not_required',
    reviewerUserId: null,
    reviewCompletedAt: null,
    paymentState: 'not_applicable',
    paymentConfirmedAt: null,
    efileState: 'not_applicable',
    efileAuthorizationForm: null,
    efileSubmittedAt: null,
    efileAcceptedAt: null,
    efileRejectedAt: null,
    migrationBatchId: null,
    estimatedTaxDueCents: null,
    estimatedExposureCents: null,
    exposureStatus: 'needs_input',
    penaltyFactsJson: null,
    penaltyFactsVersion: null,
    penaltyBreakdownJson: null,
    penaltyFormulaVersion: null,
    missingPenaltyFactsJson: null,
    penaltySourceRefsJson: null,
    penaltyFormulaLabel: null,
    exposureCalculatedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeRule(overrides: Partial<ObligationRule> = {}): ObligationRule {
  return {
    id: 'ca_100_2027',
    title: 'CA Form 100 annual filing',
    jurisdiction: 'CA',
    entityApplicability: ['llc', 'c_corp', 's_corp'],
    taxType: 'ca_100',
    formName: 'Form 100',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    taxYear: 2026,
    applicableYear: 2027,
    ruleTier: 'annual_rolling',
    status: 'verified',
    coverageStatus: 'full',
    riskLevel: 'med',
    requiresApplicabilityReview: false,
    dueDateLogic: {
      kind: 'fixed_date',
      date: '2027-04-15',
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: true,
      durationMonths: 6,
      paymentExtended: false,
      notes: 'Extension available; payment not extended.',
    },
    sourceIds: ['ca-ftb-100'],
    evidence: [
      {
        sourceId: 'ca-ftb-100',
        authorityRole: 'basis',
        locator: { kind: 'html', heading: 'Due dates' },
        summary: 'CA Form 100 due date',
        sourceExcerpt: 'File by the 15th day of the fourth month.',
        retrievedAt: '2026-04-27',
      },
    ],
    defaultTip: 'Confirm annual filing readiness before the due date.',
    quality: {
      filingPaymentDistinguished: true,
      extensionHandled: true,
      calendarFiscalSpecified: true,
      holidayRolloverHandled: true,
      crossVerified: true,
      exceptionChannel: true,
    },
    verifiedBy: 'practice-owner',
    verifiedAt: '2026-04-27',
    nextReviewOn: '2026-11-15',
    version: 3,
    ...overrides,
  }
}

function makeScoped(input: {
  seeds?: ObligationInstanceRow[]
  clients?: ClientRow[]
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
    ids: rows.map((_, index) => `ev_${index}`),
  }))
  const writeAudit = vi.fn(async () => ({ id: 'audit_1' }))
  const obligations = {
    listAnnualRolloverSeeds: vi.fn(async () => input.seeds ?? [makeSeed()]),
    listGeneratedByClientAndTaxYears: vi.fn(async () => input.duplicates ?? []),
    createBatch: vi.fn(async (rows: ObligationCreateInput[]) => {
      createdInputs.push(...rows)
      return { ids: rows.map((_, index) => `created_${index + 1}`) }
    }),
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- focused service test double implements only repos used by annual rollover.
  const scoped = {
    firmId: FIRM_ID,
    clients: {
      findManyByIds: vi.fn(async () => input.clients ?? [makeClient()]),
    },
    obligations,
    rules: {
      listActivePracticeRules: vi.fn(async () => []),
      listVerified: vi.fn(async () => []),
    },
    evidence: {
      writeBatch: writeEvidenceBatch,
    },
    audit: {
      write: writeAudit,
    },
  } as unknown as ScopedRepo
  return { scoped, obligations, createdInputs, writeEvidenceBatch, writeAudit }
}

describe('runAnnualRollover', () => {
  it('creates pending and review obligations from verified target-year rules', async () => {
    const reviewRule = makeRule({
      id: 'ca_llc_fee_2027',
      title: 'CA LLC estimated fee',
      taxType: 'ca_llc_estimated_fee',
      formName: 'Form 3536',
      requiresApplicabilityReview: true,
    })
    const { scoped, createdInputs, writeAudit, writeEvidenceBatch } = makeScoped({
      seeds: [
        makeSeed({ taxType: 'ca_100' }),
        makeSeed({ id: '11111111-1111-4111-8111-111111111112', taxType: 'ca_llc_estimated_fee' }),
      ],
    })

    const result = await runAnnualRollover({
      scoped,
      userId: USER_ID,
      params: { sourceFilingYear: 2026, targetFilingYear: 2027 },
      mode: 'create',
      rules: [makeRule(), reviewRule],
      now: new Date('2026-05-04T00:00:00.000Z'),
    })

    expect(result.summary).toMatchObject({
      seedObligationCount: 2,
      willCreateCount: 1,
      reviewCount: 1,
      createdCount: 2,
    })
    expect(createdInputs.map((row) => row.status)).toEqual(['pending', 'review'])
    expect(createdInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'ca_100_2027',
          ruleVersion: 3,
          rulePeriod: 'default',
          generationSource: 'annual_rollover',
        }),
        expect.objectContaining({
          ruleId: 'ca_llc_fee_2027',
          status: 'review',
          generationSource: 'annual_rollover',
        }),
      ]),
    )
    expect(writeEvidenceBatch).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ sourceType: 'verified_rule' })]),
    )
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'obligation.annual_rollover.created',
        after: expect.objectContaining({ createdCount: 2 }),
      }),
    )
  })

  it('rolls fiscal source periods forward before calculating target deadlines', async () => {
    const fiscalRule = makeRule({
      id: 'fed.1120s.return.2025',
      title: 'Federal Form 1120-S return for S corporations',
      jurisdiction: 'FED',
      taxType: 'federal_1120s',
      formName: 'Form 1120-S',
      taxYear: 2025,
      applicableYear: 2026,
      dueDateLogic: {
        kind: 'nth_day_after_tax_year_end',
        monthOffset: 3,
        day: 15,
        holidayRollover: 'next_business_day',
      },
    })
    const { scoped, createdInputs } = makeScoped({
      clients: [makeClient({ entityType: 's_corp', taxClassification: 's_corp' })],
      seeds: [
        makeSeed({
          taxType: 'federal_1120s',
          jurisdiction: 'FED',
          taxPeriodStart: new Date('2024-07-01T00:00:00.000Z'),
          taxPeriodEnd: new Date('2025-06-30T00:00:00.000Z'),
          taxPeriodKind: 'fiscal',
          taxPeriodSource: 'manual_cpa_confirmed',
          baseDueDate: new Date('2025-09-15T00:00:00.000Z'),
        }),
      ],
    })

    const result = await runAnnualRollover({
      scoped,
      userId: USER_ID,
      params: { sourceFilingYear: 2025, targetFilingYear: 2026 },
      mode: 'create',
      rules: [fiscalRule],
      now: new Date('2026-05-04T00:00:00.000Z'),
    })

    expect(result.summary.createdCount).toBe(1)
    expect(createdInputs).toEqual([
      expect.objectContaining({
        baseDueDate: new Date('2026-09-15T00:00:00.000Z'),
        taxPeriodStart: new Date('2025-07-01T00:00:00.000Z'),
        taxPeriodEnd: new Date('2026-06-30T00:00:00.000Z'),
        taxPeriodKind: 'fiscal',
        taxPeriodSource: 'prior_obligation',
      }),
    ])
  })

  it('skips duplicate target obligations by rule id, tax year, and period', async () => {
    const { scoped, obligations } = makeScoped({
      duplicates: [
        {
          id: 'existing_obligation',
          clientId: CLIENT_ID,
          jurisdiction: 'CA',
          ruleId: 'ca_100_2027',
          taxYear: 2026,
          rulePeriod: 'default',
        },
      ],
    })

    const result = await runAnnualRollover({
      scoped,
      userId: USER_ID,
      params: { sourceFilingYear: 2026, targetFilingYear: 2027 },
      mode: 'create',
      rules: [makeRule()],
    })

    expect(result.summary.duplicateCount).toBe(1)
    expect(result.rows[0]).toMatchObject({
      disposition: 'duplicate',
      duplicateObligationId: 'existing_obligation',
    })
    expect(obligations.createBatch).not.toHaveBeenCalled()
  })

  it('skips source buckets without verified target-year rules', async () => {
    const { scoped } = makeScoped({})

    const result = await runAnnualRollover({
      scoped,
      userId: USER_ID,
      params: { sourceFilingYear: 2026, targetFilingYear: 2027 },
      mode: 'preview',
      rules: [makeRule({ status: 'candidate' })],
    })

    expect(result.summary.skippedCount).toBe(1)
    expect(result.rows[0]).toMatchObject({
      disposition: 'missing_verified_rule',
      skippedReason: 'no_verified_rule_for_target_year',
    })
  })

  it('expands period-table rules into independent target rows', async () => {
    const rule = makeRule({
      dueDateLogic: {
        kind: 'period_table',
        frequency: 'quarterly',
        holidayRollover: 'source_adjusted',
        periods: [
          { period: 'Q1', dueDate: '2027-04-15' },
          { period: 'Q2', dueDate: '2027-06-15' },
        ],
      },
    })
    const { scoped } = makeScoped({})

    const result = await runAnnualRollover({
      scoped,
      userId: USER_ID,
      params: { sourceFilingYear: 2026, targetFilingYear: 2027 },
      mode: 'preview',
      rules: [rule],
    })

    expect(result.summary.willCreateCount).toBe(2)
    expect(result.rows.map((row) => row.preview?.period)).toEqual(['Q1', 'Q2'])
  })
})
