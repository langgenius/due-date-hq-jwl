import { describe, expect, it } from 'vitest'
import { appContract } from './index'
import {
  AUDIT_SEARCH_MAX_LENGTH,
  AuditActionCategorySchema,
  AuditEventPublicSchema,
  AuditListInputSchema,
  auditContract,
} from './audit'
import { ErrorCodes } from './errors'
import {
  FirmBillingCheckoutConfigSchema,
  FirmBillingSubscriptionPublicSchema,
  FirmCreateInputSchema,
  FirmPlanSchema,
  FirmPublicSchema,
  FirmSmartPriorityPreviewInputSchema,
  FirmSmartPriorityPreviewOutputSchema,
  FirmUpdateInputSchema,
  US_FIRM_TIMEZONE_OPTIONS,
  USFirmTimezoneSchema,
  firmsContract,
} from './firms'
import { SMART_PRIORITY_DEFAULT_PROFILE, SmartPriorityProfileSchema } from './priority'
import {
  ClientBulkAssigneeUpdateInputSchema,
  ClientBulkAssigneeUpdateOutputSchema,
  ClientDeleteInputSchema,
  ClientDeleteOutputSchema,
  ClientJurisdictionUpdateOutputSchema,
  ClientJurisdictionUpdateSchema,
  ClientSourceDetailsUpdateSchema,
  ClientTaxYearProfileUpdateOutputSchema,
  ClientTaxYearProfileUpdateSchema,
  clientsContract,
} from './clients'
import {
  AnnualRolloverInputSchema,
  AnnualRolloverOutputSchema,
  ObligationBulkStatusUpdateInputSchema,
  ObligationBulkStatusUpdateOutputSchema,
  ObligationCreateFromRuleInputSchema,
  ObligationCreateFromRuleOutputSchema,
  ObligationCreateFromRulesInputSchema,
  ObligationExtensionDecisionInputSchema,
  ObligationMarkFiledRejectedInputSchema,
  ObligationRequestInputInputSchema,
  ObligationRequestInputOutputSchema,
  ObligationTaxYearProfileUpdateInputSchema,
  ObligationTaxYearProfileUpdateOutputSchema,
  ObligationStatusUpdateInputSchema,
  ObligationStatusUpdateOutputSchema,
  obligationsContract,
} from './obligations'
import { ObligationReadinessSchema, ObligationStatusSchema } from './shared/enums'
import { ClientSchema } from './shared/client'
import {
  OBLIGATION_QUEUE_FILTER_MAX_SELECTIONS,
  OBLIGATION_QUEUE_SEARCH_MAX_LENGTH,
  ObligationQueueCreateSavedViewInputSchema,
  ObligationQueueDensitySchema,
  ObligationQueueExportSelectedInputSchema,
  ObligationQueueExportSelectedOutputSchema,
  ObligationQueueFacetsOutputSchema,
  ObligationQueueListInputSchema,
  ObligationQueueOwnerFilterSchema,
  ObligationQueueReadinessSchema,
  ObligationQueueSavedViewSchema,
  ObligationQueueSortSchema,
  ObligationQueueUpdateSavedViewInputSchema,
  obligationQueueContract,
} from './obligation-queue'
import {
  WorkloadLoadInputSchema,
  WorkloadLoadOutputSchema,
  WorkloadWindowMaxDays,
  workloadContract,
} from './workload'
import { ReminderTemplateKindSchema } from './reminders'
import {
  MatrixSelectionSchema,
  MappingTargetSchema,
  MigrationDetectedSourceProductSchema,
  MigrationErrorStageSchema,
  MigrationSourceFileRoleSchema,
  MigrationSourceSchema,
  migrationContract,
} from './migration'
import {
  MemberAssigneeOptionSchema,
  MemberInviteInputSchema,
  MemberManagedRoleSchema,
  MembersListOutputSchema,
  membersContract,
} from './members'
import { NotificationTypeSchema } from './notifications'
import { AuditActionSchema, PulseAuditActionSchema } from './shared/audit-actions'
import { EvidenceSourceTypeSchema } from './shared/evidence-source-types'
import {
  DASHBOARD_FILTER_MAX_SELECTIONS,
  DashboardDueBucketSchema,
  DashboardEvidenceFilterSchema,
  DashboardLoadInputSchema,
  DashboardLoadOutputSchema,
  DashboardSeveritySchema,
  DashboardTriageTabKeySchema,
  dashboardContract,
} from './dashboard'
import {
  OpportunityKindSchema,
  OpportunityListInputSchema,
  OpportunityListOutputSchema,
  opportunitiesContract,
} from './opportunities'
import { EvidencePublicSchema, evidenceContract } from './evidence'
import {
  PulseAffectedClientSchema,
  PulseAlertPublicSchema,
  PulseApplyInputSchema,
  PulseApplyOutputSchema,
  PulseDetailSchema,
  PulseFirmAlertStatusSchema,
  PulseListAlertsInputSchema,
  PulseReviewDueDateOverlayDetailsInputSchema,
  PulseRequestReviewInputSchema,
  PulseRequestReviewOutputSchema,
  pulseContract,
} from './pulse'
import {
  ObligationRuleSchema,
  ObligationGenerationPreviewSchema,
  RuleConcreteDraftSchema,
  RuleBulkAcceptSkipSchema,
  RuleOnboardingActivationInputSchema,
  RuleOnboardingActivationOutputSchema,
  RuleGenerationPreviewInputSchema,
  RuleCoverageRowSchema,
  RuleSourceSchema,
  RuleVerifyCandidateInputSchema,
  TemporaryRuleSchema,
  rulesContract,
} from './rules'
import {
  ClientReadinessRequestPublicSchema,
  ReadinessChecklistItemSchema,
  ReadinessSendRequestInputSchema,
} from './readiness'

