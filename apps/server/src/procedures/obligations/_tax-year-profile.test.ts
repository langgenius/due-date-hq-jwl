import { describe, expect, it } from 'vitest'
import type { ClientRow } from '@duedatehq/ports/clients'
import type { ObligationInstanceRow } from '@duedatehq/ports/obligations'
import { resolveUpdatedTaxYearProfilePlan } from './_tax-year-profile'

const FIRM_ID = 'firm_123'
const CLIENT_ID = '22222222-2222-4222-8222-222222222222'
const ROW_ID = '11111111-1111-4111-8111-111111111111'

function iso(value: Date | null): string | null {
  return value?.toISOString().slice(0, 10) ?? null
}

function makeClient(overrides: Partial<ClientRow> = {}): ClientRow {
  const now = new Date('2026-05-20T00:00:00.000Z')
  return {
    id: CLIENT_ID,
    firmId: FIRM_ID,
    name: 'S Corp Demo',
    ein: null,
    state: 'CA',
    county: null,
    entityType: 's_corp',
    legalEntity: null,
    taxClassification: 's_corp',
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
    migrationBatchId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

function makeRow(overrides: Partial<ObligationInstanceRow> = {}): ObligationInstanceRow {
  const now = new Date('2026-05-20T00:00:00.000Z')
  return {
    id: ROW_ID,
    firmId: FIRM_ID,
    confirmed: true,
    clientId: CLIENT_ID,
    clientFilingProfileId: null,
    taxType: 'federal_1120s',
    taxYear: 2026,
    taxYearType: 'calendar',
    fiscalYearEndMonth: null,
    fiscalYearEndDay: null,
    taxPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
    taxPeriodEnd: new Date('2026-12-31T00:00:00.000Z'),
    taxPeriodKind: 'calendar',
    taxPeriodSource: 'client_default',
    taxPeriodReviewReason: null,
    ruleId: 'fed.1120s.return.2025',
    ruleVersion: 1,
    rulePeriod: 'annual',
    generationSource: 'manual',
    jurisdiction: 'FED',
    obligationType: 'filing',
    formName: 'Form 1120-S',
    authority: 'IRS',
    filingDueDate: new Date('2026-03-16T00:00:00.000Z'),
    paymentDueDate: new Date('2026-03-16T00:00:00.000Z'),
    sourceEvidenceJson: null,
    recurrence: 'annual',
    riskLevel: 'med',
    baseDueDate: new Date('2026-03-16T00:00:00.000Z'),
    currentDueDate: new Date('2026-03-02T00:00:00.000Z'),
    status: 'pending',
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
    paymentState: 'estimate_needed',
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
    penaltyBreakdownJson: [],
    penaltyFormulaVersion: null,
    missingPenaltyFactsJson: [],
    penaltySourceRefsJson: [],
    penaltyFormulaLabel: null,
    exposureCalculatedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('resolveUpdatedTaxYearProfilePlan', () => {
  it('syncs internal, filing, and payment deadlines from the obligation tax period', () => {
    const plan = resolveUpdatedTaxYearProfilePlan({
      row: makeRow(),
      client: makeClient(),
      taxYearType: 'fiscal',
      fiscalYearEndMonth: 9,
      fiscalYearEndDay: 30,
      internalDeadlineOffsetDays: 14,
    })

    expect(plan).not.toBeNull()
    expect(iso(plan?.taxPeriodStart ?? null)).toBe('2025-10-01')
    expect(iso(plan?.taxPeriodEnd ?? null)).toBe('2026-09-30')
    expect(iso(plan?.baseDueDate ?? null)).toBe('2026-12-15')
    expect(iso(plan?.currentDueDate ?? null)).toBe('2026-12-01')
    expect(iso(plan?.filingDueDate ?? null)).toBe('2026-12-15')
    expect(iso(plan?.paymentDueDate ?? null)).toBe('2026-12-15')
  })

  it('also recalculates all deadlines when switching back to calendar year', () => {
    const plan = resolveUpdatedTaxYearProfilePlan({
      row: makeRow({
        taxYearType: 'fiscal',
        fiscalYearEndMonth: 9,
        fiscalYearEndDay: 30,
      }),
      client: makeClient(),
      taxYearType: 'calendar',
      fiscalYearEndMonth: null,
      fiscalYearEndDay: null,
      internalDeadlineOffsetDays: 14,
    })

    expect(plan).not.toBeNull()
    expect(iso(plan?.taxPeriodStart ?? null)).toBe('2025-01-01')
    expect(iso(plan?.taxPeriodEnd ?? null)).toBe('2025-12-31')
    expect(iso(plan?.baseDueDate ?? null)).toBe('2026-03-16')
    expect(iso(plan?.currentDueDate ?? null)).toBe('2026-03-02')
    expect(iso(plan?.filingDueDate ?? null)).toBe('2026-03-16')
    expect(iso(plan?.paymentDueDate ?? null)).toBe('2026-03-16')
  })

  it('falls back to verified rule matching for legacy demo rows without rule ids', () => {
    const plan = resolveUpdatedTaxYearProfilePlan({
      row: makeRow({ ruleId: null, jurisdiction: 'CA' }),
      client: makeClient(),
      taxYearType: 'calendar',
      fiscalYearEndMonth: null,
      fiscalYearEndDay: null,
      internalDeadlineOffsetDays: 14,
    })

    expect(plan).not.toBeNull()
    expect(iso(plan?.taxPeriodStart ?? null)).toBe('2025-01-01')
    expect(iso(plan?.taxPeriodEnd ?? null)).toBe('2025-12-31')
    expect(iso(plan?.baseDueDate ?? null)).toBe('2026-03-16')
  })

  it('refuses to build a deadline patch without a matching source rule', () => {
    expect(
      resolveUpdatedTaxYearProfilePlan({
        row: makeRow({ ruleId: null, taxType: 'unknown_tax_type' }),
        client: makeClient(),
        taxYearType: 'calendar',
        fiscalYearEndMonth: null,
        fiscalYearEndDay: null,
        internalDeadlineOffsetDays: 14,
      }),
    ).toBeNull()
  })
})
