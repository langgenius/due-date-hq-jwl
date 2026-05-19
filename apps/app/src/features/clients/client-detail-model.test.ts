import { describe, expect, it } from 'vitest'
import type { ClientPublic, ObligationInstancePublic, PulseDetail } from '@duedatehq/contracts'

import {
  buildClientContactPlan,
  buildClientPulseMatches,
  buildClientWorkPlanSummary,
} from './client-detail-model'

function obligation(overrides: Partial<ObligationInstancePublic> = {}): ObligationInstancePublic {
  return {
    id: 'obligation_1',
    firmId: 'firm_1',
    clientId: 'client_1',
    clientFilingProfileId: null,
    taxType: 'CA Form 100',
    taxYear: 2026,
    ruleId: null,
    ruleVersion: null,
    rulePeriod: null,
    generationSource: 'migration',
    jurisdiction: 'CA',
    obligationType: 'filing',
    formName: 'Form 100',
    authority: 'CA FTB',
    filingDueDate: '2026-04-15',
    paymentDueDate: null,
    sourceEvidence: null,
    recurrence: 'annual',
    riskLevel: 'low',
    baseDueDate: '2026-04-15',
    currentDueDate: '2026-04-15',
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
    penaltyBreakdown: [],
    missingPenaltyFacts: [],
    penaltySourceRefs: [],
    penaltyFormulaLabel: null,
    penaltyFactsVersion: null,
    accruedPenaltyCents: null,
    accruedPenaltyStatus: 'unsupported',
    accruedPenaltyBreakdown: [],
    penaltyAsOfDate: '2026-05-12',
    penaltyFormulaVersion: null,
    exposureCalculatedAt: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  }
}

function client(overrides: Partial<ClientPublic> = {}): ClientPublic {
  return {
    id: 'client_1',
    firmId: 'firm_1',
    name: 'Acme LLC',
    ein: '12-3456789',
    state: 'CA',
    county: 'Alameda',
    entityType: 'llc',
    legalEntity: 'multi_member_llc',
    taxClassification: 'partnership',
    taxYearType: 'calendar',
    fiscalYearEndMonth: null,
    fiscalYearEndDay: null,
    email: 'owner@example.com',
    notes: null,
    assigneeId: 'user_1',
    assigneeName: 'Casey',
    ownerCount: 2,
    hasForeignAccounts: false,
    hasPayroll: false,
    hasSalesTax: false,
    has1099Vendors: true,
    hasK1Activity: true,
    primaryContactName: 'Owner Example',
    primaryContactEmail: 'owner@example.com',
    importanceWeight: 2,
    lateFilingCountLast12mo: 0,
    estimatedTaxLiabilityCents: 1200000,
    estimatedTaxLiabilitySource: 'manual',
    equityOwnerCount: null,
    migrationBatchId: null,
    filingProfiles: [],
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  }
}

function pulseDetail(overrides: Partial<PulseDetail> = {}): PulseDetail {
  return {
    alert: {
      id: 'alert_1',
      pulseId: 'pulse_1',
      status: 'matched',
      sourceStatus: 'approved',
      title: 'CA disaster relief',
      source: 'CA FTB',
      sourceUrl: 'https://example.com/source',
      summary: 'Deadline moved.',
      publishedAt: '2026-05-01T00:00:00.000Z',
      matchedCount: 1,
      needsReviewCount: 0,
      confidence: 0.92,
      isSample: false,
    },
    jurisdiction: 'CA',
    counties: ['Alameda'],
    forms: ['CA Form 100'],
    entityTypes: ['llc'],
    originalDueDate: '2026-04-15',
    newDueDate: '2026-06-15',
    effectiveFrom: null,
    sourceExcerpt: 'Official extension.',
    reviewedAt: null,
    affectedClients: [
      {
        obligationId: 'obligation_1',
        clientId: 'client_1',
        clientName: 'Acme LLC',
        state: 'CA',
        county: 'Alameda',
        entityType: 'llc',
        taxType: 'CA Form 100',
        currentDueDate: '2026-04-15',
        newDueDate: '2026-06-15',
        status: 'pending',
        matchStatus: 'eligible',
        reason: null,
      },
    ],
    ...overrides,
  }
}

describe('client detail model', () => {
  it('summarizes filing and payment work from client obligations', () => {
    expect(
      buildClientWorkPlanSummary(
        [
          obligation({
            id: 'overdue',
            currentDueDate: '2026-05-01',
            estimatedExposureCents: 15000,
            estimatedTaxDueCents: 50000,
            exposureStatus: 'ready',
          }),
          obligation({
            id: 'review',
            currentDueDate: '2026-05-20',
            status: 'review',
            readiness: 'needs_review',
            estimatedExposureCents: 25000,
            exposureStatus: 'ready',
          }),
          obligation({ id: 'closed', status: 'done', estimatedExposureCents: 999999 }),
        ],
        '2026-05-12',
      ),
    ).toMatchObject({
      openCount: 2,
      overdueOpenCount: 1,
      needsReviewCount: 1,
      projectedExposureCents: 40000,
      exposureNeedsInputCount: 0,
      estimatedTaxDueCents: 50000,
      paymentTrackCount: 2,
      nextDueDate: '2026-05-01',
    })
  })

  it('keeps Pulse matches scoped to the selected client', () => {
    const matches = buildClientPulseMatches(
      [
        pulseDetail(),
        pulseDetail({
          alert: {
            ...pulseDetail().alert,
            id: 'alert_2',
            publishedAt: '2026-05-02T00:00:00.000Z',
          },
          affectedClients: [
            {
              ...pulseDetail().affectedClients[0]!,
              clientId: 'client_2',
              obligationId: 'obligation_2',
            },
          ],
        }),
      ],
      'client_1',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      alertId: 'alert_1',
      taxType: 'CA Form 100',
      status: 'eligible',
      newDueDate: '2026-06-15',
    })
  })

  it('marks the currently missing fallback contact boundary explicitly', () => {
    expect(buildClientContactPlan(client({ email: null, assigneeName: null }))).toEqual({
      primaryContact: null,
      internalOwner: null,
      missing: ['primary_contact', 'internal_owner', 'fallback_contact'],
    })
  })
})