describe('@duedatehq/contracts', () => {
  it('freezes audit.list read contract', () => {
    expect(Object.keys(appContract)).toEqual(expect.arrayContaining(['audit']))
    expect(Object.keys(auditContract)).toEqual([
      'list',
      'requestEvidencePackage',
      'getEvidencePackage',
      'listEvidencePackages',
      'createDownloadUrl',
    ])
    expect(AuditActionCategorySchema.options).toEqual([
      'client',
      'obligation',
      'migration',
      'rules',
      'auth',
      'team',
      'pulse',
      'opportunity',
      'export',
      'ai',
      'system',
    ])

    const input = AuditListInputSchema.parse({
      search: 'status',
      category: 'obligation',
      action: 'obligation.status.updated',
      actorId: 'user_123',
      entityType: 'obligation',
      entityId: '11111111-1111-4111-8111-111111111111',
      range: '7d',
      cursor: null,
      limit: 50,
    })
    expect(input.category).toBe('obligation')
    expect(() =>
      AuditListInputSchema.parse({ search: 'x'.repeat(AUDIT_SEARCH_MAX_LENGTH + 1) }),
    ).toThrow()

    const event = AuditEventPublicSchema.parse({
      id: '33333333-3333-4333-8333-333333333333',
      firmId: 'firm_123',
      actorId: null,
      actorLabel: null,
      actorType: 'system',
      previousActorType: null,
      aiEventMetadata: null,
      entityType: 'migration_batch',
      entityId: 'batch_123',
      action: 'migration.imported',
      beforeJson: { status: 'reviewing' },
      afterJson: { status: 'applied' },
      reason: null,
      ipHash: null,
      userAgentHash: null,
      createdAt: '2026-04-28T00:00:00.000Z',
    })
    expect(event.actorId).toBeNull()
    expect(event.actorType).toBe('system')
  })

  it('keeps shared error codes stable', () => {
    expect(ErrorCodes.TENANT_MISSING).toBe('TENANT_MISSING')
    expect(ErrorCodes.GUARD_REJECTED).toBe('GUARD_REJECTED')
    expect(ErrorCodes.MEMBER_SEAT_LIMIT).toBe('MEMBER_SEAT_LIMIT')
    expect(ErrorCodes.FIRM_LIMIT_EXCEEDED).toBe('FIRM_LIMIT_EXCEEDED')
  })

  it('freezes firm timezone and subscription contracts', () => {
    expect(Object.keys(appContract)).toEqual(expect.arrayContaining(['firms']))
    expect(Object.keys(firmsContract)).toEqual([
      'listMine',
      'getCurrent',
      'create',
      'switchActive',
      'updateCurrent',
      'previewSmartPriorityProfile',
      'listSubscriptions',
      'billingCheckoutConfig',
      'softDeleteCurrent',
    ])

    expect(US_FIRM_TIMEZONE_OPTIONS.map((option) => option.value)).toEqual(
      USFirmTimezoneSchema.options,
    )
    expect(USFirmTimezoneSchema.options).toEqual(
      expect.arrayContaining([
        'America/New_York',
        'America/Adak',
        'Pacific/Honolulu',
        'America/Puerto_Rico',
        'Pacific/Guam',
        'Pacific/Pago_Pago',
        'Pacific/Wake',
      ]),
    )
    expect(USFirmTimezoneSchema.options).not.toContain('Pacific/Johnston')
    expect(FirmPlanSchema.options).toEqual(['solo', 'pro', 'team', 'firm'])
    expect(() =>
      FirmUpdateInputSchema.parse({ name: 'Bright CPA', timezone: 'Europe/London' }),
    ).toThrow()
    expect(
      FirmUpdateInputSchema.parse({
        name: 'Bright CPA',
        timezone: 'America/New_York',
        internalDeadlineOffsetDays: 14,
        smartPriorityProfile: SMART_PRIORITY_DEFAULT_PROFILE,
      }).smartPriorityProfile?.weights.urgency,
    ).toBe(70)
    expect(FirmCreateInputSchema.parse({ name: 'Bright CPA' }).timezone).toBe('America/New_York')
    expect(FirmCreateInputSchema.parse({ name: 'Bright CPA' }).internalDeadlineOffsetDays).toBe(14)
    expect(
      FirmPublicSchema.parse({
        id: 'firm_123',
        name: 'Bright CPA',
        slug: 'bright-cpa',
        plan: 'pro',
        seatLimit: 5,
        timezone: 'America/New_York',
        internalDeadlineOffsetDays: 14,
        status: 'active',
        role: 'owner',
        ownerUserId: 'user_123',
        coordinatorCanSeeDollars: false,
        smartPriorityProfile: SMART_PRIORITY_DEFAULT_PROFILE,
        openObligationCount: 2,
        isCurrent: true,
        createdAt: '2026-04-28T00:00:00.000Z',
        updatedAt: '2026-04-28T00:00:00.000Z',
        deletedAt: null,
      }).smartPriorityProfile?.weights.urgency,
    ).toBe(70)
    expect(
      FirmPublicSchema.parse({
        id: 'firm_123',
        name: 'Bright CPA',
        slug: 'bright-cpa',
        plan: 'pro',
        seatLimit: 5,
        timezone: 'America/New_York',
        internalDeadlineOffsetDays: 14,
        status: 'active',
        role: 'manager',
        ownerUserId: 'user_123',
        coordinatorCanSeeDollars: false,
        smartPriorityProfile: null,
        openObligationCount: 0,
        isCurrent: true,
        createdAt: '2026-04-28T00:00:00.000Z',
        updatedAt: '2026-04-28T00:00:00.000Z',
        deletedAt: null,
      }).smartPriorityProfile,
    ).toBeNull()
    expect(() =>
      SmartPriorityProfileSchema.parse({
        ...SMART_PRIORITY_DEFAULT_PROFILE,
        weights: { ...SMART_PRIORITY_DEFAULT_PROFILE.weights, readiness: 6 },
      }),
    ).toThrow()
    expect(() =>
      SmartPriorityProfileSchema.parse({
        ...SMART_PRIORITY_DEFAULT_PROFILE,
        urgencyWindowDays: 0,
      }),
    ).toThrow()
    expect(
      FirmSmartPriorityPreviewInputSchema.parse({
        smartPriorityProfile: SMART_PRIORITY_DEFAULT_PROFILE,
      }).limit,
    ).toBe(8)
    expect(
      FirmSmartPriorityPreviewOutputSchema.parse({
        asOfDate: '2026-05-03',
        rows: [
          {
            obligationId: 'obligation_1',
            clientName: 'Bright Client',
            taxType: 'federal_1065',
            currentDueDate: '2026-05-10',
            currentScore: 36.3,
            previewScore: 40.1,
            scoreDelta: 3.8,
            currentRank: 2,
            previewRank: 1,
            rankDelta: 1,
          },
        ],
      }).rows[0]?.previewRank,
    ).toBe(1)

    const subscription = FirmBillingSubscriptionPublicSchema.parse({
      id: 'sub_123',
      plan: 'pro',
      referenceId: 'firm_123',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      status: 'active',
      periodStart: null,
      periodEnd: null,
      trialStart: null,
      trialEnd: null,
      cancelAtPeriodEnd: false,
      cancelAt: null,
      canceledAt: null,
      endedAt: null,
      seats: 3,
      billingInterval: 'month',
      stripeScheduleId: null,
      createdAt: '2026-04-28T00:00:00.000Z',
      updatedAt: '2026-04-28T00:00:00.000Z',
    })
    expect(subscription.referenceId).toBe('firm_123')

    const checkoutConfig = FirmBillingCheckoutConfigSchema.parse({
      stripeConfigured: true,
      plans: {
        solo: { monthly: false, yearly: false },
        pro: { monthly: true, yearly: true },
        team: { monthly: true, yearly: false },
      },
    })
    expect(checkoutConfig.plans.team.monthly).toBe(true)
  })

  it('freezes members gateway contracts', () => {
    expect(Object.keys(appContract)).toEqual(expect.arrayContaining(['members']))
    expect(Object.keys(membersContract)).toEqual([
      'listCurrent',
      'listAssignable',
      'invite',
      'cancelInvitation',
      'resendInvitation',
      'updateRole',
      'suspend',
      'reactivate',
      'remove',
    ])
    expect(MemberManagedRoleSchema.options).toEqual([
      'partner',
      'manager',
      'preparer',
      'coordinator',
    ])
    expect(
      MemberInviteInputSchema.parse({ email: 'partner@example.com', role: 'partner' }),
    ).toEqual({
      email: 'partner@example.com',
      role: 'partner',
    })
    expect(() =>
      MemberInviteInputSchema.parse({ email: 'owner@example.com', role: 'owner' }),
    ).toThrow()

    const output = MembersListOutputSchema.parse({
      seatLimit: 5,
      usedSeats: 2,
      availableSeats: 3,
      members: [
        {
          id: 'member_1',
          userId: 'user_1',
          name: 'Alex Chen',
          email: 'alex@example.com',
          image: null,
          role: 'owner',
          status: 'active',
          isCurrentUser: true,
          createdAt: '2026-04-28T00:00:00.000Z',
        },
      ],
      invitations: [
        {
          id: 'invitation_1',
          email: 'maya@example.com',
          role: 'preparer',
          status: 'canceled',
          inviterId: 'user_1',
          expiresAt: '2026-05-05T00:00:00.000Z',
          createdAt: '2026-04-28T00:00:00.000Z',
        },
      ],
    })
    expect(output.availableSeats).toBe(3)

    expect(() =>
      MemberAssigneeOptionSchema.parse({
        assigneeId: 'user_1',
        memberId: 'member_1',
        name: 'Alex Chen',
        email: 'alex@example.com',
        role: 'owner',
      }),
    ).not.toThrow()
  })

  it('validates shared client payloads', () => {
    const parsed = ClientSchema.parse({
      id: '4f3d4f6f-3da3-49d6-b663-28e9b6e7b895',
      firmId: '2b3fe0da-448d-4ae4-a041-f8264bb9c926',
      name: 'Acme Holdings LLC',
      entityType: 'llc',
      state: 'CA',
      ein: null,
      email: null,
      createdAt: '2026-04-23T00:00:00.000Z',
      updatedAt: '2026-04-23T00:00:00.000Z',
    })

    expect(parsed.state).toBe('CA')
  })

  it('keeps the obligation status enum stable (DB authoritative)', () => {
    expect(ObligationStatusSchema.options).toEqual([
      'pending',
      'in_progress',
      'done',
      'extended',
      'paid',
      'waiting_on_client',
      'review',
      'not_applicable',
      // Lifecycle v2 additions — see docs/Design/obligation-lifecycle-design-brief.md.
      'blocked',
      'completed',
    ])
  })

  it('keeps the obligation readiness enum stable', () => {
    expect(ObligationReadinessSchema.options).toEqual(['ready', 'waiting', 'needs_review'])
  })

  it('keeps reminder template kinds stable', () => {
    expect(ReminderTemplateKindSchema.options).toEqual([
      'deadline_reminder',
      'client_deadline_reminder',
      'readiness_request',
    ])
  })

  it('keeps notification types stable', () => {
    expect(NotificationTypeSchema.options).toEqual([
      'deadline_reminder',
      'overdue',
      'client_reminder',
      'pulse_alert',
      'audit_package_ready',
      'internal_request',
      'system',
    ])
  })

  it('allows readiness portal checklist payloads up to thirty items', () => {
    const checklist = Array.from({ length: 30 }, (_, index) => ({
      id: `item_${index}`,
      label: `Document ${index}`,
      description: null,
      reason: null,
      sourceHint: null,
    }))

    expect(ReadinessChecklistItemSchema.array().min(1).max(30).parse(checklist)).toHaveLength(30)
    expect(
      ReadinessSendRequestInputSchema.parse({
        obligationId: '11111111-1111-4111-8111-111111111111',
        checklist,
      }).checklist,
    ).toHaveLength(30)
    expect(
      ClientReadinessRequestPublicSchema.parse({
        id: '22222222-2222-4222-8222-222222222222',
        firmId: 'firm_123',
        obligationInstanceId: '11111111-1111-4111-8111-111111111111',
        clientId: '33333333-3333-4333-8333-333333333333',
        createdByUserId: 'user_1',
        recipientEmail: null,
        status: 'sent',
        checklist,
        portalUrl: null,
        expiresAt: '2026-06-05T00:00:00.000Z',
        sentAt: null,
        firstOpenedAt: null,
        lastRespondedAt: null,
        createdAt: '2026-05-22T00:00:00.000Z',
        updatedAt: '2026-05-22T00:00:00.000Z',
        responses: [],
      }).checklist,
    ).toHaveLength(30)
  })

  it('exposes obligations.updateStatus with before/after audit contract', () => {
    expect(Object.keys(obligationsContract)).toEqual(
      expect.arrayContaining([
        'createBatch',
        'createFromRule',
        'createFromRules',
        'previewAnnualRollover',
        'createAnnualRollover',
        'updateDueDate',
        'updateTaxYearProfile',
        'updateStatus',
        'bulkUpdateStatus',
        'decideExtension',
        'markFiledRejected',
        'requestInput',
        'listByClient',
      ]),
    )

    const parsed = ObligationStatusUpdateInputSchema.parse({
      id: '11111111-1111-4111-8111-111111111111',
      status: 'in_progress',
      reason: 'kicking off this week',
    })
    expect(parsed.status).toBe('in_progress')

    const output = ObligationStatusUpdateOutputSchema.parse({
      obligation: {
        id: '11111111-1111-4111-8111-111111111111',
        firmId: 'firm_123',
        clientId: '22222222-2222-4222-8222-222222222222',
        clientFilingProfileId: null,
        taxType: '1040',
        taxYear: 2026,
        taxYearType: 'calendar',
        fiscalYearEndMonth: null,
        fiscalYearEndDay: null,
        ruleId: null,
        ruleVersion: null,
        rulePeriod: null,
        generationSource: null,
        jurisdiction: 'FED',
        obligationType: 'filing',
        formName: 'Form 1040',
        authority: 'IRS',
        filingDueDate: '2026-04-15',
        paymentDueDate: null,
        sourceEvidence: null,
        recurrence: 'annual',
        riskLevel: 'med',
        baseDueDate: '2026-04-15',
        currentDueDate: '2026-04-15',
        taxPeriodStart: '2026-01-01',
        taxPeriodEnd: '2026-12-31',
        taxPeriodKind: 'calendar',
        taxPeriodSource: 'client_default',
        taxPeriodReviewReason: null,
        status: 'in_progress',
        blockedByObligationInstanceId: null,
        readiness: 'ready',
        extensionDecision: 'not_considered',
        extensionMemo: null,
        extensionSource: null,
        extensionInternalTargetDate: null,
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
        accruedPenaltyCents: 0,
        accruedPenaltyStatus: 'ready',
        accruedPenaltyBreakdown: [],
        penaltyAsOfDate: '2026-04-26',
        penaltyFormulaVersion: null,
        exposureCalculatedAt: null,
        createdAt: '2026-04-26T00:00:00.000Z',
        updatedAt: '2026-04-26T00:00:00.000Z',
      },
      auditId: '33333333-3333-4333-8333-333333333333',
    })
    expect(output.auditId).toMatch(/-/)

    const taxYearInput = ObligationTaxYearProfileUpdateInputSchema.parse({
      id: '11111111-1111-4111-8111-111111111111',
      taxYearType: 'fiscal',
      fiscalYearEndMonth: 6,
      fiscalYearEndDay: 30,
      reason: 'specific obligation uses fiscal year',
    })
    expect(taxYearInput.taxYearType).toBe('fiscal')

    const taxYearOutput = ObligationTaxYearProfileUpdateOutputSchema.parse({
      obligation: {
        ...output.obligation,
        taxYearType: 'fiscal',
        fiscalYearEndMonth: 6,
        fiscalYearEndDay: 30,
        taxPeriodStart: '2025-07-01',
        taxPeriodEnd: '2026-06-30',
        taxPeriodKind: 'fiscal',
        taxPeriodSource: 'manual_cpa_confirmed',
      },
      auditId: '33333333-3333-4333-8333-333333333333',
    })
    expect(taxYearOutput.obligation.taxPeriodKind).toBe('fiscal')

    const extensionInput = ObligationExtensionDecisionInputSchema.parse({
      id: '11111111-1111-4111-8111-111111111111',
      internalTargetDate: '2026-04-15',
      memo: 'client material cutoff missed',
      source: 'partner approval',
    })
    expect(extensionInput).not.toHaveProperty('decision')
    expect(extensionInput.internalTargetDate).toBe('2026-04-15')

    const bulkInput = ObligationBulkStatusUpdateInputSchema.parse({
      ids: ['11111111-1111-4111-8111-111111111111'],
      status: 'extended',
      reason: 'extension filed',
    })
    expect(bulkInput.status).toBe('extended')
    const bulkOutput = ObligationBulkStatusUpdateOutputSchema.parse({
      updatedCount: 1,
      skippedCount: 0,
      auditIds: ['33333333-3333-4333-8333-333333333333'],
    })
    expect(bulkOutput.updatedCount).toBe(1)
    expect(bulkOutput.skippedCount).toBe(0)

    const filedRejectionInput = ObligationMarkFiledRejectedInputSchema.parse({
      id: '11111111-1111-4111-8111-111111111111',
      rejectedAt: '2026-04-21',
      authority: 'IRS',
      reference: 'R0000-932-02',
      reason: 'Dependent EIN mismatch on the transmitted return.',
      nextStep: 'correct_resubmit',
    })
    expect(filedRejectionInput.nextStep).toBe('correct_resubmit')
    expect(() =>
      ObligationMarkFiledRejectedInputSchema.parse({
        id: '11111111-1111-4111-8111-111111111111',
        nextStep: 'correct_resubmit',
      }),
    ).toThrow()

    const requestInput = ObligationRequestInputInputSchema.parse({
      obligationId: '11111111-1111-4111-8111-111111111111',
      recipientUserId: 'user_partner_1',
      message: 'Please confirm whether to file an extension.',
    })
    expect(requestInput.message).toBe('Please confirm whether to file an extension.')
    const requestOutput = ObligationRequestInputOutputSchema.parse({
      auditId: '33333333-3333-4333-8333-333333333333',
      notificationId: '44444444-4444-4444-8444-444444444444',
    })
    expect(requestOutput.notificationId).toMatch(/-/)

    expect(output.obligation.readiness).toBe('ready')
  })

  it('exposes annual rollover preview and create schemas', () => {
    expect(
      AnnualRolloverInputSchema.parse({
        sourceFilingYear: 2026,
        targetFilingYear: 2027,
        clientIds: ['22222222-2222-4222-8222-222222222222'],
      }).targetFilingYear,
    ).toBe(2027)
    expect(() =>
      AnnualRolloverInputSchema.parse({ sourceFilingYear: 2026, targetFilingYear: 2028 }),
    ).toThrow()

    const output = AnnualRolloverOutputSchema.parse({
      summary: {
        sourceFilingYear: 2026,
        targetFilingYear: 2027,
        seedObligationCount: 1,
        clientCount: 1,
        willCreateCount: 1,
        reviewCount: 0,
        duplicateCount: 0,
        skippedCount: 0,
        createdCount: 0,
      },
      rows: [
        {
          clientId: '22222222-2222-4222-8222-222222222222',
          clientName: 'Acme LLC',
          taxType: 'ca_100',
          sourceObligationIds: ['11111111-1111-4111-8111-111111111111'],
          preview: {
            clientId: '22222222-2222-4222-8222-222222222222',
            ruleId: 'ca_100_2027',
            ruleVersion: 1,
            ruleTitle: 'CA Form 100 annual filing',
            jurisdiction: 'CA',
            taxType: 'ca_100',
            matchedTaxType: 'ca_100',
            period: 'annual',
            dueDate: '2027-04-15',
            taxPeriodStart: '2027-01-01',
            taxPeriodEnd: '2027-12-31',
            taxPeriodKind: 'calendar',
            taxPeriodSource: 'client_default',
            taxPeriodReviewReason: null,
            eventType: 'filing',
            isFiling: true,
            isPayment: false,
            formName: 'Form 100',
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
            requiresReview: false,
            reminderReady: true,
            reviewReasons: [],
            missingClientFacts: [],
          },
          disposition: 'will_create',
          targetStatus: 'pending',
          duplicateObligationId: null,
          createdObligationId: null,
          skippedReason: null,
        },
      ],
      auditId: null,
    })
    expect(output.rows[0]?.preview?.ruleId).toBe('ca_100_2027')
  })

  it('exposes clients.bulkUpdateAssignee for Obligations bulk owner changes', () => {
    expect(Object.keys(clientsContract)).toEqual(
      expect.arrayContaining(['bulkUpdateAssignee', 'updatePenaltyInputs']),
    )
    const input = ClientBulkAssigneeUpdateInputSchema.parse({
      clientIds: ['22222222-2222-4222-8222-222222222222'],
      assigneeId: 'user_123',
      reason: 'rebalance queue',
    })
    expect(input.assigneeId).toBe('user_123')
    const output = ClientBulkAssigneeUpdateOutputSchema.parse({
      updatedCount: 1,
      auditId: '33333333-3333-4333-8333-333333333333',
    })
    expect(output.updatedCount).toBe(1)
  })

  it('exposes clients.delete for audited client removal', () => {
    expect(Object.keys(clientsContract)).toEqual(expect.arrayContaining(['delete']))
    const input = ClientDeleteInputSchema.parse({
      id: '22222222-2222-4222-8222-222222222222',
    })
    expect(input.id).toBe('22222222-2222-4222-8222-222222222222')
    const output = ClientDeleteOutputSchema.parse({
      deleted: true,
      auditId: '33333333-3333-4333-8333-333333333333',
    })
    expect(output.deleted).toBe(true)
  })

  it('exposes clients.updateSourceDetails for source and contact edits', () => {
    expect(Object.keys(clientsContract)).toEqual(expect.arrayContaining(['updateSourceDetails']))
    const input = ClientSourceDetailsUpdateSchema.parse({
      id: '22222222-2222-4222-8222-222222222222',
      externalClientId: null,
      addressLine1: '123 Main St',
      city: 'Los Angeles',
      postalCode: '90012',
      primaryPhone: '555-0100',
      sourceStatus: null,
      reason: 'manual contact update',
    })
    expect(input.addressLine1).toBe('123 Main St')
    expect(input.sourceStatus).toBeNull()
  })

  it('exposes clients.updateJurisdiction for existing client fact edits', () => {
    expect(Object.keys(clientsContract)).toEqual(expect.arrayContaining(['updateJurisdiction']))
    const input = ClientJurisdictionUpdateSchema.parse({
      id: '22222222-2222-4222-8222-222222222222',
      state: 'WA',
      county: 'King',
      reason: 'client facts correction',
    })
    expect(input.state).toBe('WA')
    expect(input.county).toBe('King')
    const output = ClientJurisdictionUpdateOutputSchema.parse({
      client: {
        id: '22222222-2222-4222-8222-222222222222',
        firmId: '11111111-1111-4111-8111-111111111111',
        name: 'Riverbend Draft Client',
        ein: null,
        state: 'WA',
        county: 'King',
        entityType: 'llc',
        legalEntity: null,
        taxClassification: 'unknown',
        taxYearType: 'calendar',
        fiscalYearEndMonth: null,
        fiscalYearEndDay: null,
        externalClientId: null,
        addressLine1: null,
        city: null,
        postalCode: null,
        primaryPhone: null,
        sourceStatus: null,
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
        importanceWeight: 1,
        lateFilingCountLast12mo: 0,
        estimatedTaxLiabilityCents: null,
        estimatedTaxLiabilitySource: null,
        equityOwnerCount: null,
        migrationBatchId: null,
        filingProfiles: [
          {
            id: '44444444-4444-4444-8444-444444444444',
            firmId: '11111111-1111-4111-8111-111111111111',
            clientId: '22222222-2222-4222-8222-222222222222',
            state: 'WA',
            counties: ['King'],
            taxTypes: ['wa_bls_annual_report'],
            isPrimary: true,
            source: 'manual',
            migrationBatchId: null,
            archivedAt: null,
            createdAt: '2026-05-01T00:00:00.000Z',
            updatedAt: '2026-05-02T00:00:00.000Z',
          },
        ],
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-02T00:00:00.000Z',
        deletedAt: null,
      },
      recalculatedObligationCount: 1,
      auditId: '33333333-3333-4333-8333-333333333333',
    })
    expect(output.client.state).toBe('WA')
    expect(output.recalculatedObligationCount).toBe(1)

    expect(Object.keys(clientsContract)).toEqual(expect.arrayContaining(['updateTaxYearProfile']))
    const taxYearInput = ClientTaxYearProfileUpdateSchema.parse({
      id: '22222222-2222-4222-8222-222222222222',
      taxYearType: 'fiscal',
      fiscalYearEndMonth: 6,
      fiscalYearEndDay: 30,
      reason: 'client fiscal year correction',
    })
    expect(taxYearInput.taxYearType).toBe('fiscal')
    const taxYearOutput = ClientTaxYearProfileUpdateOutputSchema.parse({
      client: {
        ...output.client,
        taxYearType: 'fiscal',
        fiscalYearEndMonth: 6,
        fiscalYearEndDay: 30,
      },
      recalculatedObligationCount: 1,
      auditId: '33333333-3333-4333-8333-333333333333',
    })
    expect(taxYearOutput.client.fiscalYearEndMonth).toBe(6)
  })

  it('freezes obligations.list input shape', () => {
    expect(Object.keys(obligationQueueContract)).toEqual([
      'list',
      'getDetail',
      'facets',
      'listSavedViews',
      'createSavedView',
      'updateSavedView',
      'deleteSavedView',
      'exportSelected',
    ])
    expect(ObligationQueueSortSchema.options).toEqual([
      'smart_priority',
      'due_asc',
      'due_desc',
      'updated_desc',
    ])
    expect(ObligationQueueDensitySchema.options).toEqual(['comfortable', 'compact'])
    expect(ObligationQueueReadinessSchema.options).toEqual(['ready', 'waiting', 'needs_review'])

    const parsed = ObligationQueueListInputSchema.parse({
      status: ['pending', 'in_progress'],
      search: 'acme',
      obligationIds: ['22222222-2222-4222-8222-222222222222'],
      clientIds: ['11111111-1111-4111-8111-111111111111'],
      states: ['CA'],
      counties: ['Orange'],
      taxTypes: ['1040'],
      assigneeName: 'Sarah',
      assigneeNames: ['Mina'],
      owner: 'unassigned',
      due: 'overdue',
      dueWithinDays: 7,
      readiness: ['ready'],
      minDaysUntilDue: -10,
      maxDaysUntilDue: 30,
      asOfDate: '2026-04-29',
      sort: 'due_asc',
      cursor: null,
      limit: 50,
    })
    expect(parsed.limit).toBe(50)
    expect(ObligationQueueOwnerFilterSchema.parse('unassigned')).toBe('unassigned')
    expect(() =>
      ObligationQueueListInputSchema.parse({
        search: 'x'.repeat(OBLIGATION_QUEUE_SEARCH_MAX_LENGTH + 1),
      }),
    ).toThrow()
    expect(() =>
      ObligationQueueListInputSchema.parse({
        clientIds: Array.from(
          { length: OBLIGATION_QUEUE_FILTER_MAX_SELECTIONS + 1 },
          (_, index) => `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
        ),
      }),
    ).toThrow()

    const facets = ObligationQueueFacetsOutputSchema.parse({
      clients: [
        {
          value: '11111111-1111-4111-8111-111111111111',
          label: 'Acme Holdings LLC',
          count: 2,
          state: 'CA',
          county: 'Orange',
        },
      ],
      states: [{ value: 'CA', label: 'CA', count: 2 }],
      counties: [{ value: 'Orange', label: 'Orange, CA', count: 2, state: 'CA' }],
      taxTypes: [{ value: '1040', label: '1040', count: 2 }],
      assigneeNames: [{ value: 'Sarah', label: 'Sarah', count: 2 }],
      statuses: [{ value: 'pending', label: 'pending', count: 2 }],
    })
    expect(facets.clients[0]?.state).toBe('CA')

    const savedView = ObligationQueueSavedViewSchema.parse({
      id: '55555555-5555-4555-8555-555555555555',
      firmId: 'firm_123',
      createdByUserId: 'user_123',
      name: 'CA clients due in 14 days',
      query: { state: ['CA'], dueWithin: 14 },
      columnVisibility: { clientCounty: false },
      density: 'compact',
      isPinned: true,
      createdAt: '2026-04-29T00:00:00.000Z',
      updatedAt: '2026-04-29T00:00:00.000Z',
    })
    expect(savedView.isPinned).toBe(true)
    expect(
      ObligationQueueCreateSavedViewInputSchema.parse({
        name: 'Waiting on client',
        query: { status: ['waiting_on_client'] },
        columnVisibility: {},
        density: 'comfortable',
      }).name,
    ).toBe('Waiting on client')
    expect(
      ObligationQueueUpdateSavedViewInputSchema.parse({
        id: savedView.id,
        isPinned: false,
      }).isPinned,
    ).toBe(false)
    const exportInput = ObligationQueueExportSelectedInputSchema.parse({
      ids: ['11111111-1111-4111-8111-111111111111'],
      format: 'ics',
    })
    expect(exportInput.format).toBe('ics')
    expect(exportInput.scope).toBe('selected')
    expect(
      ObligationQueueExportSelectedOutputSchema.parse({
        fileName: 'obligations.zip',
        contentType: 'application/zip',
        contentBase64: 'abcd',
        auditId: '33333333-3333-4333-8333-333333333333',
      }).fileName,
    ).toBe('obligations.zip')
  })

  it('freezes workload paid surface contract', () => {
    expect(Object.keys(workloadContract)).toEqual(['load'])
    expect(WorkloadLoadInputSchema.parse({ asOfDate: '2026-04-29', windowDays: 7 })).toEqual({
      asOfDate: '2026-04-29',
      windowDays: 7,
    })
    expect(() => WorkloadLoadInputSchema.parse({ windowDays: WorkloadWindowMaxDays + 1 })).toThrow()

    const output = WorkloadLoadOutputSchema.parse({
      asOfDate: '2026-04-29',
      windowDays: 7,
      summary: { open: 3, dueSoon: 1, overdue: 1, waiting: 1, review: 0, unassigned: 1 },
      rows: [
        {
          id: 'assignee:Sarah',
          ownerLabel: 'Sarah',
          assigneeName: 'Sarah',
          kind: 'assignee',
          open: 2,
          dueSoon: 1,
          overdue: 0,
          waiting: 1,
          review: 0,
          loadScore: 100,
        },
      ],
      managerInsights: {
        capacityOwnerLabel: 'Sarah',
        capacityLoadScore: 100,
        capacityOpen: 2,
        unassignedOpen: 1,
        waitingOpen: 1,
        reviewOpen: 0,
      },
    })
    expect(output.rows[0]?.ownerLabel).toBe('Sarah')
    expect(output.managerInsights?.capacityOwnerLabel).toBe('Sarah')
  })

  it('freezes migration.listErrors stages', () => {
    expect(MigrationErrorStageSchema.options).toEqual(['mapping', 'normalize', 'matrix', 'all'])
    expect(Object.keys(migrationContract)).toEqual(
      expect.arrayContaining(['runMapper', 'applyDefaultMatrix', 'discardDraft', 'listErrors']),
    )
    expect(MigrationSourceSchema.options).toEqual(
      expect.arrayContaining([
        'paste',
        'csv',
        'xlsx',
        'preset_taxdome',
        'preset_drake',
        'preset_karbon',
        'preset_quickbooks',
        'preset_file_in_time',
        'preset_cch_axcess',
        'preset_cch_prosystem_fx',
        'preset_lacerte',
        'preset_proseries',
        'preset_ultratax_cs',
        'preset_proconnect_tax',
      ]),
    )
    expect(MigrationDetectedSourceProductSchema.options).toEqual(
      expect.arrayContaining([
        'drake',
        'cch_axcess',
        'cch_prosystem_fx',
        'lacerte',
        'proseries',
        'ultratax_cs',
        'proconnect_tax',
      ]),
    )
    expect(MigrationSourceFileRoleSchema.options).toEqual(
      expect.arrayContaining(['return_data', 'client_listing_report', 'questionnaire_responses']),
    )
    expect(MappingTargetSchema.options).toEqual(
      expect.arrayContaining([
        'client.external_client_id',
        'client.address_line_1',
        'client.city',
        'client.postal_code',
        'client.primary_phone',
        'client.source_status',
      ]),
    )
  })

  it('accepts explicit Default Matrix cell selections', () => {
    expect(MatrixSelectionSchema.parse({ entityType: 'llc', state: 'CA', enabled: false })).toEqual(
      { entityType: 'llc', state: 'CA', enabled: false },
    )
  })

  it('allows verified rule evidence for generated obligations', () => {
    expect(EvidenceSourceTypeSchema.parse('verified_rule')).toBe('verified_rule')
  })

  it('allows source-changed rules to be skipped from bulk accept', () => {
    expect(
      RuleBulkAcceptSkipSchema.parse({
        ruleId: 'ca-llc-annual-tax',
        expectedVersion: 2,
        reason: 'source_changed_requires_review',
      }).reason,
    ).toBe('source_changed_requires_review')
  })

  it('allows migration and Pulse audit strings used by batch apply', () => {
    expect(AuditActionSchema.parse('migration.batch.created')).toBe('migration.batch.created')
    expect(AuditActionSchema.parse('migration.discarded')).toBe('migration.discarded')
    expect(PulseAuditActionSchema.parse('pulse.apply')).toBe('pulse.apply')
    expect(PulseAuditActionSchema.parse('pulse.dismiss')).toBe('pulse.dismiss')
    expect(PulseAuditActionSchema.parse('pulse.quarantine')).toBe('pulse.quarantine')
    expect(PulseAuditActionSchema.parse('pulse.source_revoked')).toBe('pulse.source_revoked')
    expect(PulseAuditActionSchema.parse('pulse.snooze')).toBe('pulse.snooze')
    expect(AuditActionSchema.parse('pulse.revert')).toBe('pulse.revert')
    expect(AuditActionSchema.parse('pulse.reactivate')).toBe('pulse.reactivate')
    expect(AuditActionSchema.parse('pulse.review_requested')).toBe('pulse.review_requested')
    expect(EvidenceSourceTypeSchema.parse('pulse_apply')).toBe('pulse_apply')
    expect(AuditActionSchema.parse('penalty.override')).toBe('penalty.override')
    expect(EvidenceSourceTypeSchema.parse('penalty_override')).toBe('penalty_override')
    expect(AuditActionSchema.parse('client.deleted')).toBe('client.deleted')
    expect(AuditActionSchema.parse('rules.accepted')).toBe('rules.accepted')
    expect(AuditActionSchema.parse('rules.bulk_accepted')).toBe('rules.bulk_accepted')
    expect(AuditActionSchema.parse('rules.onboarding_activated')).toBe('rules.onboarding_activated')
    expect(AuditActionSchema.parse('rules.rejected')).toBe('rules.rejected')
    expect(AuditActionSchema.parse('obligation.annual_rollover.created')).toBe(
      'obligation.annual_rollover.created',
    )
  })

  it('freezes Pulse demo backend contracts', () => {
    expect(Object.keys(pulseContract)).toEqual([
      'listAlerts',
      'activeCount',
      'listHistory',
      'listSourceHealth',
      'retrySourceHealth',
      'getDetail',
      'getDetailsBatch',
      'listPriorityQueue',
      'reviewPriorityMatches',
      'reviewDueDateOverlayDetails',
      'applyReviewed',
      'apply',
      'dismiss',
      'snooze',
      'markReviewed',
      'revert',
      'reactivate',
      'requestReview',
    ])
    expect(PulseFirmAlertStatusSchema.options).toEqual([
      'matched',
      'dismissed',
      'snoozed',
      'partially_applied',
      'applied',
      'reverted',
      'reviewed',
    ])
    expect(ErrorCodes.PULSE_APPLY_CONFLICT).toBe('PULSE_APPLY_CONFLICT')
    expect(ErrorCodes.PULSE_NEEDS_DETAILS).toBe('PULSE_NEEDS_DETAILS')
    expect(PulseListAlertsInputSchema.parse({ limit: 50 })).toEqual({ limit: 50 })
    expect(PulseListAlertsInputSchema.safeParse({ limit: 51 }).success).toBe(false)

    const alert = PulseAlertPublicSchema.parse({
      id: '11111111-1111-4111-8111-111111111111',
      pulseId: '22222222-2222-4222-8222-222222222222',
      status: 'matched',
      sourceStatus: 'approved',
      title: 'IRS CA storm relief',
      source: 'IRS Disaster Relief',
      sourceUrl: 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations',
      changeKind: 'deadline_shift',
      actionMode: 'due_date_overlay',
      jurisdiction: 'CA',
      summary: 'IRS extends selected filing deadlines for Los Angeles County.',
      publishedAt: '2026-04-15T17:00:00.000Z',
      matchedCount: 1,
      needsReviewCount: 1,
      confidence: 0.94,
      isSample: true,
    })
    expect(alert.isSample).toBe(true)
    expect(PulseAlertPublicSchema.parse({ ...alert, jurisdiction: 'FED' }).jurisdiction).toBe('FED')

    const affected = PulseAffectedClientSchema.parse({
      obligationId: '33333333-3333-4333-8333-333333333333',
      clientId: '44444444-4444-4444-8444-444444444444',
      clientName: 'Arbor & Vale LLC',
      state: 'CA',
      county: null,
      entityType: 'llc',
      taxType: 'federal_1065',
      currentDueDate: '2026-03-15',
      newDueDate: '2026-10-15',
      status: 'pending',
      matchStatus: 'needs_review',
      reason: 'Client county is missing; confirm county applicability before applying.',
    })
    expect(affected.matchStatus).toBe('needs_review')
    expect(PulseAffectedClientSchema.parse({ ...affected, state: 'FED' }).state).toBe('FED')

    const detail = PulseDetailSchema.parse({
      alert,
      jurisdiction: 'CA',
      counties: ['Los Angeles'],
      forms: ['federal_1065'],
      entityTypes: ['llc'],
      originalDueDate: null,
      newDueDate: '2026-10-15',
      effectiveFrom: null,
      effectiveUntil: null,
      affectedRuleIds: [],
      structuredChange: null,
      sourceExcerpt: 'some deadlines were extended',
      reviewedAt: null,
      applyReadiness: {
        status: 'needs_details',
        missing: ['affected_clients'],
      },
      affectedClients: [affected],
    })
    expect(detail.applyReadiness.missing).toEqual(['affected_clients'])
    expect(
      PulseDetailSchema.parse({
        ...detail,
        alert: { ...detail.alert, jurisdiction: 'FED' },
        jurisdiction: 'FED',
        affectedClients: [{ ...affected, state: 'FED' }],
      }).jurisdiction,
    ).toBe('FED')

    const applyInput = PulseApplyInputSchema.parse({
      alertId: '11111111-1111-4111-8111-111111111111',
      obligationIds: ['33333333-3333-4333-8333-333333333333'],
      confirmedObligationIds: ['33333333-3333-4333-8333-333333333333'],
    })
    expect(applyInput.confirmedObligationIds).toEqual(['33333333-3333-4333-8333-333333333333'])

    const detailsInput = PulseReviewDueDateOverlayDetailsInputSchema.parse({
      alertId: alert.id,
      newDueDate: '2026-10-15',
      selectedObligationIds: ['33333333-3333-4333-8333-333333333333'],
      confirmedObligationIds: ['33333333-3333-4333-8333-333333333333'],
      excludedObligationIds: [],
      note: ' Verified against source. ',
    })
    expect(detailsInput.selectedObligationIds).toEqual(['33333333-3333-4333-8333-333333333333'])
    expect(detailsInput.note).toBe('Verified against source.')

    const apply = PulseApplyOutputSchema.parse({
      alert: { ...alert, status: 'applied', matchedCount: 0, needsReviewCount: 1 },
      appliedCount: 1,
      auditIds: ['55555555-5555-4555-8555-555555555555'],
      evidenceIds: ['66666666-6666-4666-8666-666666666666'],
      applicationIds: ['77777777-7777-4777-8777-777777777777'],
      emailOutboxId: '88888888-8888-4888-8888-888888888888',
      revertExpiresAt: '2026-04-16T18:00:00.000Z',
    })
    expect(apply.appliedCount).toBe(1)

    const requestReviewInput = PulseRequestReviewInputSchema.parse({
      alertId: alert.id,
      note: ' Please review LA County applicability. ',
    })
    expect(requestReviewInput.note).toBe('Please review LA County applicability.')

    const requestReview = PulseRequestReviewOutputSchema.parse({
      notificationCount: 2,
      emailCount: 2,
      auditId: '99999999-9999-4999-8999-999999999999',
    })
    expect(requestReview.notificationCount).toBe(2)
    expect(requestReview.emailCount).toBe(2)
  })

  it('freezes evidence.listByObligation public shape', () => {
    expect(Object.keys(evidenceContract)).toEqual(['listByObligation'])

    const row = EvidencePublicSchema.parse({
      id: '33333333-3333-4333-8333-333333333333',
      obligationInstanceId: '11111111-1111-4111-8111-111111111111',
      aiOutputId: null,
      sourceType: 'verified_rule',
      sourceId: 'ca.llc.annual_tax.2026',
      sourceUrl: 'https://www.ftb.ca.gov/file/business/types/limited-liability-company/',
      verbatimQuote: 'Annual tax is due by the 15th day of the 4th month.',
      rawValue: 'ca_llc_franchise_min_800',
      normalizedValue: 'ca_llc_annual_tax',
      confidence: 1,
      model: null,
      appliedAt: '2026-04-28T00:00:00.000Z',
    })
    expect(row.sourceType).toBe('verified_rule')
  })

  it('freezes dashboard.load activation slice shape', () => {
    expect(Object.keys(dashboardContract)).toEqual(['load', 'requestBriefRefresh'])
    expect(DashboardSeveritySchema.options).toEqual(['critical', 'high', 'medium', 'neutral'])
    expect(DashboardTriageTabKeySchema.options).toEqual(['this_week', 'this_month', 'long_term'])
    expect(DashboardDueBucketSchema.options).toEqual([
      'overdue',
      'today',
      'next_7_days',
      'next_30_days',
      'long_term',
    ])
    expect(DashboardEvidenceFilterSchema.options).toEqual(['needs', 'linked'])

    const input = DashboardLoadInputSchema.parse({
      clientIds: ['11111111-1111-4111-8111-111111111111'],
      taxTypes: ['ca_llc_annual_tax'],
      dueBuckets: ['overdue', 'next_7_days'],
      status: ['pending', 'review'],
      severity: ['critical'],
      evidence: ['linked'],
    })
    expect(input?.dueBuckets).toEqual(['overdue', 'next_7_days'])
    expect(() =>
      DashboardLoadInputSchema.parse({
        clientIds: Array.from(
          { length: DASHBOARD_FILTER_MAX_SELECTIONS + 1 },
          (_, index) => `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
        ),
      }),
    ).toThrow()

    const output = DashboardLoadOutputSchema.parse({
      asOfDate: '2026-04-28',
      windowDays: 7,
      summary: {
        openObligationCount: 1,
        dueThisWeekCount: 1,
        needsReviewCount: 0,
        evidenceGapCount: 0,
        totalAccruedPenaltyCents: 0,
        accruedPenaltyReadyCount: 0,
        accruedPenaltyNeedsInputCount: 0,
        accruedPenaltyUnsupportedCount: 0,
      },
      topRows: [
        {
          obligationId: '11111111-1111-4111-8111-111111111111',
          clientId: '22222222-2222-4222-8222-222222222222',
          clientName: 'Acme LLC',
          clientEmail: 'acme@example.com',
          taxType: 'ca_llc_annual_tax',
          currentDueDate: '2026-04-30',
          paymentDueDate: null,
          status: 'pending',
          missingPenaltyFacts: [],
          penaltySourceRefs: [],
          penaltyFormulaLabel: 'California LLC annual tax penalty',
          penaltyFactsVersion: 'penalty-facts-v1',
          accruedPenaltyCents: 0,
          accruedPenaltyStatus: 'ready',
          accruedPenaltyBreakdown: [],
          penaltyAsOfDate: '2026-04-28',
          penaltyFormulaVersion: 'penalty-v3-allstates-2026q2',
          severity: 'critical',
          evidenceCount: 1,
          smartPriority: {
            version: 'smart-priority-v1',
            score: 42.5,
            rank: 1,
            factors: [],
          },
          primaryEvidence: {
            id: '33333333-3333-4333-8333-333333333333',
            obligationInstanceId: '11111111-1111-4111-8111-111111111111',
            aiOutputId: null,
            sourceType: 'verified_rule',
            sourceId: 'ca.llc.annual_tax.2026',
            sourceUrl: null,
            verbatimQuote: null,
            rawValue: null,
            normalizedValue: null,
            confidence: 1,
            model: null,
            appliedAt: '2026-04-28T00:00:00.000Z',
          },
        },
      ],
      triageTabs: [
        {
          key: 'this_week',
          label: 'This Week',
          count: 1,
          rows: [
            {
              obligationId: '11111111-1111-4111-8111-111111111111',
              clientId: '22222222-2222-4222-8222-222222222222',
              clientName: 'Acme LLC',
              clientEmail: 'acme@example.com',
              taxType: 'ca_llc_annual_tax',
              currentDueDate: '2026-04-30',
              paymentDueDate: null,
              status: 'pending',
              missingPenaltyFacts: [],
              penaltySourceRefs: [],
              penaltyFormulaLabel: 'California LLC annual tax penalty',
              penaltyFactsVersion: 'penalty-facts-v1',
              accruedPenaltyCents: 0,
              accruedPenaltyStatus: 'ready',
              accruedPenaltyBreakdown: [],
              penaltyAsOfDate: '2026-04-28',
              penaltyFormulaVersion: 'penalty-v3-allstates-2026q2',
              severity: 'critical',
              evidenceCount: 1,
              smartPriority: {
                version: 'smart-priority-v1',
                score: 42.5,
                rank: 1,
                factors: [],
              },
              primaryEvidence: null,
            },
          ],
        },
        {
          key: 'this_month',
          label: 'This Month',
          count: 0,
          rows: [],
        },
        {
          key: 'long_term',
          label: 'Long-term',
          count: 0,
          rows: [],
        },
      ],
      facets: {
        clients: [
          {
            value: '22222222-2222-4222-8222-222222222222',
            label: 'Acme LLC',
            count: 1,
          },
        ],
        taxTypes: [{ value: 'ca_llc_annual_tax', label: 'ca_llc_annual_tax', count: 1 }],
        dueBuckets: [
          { value: 'overdue', label: 'overdue', count: 0 },
          { value: 'today', label: 'today', count: 0 },
          { value: 'next_7_days', label: 'next_7_days', count: 1 },
          { value: 'next_30_days', label: 'next_30_days', count: 0 },
          { value: 'long_term', label: 'long_term', count: 0 },
        ],
        statuses: [
          { value: 'pending', label: 'pending', count: 1 },
          { value: 'in_progress', label: 'in_progress', count: 0 },
          { value: 'waiting_on_client', label: 'waiting_on_client', count: 0 },
          { value: 'review', label: 'review', count: 0 },
        ],
        severities: [
          { value: 'critical', label: 'critical', count: 1 },
          { value: 'high', label: 'high', count: 0 },
          { value: 'medium', label: 'medium', count: 0 },
          { value: 'neutral', label: 'neutral', count: 0 },
        ],
        evidence: [
          { value: 'needs', label: 'needs', count: 0 },
          { value: 'linked', label: 'linked', count: 1 },
        ],
      },
      brief: {
        status: 'ready',
        generatedAt: '2026-04-28T12:00:00.000Z',
        expiresAt: '2026-04-29T12:00:00.000Z',
        text: 'Review Acme LLC first. [1]',
        citations: [
          {
            ref: 1,
            obligationId: '11111111-1111-4111-8111-111111111111',
            evidence: {
              id: '33333333-3333-4333-8333-333333333333',
              sourceType: 'verified_rule',
              sourceId: 'ca.llc.annual_tax.2026',
              sourceUrl: null,
            },
          },
        ],
        aiOutputId: '44444444-4444-4444-8444-444444444444',
        errorCode: null,
      },
    })
    expect(output.topRows[0]!.severity).toBe('critical')
    expect(output.brief?.status).toBe('ready')
  })

  it('freezes rules read contracts', () => {
    expect(Object.keys(rulesContract)).toEqual([
      'listSources',
      'listRules',
      'listTemporaryRules',
      'listReviewTasks',
      'listReviewDecisions',
      'acceptTemplate',
      'bulkAcceptTemplates',
      'activateOnboardingJurisdictions',
      'rejectTemplate',
      'createCustomRule',
      'updatePracticeRule',
      'archivePracticeRule',
      'previewRuleImpact',
      'previewBulkRuleImpact',
      'draftConcreteRule',
      'listConcreteDrafts',
      'verifyCandidate',
      'bulkVerifyCandidates',
      'rejectCandidate',
      'coverage',
      'previewObligations',
    ])

    const source = RuleSourceSchema.parse({
      id: 'fed.irs_pub_509_2026',
      jurisdiction: 'FED',
      title: 'IRS Publication 509 (2026), Tax Calendars',
      url: 'https://www.irs.gov/publications/p509',
      sourceType: 'publication',
      acquisitionMethod: 'html_watch',
      cadence: 'pre_season',
      priority: 'critical',
      healthStatus: 'healthy',
      isEarlyWarning: false,
      domains: ['individual_income_return', 'individual_estimated_tax'],
      entityApplicability: ['individual', 'sole_prop'],
      authorityRole: 'basis',
      notificationChannels: ['source_change', 'practice_rule_preview'],
      lastReviewedOn: '2026-04-27',
    })
    expect(source.jurisdiction).toBe('FED')

    const localSource = RuleSourceSchema.parse({
      id: 'pa.local_eit_lit_psd',
      jurisdiction: 'PA',
      localJurisdiction: {
        level: 'municipality',
        state: 'PA',
        localCode: 'PA:PSD:*',
        displayName: 'Pennsylvania PSD / local earned income tax jurisdictions',
        administeredBy: 'local_collector',
        collectedVia: 'manual_review',
        sourceAuthority: 'Pennsylvania Department of Community and Economic Development',
      },
      title: 'Pennsylvania DCED PSD Codes and Local EIT Rates',
      url: 'https://dced.pa.gov/local-government/local-income-tax-information/psd-codes-and-eit-rates/',
      sourceType: 'instructions',
      acquisitionMethod: 'manual_review',
      cadence: 'pre_season',
      priority: 'high',
      healthStatus: 'healthy',
      isEarlyWarning: false,
      domains: ['local_individual_income', 'local_employer_withholding', 'local_services_tax'],
      entityApplicability: ['individual', 'sole_prop', 'llc'],
      authorityRole: 'basis',
      notificationChannels: ['practice_rule_review', 'practice_rule_preview'],
      lastReviewedOn: '2026-05-23',
    })
    expect(localSource.localJurisdiction?.collectedVia).toBe('manual_review')

    const onboardingActivationInput = RuleOnboardingActivationInputSchema.parse({
      states: ['CA', 'TX'],
    })
    expect(onboardingActivationInput.states).toEqual(['CA', 'TX'])
    expect(() => RuleOnboardingActivationInputSchema.parse({ states: ['ca'] })).toThrow()

    const onboardingActivationOutput = RuleOnboardingActivationOutputSchema.parse({
      selectedStates: ['CA', 'TX'],
      jurisdictions: ['FED', 'CA', 'TX'],
      activatedCount: 42,
      skippedCount: 1,
      reviewRequiredCount: 3,
      reviewRequiredJurisdictions: ['AK'],
      generatedObligationCount: 0,
    })
    expect(onboardingActivationOutput.jurisdictions).toEqual(['FED', 'CA', 'TX'])

    const temporaryRule = TemporaryRuleSchema.parse({
      id: 'exception-1',
      alertId: 'alert-1',
      sourcePulseId: 'pulse-1',
      title: 'IRS disaster relief for Los Angeles County',
      sourceUrl: 'https://www.irs.gov/newsroom/disaster-relief',
      sourceExcerpt: 'Affected taxpayers have until June 15 to file.',
      jurisdiction: 'CA',
      counties: ['Los Angeles'],
      affectedForms: ['1040'],
      affectedEntityTypes: ['individual'],
      overrideType: 'extend_due_date',
      overrideDueDate: '2026-06-15',
      effectiveFrom: '2026-04-25',
      effectiveUntil: null,
      status: 'active',
      appliedObligationCount: 2,
      activeObligationCount: 2,
      revertedObligationCount: 0,
      firstAppliedAt: '2026-05-04T10:00:00.000Z',
      lastActivityAt: '2026-05-04T10:00:00.000Z',
    })
    expect(temporaryRule.status).toBe('active')
    expect(
      RuleSourceSchema.parse({
        ...source,
        id: 'ny.email_services',
        jurisdiction: 'NY',
        title: 'New York Tax Department Email Services',
        url: 'https://www.tax.ny.gov/help/subscribe.htm',
        sourceType: 'subscription',
        acquisitionMethod: 'email_subscription',
        domains: ['business_income_return'],
        entityApplicability: ['any_business'],
        authorityRole: 'watch',
      }).sourceType,
    ).toBe('subscription')

    const verifyInput = RuleVerifyCandidateInputSchema.parse({
      ruleId: 'ca.individual_income_return.candidate.2026',
      sourceId: 'ca.income_tax',
      aiOutputId: '44444444-4444-4444-8444-444444444444',
      reviewNote: 'Accepted cached AI concrete draft.',
    })
    expect(verifyInput.aiOutputId).toBe('44444444-4444-4444-8444-444444444444')

    const concreteDraft = RuleConcreteDraftSchema.parse({
      aiOutputId: '44444444-4444-4444-8444-444444444444',
      sourceHeading: 'Personal filing due dates',
      sourceExcerpt: 'California personal income tax returns are due April 15.',
      dueDateLogic: {
        kind: 'fixed_date',
        date: '2026-04-15',
        holidayRollover: 'source_adjusted',
      },
      extensionPolicy: {
        available: false,
        paymentExtended: false,
        notes: 'No source-backed extension policy identified.',
      },
      coverageStatus: 'full',
      requiresApplicabilityReview: false,
      quality: {
        filingPaymentDistinguished: true,
        extensionHandled: true,
        calendarFiscalSpecified: true,
        holidayRolloverHandled: true,
        crossVerified: true,
        exceptionChannel: true,
      },
      confidence: 0.92,
      reasoning: 'Official source names an April 15 filing deadline.',
    })
    expect(concreteDraft.dueDateLogic.kind).toBe('fixed_date')

    const rule = ObligationRuleSchema.parse({
      id: 'fed.1065.return.2025',
      title: 'Federal Form 1065 return for partnerships',
      jurisdiction: 'FED',
      entityApplicability: ['partnership', 'llc'],
      taxType: 'federal_1065',
      formName: 'Form 1065',
      eventType: 'filing',
      isFiling: true,
      isPayment: false,
      taxYear: 2025,
      applicableYear: 2026,
      ruleTier: 'basic',
      status: 'verified',
      coverageStatus: 'full',
      riskLevel: 'med',
      requiresApplicabilityReview: false,
      dueDateLogic: {
        kind: 'nth_day_after_tax_year_end',
        monthOffset: 3,
        day: 15,
        holidayRollover: 'next_business_day',
      },
      extensionPolicy: {
        available: true,
        formName: 'Form 7004',
        durationMonths: 6,
        paymentExtended: false,
        notes: 'Filing extension only.',
      },
      sourceIds: ['fed.irs_pub_509_2026'],
      evidence: [
        {
          sourceId: 'fed.irs_pub_509_2026',
          authorityRole: 'basis',
          locator: {
            kind: 'table',
            heading: 'Partnerships / Form 1065',
          },
          summary: 'Due on the 15th day of the 3rd month after tax year end.',
          sourceExcerpt: 'If any due date falls on a Saturday, Sunday, or legal holiday',
          retrievedAt: '2026-04-27',
          sourceUpdatedOn: '2026-04-27',
        },
      ],
      defaultTip: 'Calendar-year partnership returns for tax year 2025 roll to March 16, 2026.',
      quality: {
        filingPaymentDistinguished: true,
        extensionHandled: true,
        calendarFiscalSpecified: true,
        holidayRolloverHandled: true,
        crossVerified: true,
        exceptionChannel: true,
      },
      verifiedBy: 'practice.template_seed',
      verifiedAt: '2026-04-27',
      reviewedByName: 'Sarah Martinez',
      reviewedAt: '2026-05-23T14:08:09.000Z',
      nextReviewOn: '2026-11-15',
      version: 1,
    })
    expect(rule.status).toBe('verified')
    expect(rule.reviewedByName).toBe('Sarah Martinez')
    expect(rule.reviewedAt).toBe('2026-05-23T14:08:09.000Z')

    const previewInput = RuleGenerationPreviewInputSchema.parse({
      client: {
        id: 'client_ca_llc',
        entityType: 'llc',
        state: 'CA',
        taxTypes: ['ca_llc_franchise_min_800'],
        taxYearStart: '2026-01-01',
        taxYearEnd: '2025-12-31',
        localFacts: {
          resident_county: 'Los Angeles',
          local_filing_channel: 'state_return',
        },
      },
      holidays: ['2026-01-01'],
    })
    expect(previewInput.client.taxTypes).toEqual(['ca_llc_franchise_min_800'])
    expect(previewInput.client.localFacts).toMatchObject({
      resident_county: 'Los Angeles',
      local_filing_channel: 'state_return',
    })

    expect(() =>
      RuleGenerationPreviewInputSchema.parse({
        client: {
          id: 'client_any_business',
          entityType: 'any_business',
          state: 'WA',
          taxTypes: ['wa_combined_excise'],
        },
      }),
    ).toThrow()

    expect(() =>
      RuleGenerationPreviewInputSchema.parse({
        client: {
          id: 'client_lowercase_state',
          entityType: 'llc',
          state: 'ca',
          taxTypes: ['ca_llc_franchise_min_800'],
        },
      }),
    ).toThrow()

    expect(() =>
      RuleGenerationPreviewInputSchema.parse({
        client: {
          id: 'client_unsupported_state',
          entityType: 'llc',
          state: 'XX',
          taxTypes: ['federal_1065_or_1040'],
        },
      }),
    ).toThrow()

    expect(() =>
      RuleGenerationPreviewInputSchema.parse({
        client: {
          id: 'client_fed_state',
          entityType: 'llc',
          state: 'FED',
          taxTypes: ['federal_1065_or_1040'],
        },
      }),
    ).toThrow()

    const preview = ObligationGenerationPreviewSchema.parse({
      clientId: 'client_ca_llc',
      ruleId: 'ca.llc.annual_tax.2026',
      ruleVersion: 1,
      ruleTitle: 'California LLC annual tax payment',
      jurisdiction: 'CA',
      taxType: 'ca_llc_annual_tax',
      matchedTaxType: 'ca_llc_franchise_min_800',
      period: 'tax_year',
      dueDate: '2026-04-15',
      taxPeriodStart: '2026-01-01',
      taxPeriodEnd: '2026-12-31',
      taxPeriodKind: 'calendar',
      taxPeriodSource: 'client_default',
      taxPeriodReviewReason: null,
      eventType: 'payment',
      isFiling: false,
      isPayment: true,
      formName: 'FTB 3522',
      sourceIds: ['ca.ftb_business_due_dates'],
      evidence: [
        {
          sourceId: 'ca.ftb_business_due_dates',
          authorityRole: 'basis',
          locator: {
            kind: 'table',
            heading: 'Annual LLC tax',
          },
          summary: 'Due on the 15th day of the 4th month.',
          sourceExcerpt: 'Business due dates',
          retrievedAt: '2026-04-27',
          sourceUpdatedOn: '2026-04-27',
        },
      ],
      requiresReview: false,
      reminderReady: true,
      reviewReasons: [],
      missingClientFacts: [],
    })
    expect(preview.reminderReady).toBe(true)

    expect(
      RuleCoverageRowSchema.parse({
        jurisdiction: 'CA',
        sourceCount: 5,
        verifiedRuleCount: 5,
        candidateCount: 0,
        highPrioritySourceCount: 5,
        missingSourceCount: 1,
        requiredSourceCount: 12,
        missingSourceDomains: ['fiduciary_income_return'],
        sourceCoverageStatus: 'missing_source',
        entityCoverage: {
          llc: 'review',
          partnership: 'none',
          s_corp: 'active',
          c_corp: 'active',
          sole_prop: 'review',
          individual: 'review',
          trust: 'none',
        },
        entitySourceCoverage: {
          llc: 'rule_pending_review',
          partnership: 'source_verified',
          s_corp: 'rule_active',
          c_corp: 'rule_active',
          sole_prop: 'source_registered',
          individual: 'rule_pending_review',
          trust: 'missing_source',
        },
      }).jurisdiction,
    ).toBe('CA')
  })

  it('freezes opportunities.list lightweight business guidance shape', () => {
    // 2026-05-24 (critique P2): added dismiss + snooze mutations for
    // user-driven hide. See `opportunity_dismissal` schema + handler.
    // /polish follow-up grew restore + listDismissed for the un-dismiss
    // path on /opportunities.
    expect(Object.keys(opportunitiesContract)).toEqual([
      'list',
      'dismiss',
      'snooze',
      'restore',
      'listDismissed',
    ])
    expect(OpportunityKindSchema.options).toEqual([
      'advisory_conversation',
      'scope_review',
      'retention_check_in',
    ])

    expect(OpportunityListInputSchema.parse({ limit: 3 })?.limit).toBe(3)
    expect(
      OpportunityListOutputSchema.parse({
        opportunities: [
          {
            id: 'scope_review:client:11111111-1111-4111-8111-111111111111',
            kind: 'scope_review',
            client: {
              id: '11111111-1111-4111-8111-111111111111',
              name: 'Riverside Holdings LLC',
              entityType: 'llc',
              state: 'CA',
              assigneeName: 'Mina',
            },
            title: 'Review engagement scope before renewal',
            summary: 'Workload footprint suggests a human-led scope conversation.',
            timing: 'next_quarter',
            severity: 'medium',
            evidence: [{ label: 'Open obligations', value: '4' }],
            primaryAction: {
              label: 'Open client',
              href: '/clients?client=11111111-1111-4111-8111-111111111111',
            },
          },
        ],
        summary: {
          total: 1,
          advisoryConversationCount: 0,
          scopeReviewCount: 1,
          retentionCheckInCount: 0,
        },
      }).summary.scopeReviewCount,
    ).toBe(1)
  })

  it('mounts every domain on appContract', () => {
    expect(Object.keys(appContract)).toEqual(
      expect.arrayContaining([
        'clients',
        'obligations',
        'dashboard',
        'evidence',
        'workload',
        'pulse',
        'opportunities',
        'migration',
        'rules',
      ]),
    )
  })

  it('validates rule-backed manual creation input and output', () => {
    expect(
      ObligationCreateFromRuleInputSchema.parse({
        clientId: '33333333-3333-4333-8333-333333333333',
        ruleId: 'fed.7004.extension.1120s.2025',
        taxYear: 2026,
      }),
    ).toEqual({
      clientId: '33333333-3333-4333-8333-333333333333',
      ruleId: 'fed.7004.extension.1120s.2025',
      taxYear: 2026,
    })

    expect(
      ObligationCreateFromRulesInputSchema.parse({
        clientId: '33333333-3333-4333-8333-333333333333',
        selections: [
          { ruleId: 'fed.7004.extension.1120s.2025', taxYear: 2026 },
          { ruleId: 'ny.ct3s.return.2025', taxYear: 2026 },
        ],
      }),
    ).toEqual({
      clientId: '33333333-3333-4333-8333-333333333333',
      selections: [
        { ruleId: 'fed.7004.extension.1120s.2025', taxYear: 2026 },
        { ruleId: 'ny.ct3s.return.2025', taxYear: 2026 },
      ],
    })

    expect(
      ObligationCreateFromRuleOutputSchema.parse({
        obligations: [],
        duplicateCount: 1,
      }),
    ).toEqual({
      obligations: [],
      duplicateCount: 1,
    })
  })
})
