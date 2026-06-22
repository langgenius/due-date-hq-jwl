import { describe, expect, it, vi } from 'vitest'
import type { ObligationRule } from '@duedatehq/core/rules'
import type { ClientRow } from '@duedatehq/ports/clients'
import type { ObligationInstanceRow } from '@duedatehq/ports/obligations'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import { runReprojection } from './_reprojection'

const FIRM_ID = 'firm_1'
const USER_ID = 'user_1'
const CLIENT_ID = '22222222-2222-4222-8222-222222222222'
const OB_ID = '11111111-1111-4111-8111-111111111111'
const RULE_ID = 'fed_test_2023'

function makeClient(): ClientRow {
  const now = new Date('2026-06-02T00:00:00.000Z')
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
    externalClientId: null,
    addressLine1: null,
    city: null,
    postalCode: null,
    primaryPhone: null,
    sourceStatus: null,
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
  }
}

// fixed_date rule for 2023-04-15 with weekend/holiday rollover. April 15, 2023 is a
// Saturday and DC Emancipation Day (Apr 16, Sun) is observed Monday Apr 17, so the
// statutory date rolls to 2023-04-18.
function makeRule(overrides: Partial<ObligationRule> = {}): ObligationRule {
  return {
    id: RULE_ID,
    title: 'Federal test filing',
    jurisdiction: 'FED',
    entityApplicability: ['llc', 'partnership'],
    taxType: 'federal_1040',
    formName: 'Form 1040',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    taxYear: 2022,
    applicableYear: 2023,
    ruleTier: 'annual_rolling',
    status: 'verified',
    coverageStatus: 'full',
    riskLevel: 'med',
    requiresApplicabilityReview: false,
    dueDateLogic: {
      kind: 'fixed_date',
      date: '2023-04-15',
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      durationMonths: 6,
      paymentExtended: false,
      notes: 'Extension available; payment not extended.',
    },
    sourceIds: ['fed-test'],
    evidence: [
      {
        sourceId: 'fed-test',
        authorityRole: 'basis',
        locator: { kind: 'html', heading: 'Due dates' },
        summary: 'Federal due date',
        sourceExcerpt: 'File by April 15.',
        retrievedAt: '2026-04-27',
      },
    ],
    defaultTip: 'Confirm filing readiness before the due date.',
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
    version: 1,
    ...overrides,
  }
}

function makeCandidate(overrides: Partial<ObligationInstanceRow> = {}): ObligationInstanceRow {
  const now = new Date('2026-06-02T00:00:00.000Z')
  // Stored at the un-adjusted 2023-04-15; re-projection should roll it to 2023-04-18.
  const stored = new Date('2023-04-15T00:00:00.000Z')
  return {
    id: OB_ID,
    firmId: FIRM_ID,
    clientId: CLIENT_ID,
    clientFilingProfileId: null,
    taxType: 'federal_1040',
    taxYear: 2023,
    taxYearType: 'calendar',
    fiscalYearEndMonth: null,
    fiscalYearEndDay: null,
    taxPeriodStart: new Date('2022-01-01T00:00:00.000Z'),
    taxPeriodEnd: new Date('2022-12-31T00:00:00.000Z'),
    taxPeriodKind: 'calendar',
    taxPeriodSource: 'client_default',
    taxPeriodReviewReason: null,
    ruleId: RULE_ID,
    ruleVersion: 1,
    rulePeriod: 'default',
    generationSource: 'annual_rollover',
    jurisdiction: 'FED',
    obligationType: 'filing',
    formName: 'Form 1040',
    authority: 'IRS',
    filingDueDate: stored,
    paymentDueDate: null,
    sourceEvidenceJson: null,
    recurrence: 'annual',
    riskLevel: 'med',
    baseDueDate: stored,
    currentDueDate: stored,
    status: 'pending',
    confirmed: false,
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
    assigneeId: null,
    snoozedUntil: null,
    isPinned: false,
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

function makeScoped(candidate: ObligationInstanceRow) {
  const updateProjectedDueDates = vi.fn(async () => {})
  const writeAudit = vi.fn(async () => ({ id: 'audit_1' }))
  const listReprojectionCandidates = vi.fn(async () => [candidate])
  const scoped = {
    firmId: FIRM_ID,
    obligations: { listReprojectionCandidates, updateProjectedDueDates },
    clients: { findManyByIds: vi.fn(async () => [makeClient()]) },
    audit: { write: writeAudit },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- focused double.
  } as unknown as ScopedRepo
  return { scoped, updateProjectedDueDates, writeAudit, listReprojectionCandidates }
}

describe('runReprojection', () => {
  it('detects a drifted projected deadline in preview without writing', async () => {
    const { scoped, updateProjectedDueDates } = makeScoped(makeCandidate())
    const result = await runReprojection({
      scoped,
      userId: USER_ID,
      mode: 'preview',
      params: { targetFilingYear: 2023 },
      rules: [makeRule()],
    })

    expect(result.summary).toMatchObject({ candidateCount: 1, changedCount: 1, willUpdateCount: 1 })
    expect(result.rows[0]).toMatchObject({
      disposition: 'will_update',
      oldBaseDueDate: '2023-04-15',
      newBaseDueDate: '2023-04-18',
      updated: false,
    })
    expect(updateProjectedDueDates).not.toHaveBeenCalled()
  })

  it('rewrites projected dates in place and audits on apply', async () => {
    const { scoped, updateProjectedDueDates, writeAudit } = makeScoped(makeCandidate())
    const result = await runReprojection({
      scoped,
      userId: USER_ID,
      mode: 'apply',
      params: { targetFilingYear: 2023 },
      rules: [makeRule()],
    })

    expect(result.summary.updatedCount).toBe(1)
    expect(result.rows[0]).toMatchObject({ disposition: 'will_update', updated: true })
    expect(updateProjectedDueDates).toHaveBeenCalledWith([
      expect.objectContaining({ id: OB_ID, baseDueDate: new Date('2023-04-18T00:00:00.000Z') }),
    ])
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'obligation.reprojected' }),
    )
  })

  it('reports confirmed drift as requires_review and never mutates it', async () => {
    const { scoped, updateProjectedDueDates } = makeScoped(makeCandidate({ confirmed: true }))
    const result = await runReprojection({
      scoped,
      userId: USER_ID,
      mode: 'apply',
      params: {},
      rules: [makeRule()],
    })

    expect(result.summary).toMatchObject({ requiresReviewCount: 1, updatedCount: 0 })
    expect(result.rows[0]).toMatchObject({
      disposition: 'requires_review',
      newBaseDueDate: '2023-04-18',
      updated: false,
    })
    expect(updateProjectedDueDates).not.toHaveBeenCalled()
  })

  it('emits nothing when the stored date already matches the recomputed date', async () => {
    const { scoped } = makeScoped(
      makeCandidate({ baseDueDate: new Date('2023-04-18T00:00:00.000Z') }),
    )
    const result = await runReprojection({
      scoped,
      userId: USER_ID,
      mode: 'preview',
      params: {},
      rules: [makeRule()],
    })

    expect(result.summary.changedCount).toBe(0)
    expect(result.rows).toHaveLength(0)
  })
})
