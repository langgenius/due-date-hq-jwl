import { oc } from '@orpc/contract'
import * as z from 'zod'
import {
  ClientTaxClassificationSchema,
  EntityTypeSchema,
  ObligationTypeSchema,
  TaxPeriodKindSchema,
  TaxPeriodSourceSchema,
} from './shared/enums'
import { EntityIdSchema } from './shared/ids'

export const RuleGenerationStateValues = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'DC',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
] as const

export const RuleJurisdictionValues = ['FED', ...RuleGenerationStateValues] as const

export const RuleJurisdictionSchema = z.enum(RuleJurisdictionValues)
export type RuleJurisdiction = z.infer<typeof RuleJurisdictionSchema>
export const RuleGenerationStateSchema = z.enum(RuleGenerationStateValues)
export type RuleGenerationState = z.infer<typeof RuleGenerationStateSchema>

export const RuleSourceTypeSchema = z.enum([
  'publication',
  'instructions',
  'due_dates',
  'calendar',
  'emergency_relief',
  'news',
  'form',
  'early_warning',
  'subscription',
])

export const AcquisitionMethodSchema = z.enum([
  'html_watch',
  'pdf_watch',
  'manual_review',
  'email_subscription',
  'api_watch',
])

export const SourceCadenceSchema = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'pre_season'])

export const SourcePrioritySchema = z.enum(['critical', 'high', 'medium', 'low'])
export const SourceHealthStatusSchema = z.enum(['healthy', 'degraded', 'failing', 'paused'])

export const AlertSourcePurposeSchema = z.enum([
  'explicit_live_adapter',
  'temporary_announcements_or_news',
  'rule_source_watch',
  'email_signal',
  'hidden_policy_watch',
])
export type AlertSourcePurpose = z.infer<typeof AlertSourcePurposeSchema>

export const RuleSourceDomainSchema = z.enum([
  'individual_income_return',
  'individual_estimated_tax',
  'fiduciary_income_return',
  'business_income_return',
  'business_estimated_tax',
  'pass_through_entity_return',
  'franchise_or_entity_tax',
  'sales_use_tax',
  'withholding',
  'ui_wage_report',
  'local_individual_income',
  'local_business_income',
  'local_employer_withholding',
  'local_services_tax',
])
export type RuleSourceDomain = z.infer<typeof RuleSourceDomainSchema>

export const RuleSourceCoverageStatusSchema = z.enum([
  'missing_source',
  'source_registered',
  'source_verified',
  'rule_pending_review',
  'rule_active',
  'not_applicable',
])
export type RuleSourceCoverageStatus = z.infer<typeof RuleSourceCoverageStatusSchema>

export const RuleNotificationChannelSchema = z.enum([
  'source_change',
  'practice_rule_review',
  'practice_rule_preview',
  'user_deadline_reminder',
])

export const EntityApplicabilitySchema = z.enum([
  'llc',
  'partnership',
  's_corp',
  'c_corp',
  'sole_prop',
  'trust',
  'individual',
  'any_business',
])

export const RuleEvidenceAuthorityRoleSchema = z.enum([
  'basis',
  'cross_check',
  'watch',
  'early_warning',
])
export type RuleEvidenceAuthorityRole = z.infer<typeof RuleEvidenceAuthorityRoleSchema>

export const LocalJurisdictionLevelSchema = z.enum([
  'state_administered_local',
  'county',
  'municipality',
  'school_district',
  'special_district',
])
export type LocalJurisdictionLevel = z.infer<typeof LocalJurisdictionLevelSchema>

export const LocalJurisdictionAdministeredBySchema = z.enum([
  'state',
  'local_collector',
  'municipal_authority',
])
export type LocalJurisdictionAdministeredBy = z.infer<typeof LocalJurisdictionAdministeredBySchema>

export const LocalJurisdictionCollectedViaSchema = z.enum([
  'state_return',
  'local_return',
  'employer_withholding',
  'manual_review',
])
export type LocalJurisdictionCollectedVia = z.infer<typeof LocalJurisdictionCollectedViaSchema>

export const LocalFactRequirementSchema = z.enum([
  'resident_county',
  'resident_municipality',
  'work_county',
  'work_municipality',
  'worksite_psd_code',
  'principal_office_municipality',
  'local_collector',
  'local_filing_channel',
  'local_tax_rate',
  'lst_exemption_status',
])
export type LocalFactRequirement = z.infer<typeof LocalFactRequirementSchema>

export const LocalJurisdictionRefSchema = z.object({
  level: LocalJurisdictionLevelSchema,
  state: RuleGenerationStateSchema,
  localCode: z.string().min(1),
  displayName: z.string().min(1),
  administeredBy: LocalJurisdictionAdministeredBySchema,
  collectedVia: LocalJurisdictionCollectedViaSchema,
  sourceAuthority: z.string().min(1),
})
export type LocalJurisdictionRef = z.infer<typeof LocalJurisdictionRefSchema>

export const SourceAdapterKindSchema = z.enum([
  'rss_or_announcement_list',
  'html_due_date_page',
  'html_announcement_list',
  'pdf_due_date_document',
  'pdf_index',
  'email_inbound',
])
export type SourceAdapterKind = z.infer<typeof SourceAdapterKindSchema>

export const RuleSourceSchema = z.object({
  id: z.string().min(1),
  jurisdiction: RuleJurisdictionSchema,
  localJurisdiction: LocalJurisdictionRefSchema.optional(),
  localFactRequirements: z.array(LocalFactRequirementSchema).min(1).optional(),
  title: z.string().min(1),
  url: z.url(),
  sourceType: RuleSourceTypeSchema,
  acquisitionMethod: AcquisitionMethodSchema,
  cadence: SourceCadenceSchema,
  priority: SourcePrioritySchema,
  healthStatus: SourceHealthStatusSchema,
  isEarlyWarning: z.boolean(),
  domains: z.array(RuleSourceDomainSchema).min(1),
  entityApplicability: z.array(EntityApplicabilitySchema).min(1),
  authorityRole: RuleEvidenceAuthorityRoleSchema,
  alertPurpose: AlertSourcePurposeSchema.optional(),
  notificationChannels: z.array(RuleNotificationChannelSchema),
  lastReviewedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adapterKind: SourceAdapterKindSchema.optional(),
  feedUrl: z.url().optional(),
})
export type RuleSource = z.infer<typeof RuleSourceSchema>

export const RuleGenerationEntitySchema = EntityTypeSchema

export const ObligationEventTypeSchema = z.enum([
  'filing',
  'payment',
  'deposit',
  'extension',
  'election',
  'information_report',
  'client_action',
  'internal_review',
])
export const RuleTierSchema = z.enum([
  'basic',
  'annual_rolling',
  'exception',
  'applicability_review',
])
export const RuleTemplateStatusSchema = z.enum(['available', 'deprecated'])
export type RuleTemplateStatus = z.infer<typeof RuleTemplateStatusSchema>
export const PracticeRuleStatusSchema = z.enum(['pending_review', 'active', 'rejected', 'archived'])
export type PracticeRuleStatus = z.infer<typeof PracticeRuleStatusSchema>
export const RuleReviewTaskStatusSchema = z.enum(['open', 'accepted', 'rejected', 'superseded'])
export type RuleReviewTaskStatus = z.infer<typeof RuleReviewTaskStatusSchema>
export const RuleStatusSchema = z.enum([
  'pending_review',
  'active',
  'rejected',
  'archived',
  'candidate',
  'verified',
  'deprecated',
])
export type RuleStatus = z.infer<typeof RuleStatusSchema>
export const RuleRiskLevelSchema = z.enum(['low', 'med', 'high'])
export const CoverageStatusSchema = z.enum(['full', 'skeleton', 'manual'])

export const DueDateLogicSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('fixed_date'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    holidayRollover: z.enum(['source_adjusted', 'next_business_day']),
  }),
  z.object({
    kind: z.literal('nth_day_after_tax_year_end'),
    monthOffset: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    holidayRollover: z.literal('next_business_day'),
  }),
  z.object({
    kind: z.literal('nth_day_after_tax_year_begin'),
    monthOffset: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    holidayRollover: z.literal('next_business_day'),
  }),
  z.object({
    kind: z.literal('period_table'),
    frequency: z.enum(['semiweekly', 'monthly', 'quarterly', 'annual']),
    periods: z.array(
      z.object({
        period: z.string().min(1),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    ),
    holidayRollover: z.literal('source_adjusted'),
  }),
  z.object({
    kind: z.literal('source_defined_calendar'),
    description: z.string().min(1),
    holidayRollover: z.enum(['source_adjusted', 'next_business_day']),
  }),
])
export type DueDateLogic = z.infer<typeof DueDateLogicSchema>

export const ConcreteDueDateLogicSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('fixed_date'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    holidayRollover: z.enum(['source_adjusted', 'next_business_day']),
  }),
  z.object({
    kind: z.literal('nth_day_after_tax_year_end'),
    monthOffset: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    holidayRollover: z.literal('next_business_day'),
  }),
  z.object({
    kind: z.literal('nth_day_after_tax_year_begin'),
    monthOffset: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    holidayRollover: z.literal('next_business_day'),
  }),
  z.object({
    kind: z.literal('period_table'),
    frequency: z.enum(['semiweekly', 'monthly', 'quarterly', 'annual']),
    periods: z.array(
      z.object({
        period: z.string().min(1),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    ),
    holidayRollover: z.literal('source_adjusted'),
  }),
])
export type ConcreteDueDateLogic = z.infer<typeof ConcreteDueDateLogicSchema>

export const ExtensionPolicySchema = z.object({
  available: z.boolean(),
  formName: z.string().min(1).optional(),
  durationMonths: z.number().positive().optional(),
  paymentExtended: z.boolean(),
  notes: z.string().min(1),
})

export const RuleQualityChecklistSchema = z.object({
  filingPaymentDistinguished: z.boolean(),
  extensionHandled: z.boolean(),
  calendarFiscalSpecified: z.boolean(),
  holidayRolloverHandled: z.boolean(),
  crossVerified: z.boolean(),
  exceptionChannel: z.boolean(),
})

export const RuleEvidenceLocatorSchema = z.object({
  kind: z.enum(['html', 'pdf', 'table', 'api', 'email_subscription']),
  heading: z.string().min(1).optional(),
  selector: z.string().min(1).optional(),
  pdfPage: z.number().int().positive().optional(),
  tableLabel: z.string().min(1).optional(),
  rowLabel: z.string().min(1).optional(),
})
export type RuleEvidenceLocator = z.infer<typeof RuleEvidenceLocatorSchema>

export const RuleEvidenceSchema = z.object({
  sourceId: z.string().min(1),
  aiOutputId: EntityIdSchema.nullable().optional(),
  authorityRole: RuleEvidenceAuthorityRoleSchema,
  locator: RuleEvidenceLocatorSchema,
  summary: z.string().min(1),
  sourceExcerpt: z.string().min(1),
  retrievedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sourceUpdatedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})
export type RuleEvidence = z.infer<typeof RuleEvidenceSchema>

export const ObligationRuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  jurisdiction: RuleJurisdictionSchema,
  localJurisdiction: LocalJurisdictionRefSchema.optional(),
  localFactRequirements: z.array(LocalFactRequirementSchema).min(1).optional(),
  entityApplicability: z.array(EntityApplicabilitySchema),
  taxType: z.string().min(1),
  formName: z.string().min(1),
  eventType: ObligationEventTypeSchema,
  obligationType: ObligationTypeSchema.optional(),
  isFiling: z.boolean(),
  isPayment: z.boolean(),
  taxYear: z.number().int().min(2000).max(2100),
  applicableYear: z.number().int().min(2000).max(2100),
  predecessorRuleId: z.string().min(1).optional(),
  ruleTier: RuleTierSchema,
  status: RuleStatusSchema,
  coverageStatus: CoverageStatusSchema,
  riskLevel: RuleRiskLevelSchema,
  requiresApplicabilityReview: z.boolean(),
  dueDateLogic: DueDateLogicSchema,
  extensionPolicy: ExtensionPolicySchema,
  sourceIds: z.array(z.string().min(1)),
  evidence: z.array(RuleEvidenceSchema),
  defaultTip: z.string().min(1),
  quality: RuleQualityChecklistSchema,
  verifiedBy: z.string().min(1),
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedByName: z.string().min(1).optional(),
  reviewedAt: z.iso.datetime().optional(),
  nextReviewOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  version: z.number().int().positive(),
})
export type ObligationRule = z.infer<typeof ObligationRuleSchema>

export const RuleCoverageRowSchema = z.object({
  jurisdiction: RuleJurisdictionSchema,
  sourceCount: z.number().int().nonnegative(),
  verifiedRuleCount: z.number().int().nonnegative(),
  candidateCount: z.number().int().nonnegative(),
  highPrioritySourceCount: z.number().int().nonnegative(),
  missingSourceCount: z.number().int().nonnegative(),
  requiredSourceCount: z.number().int().nonnegative(),
  missingSourceDomains: z.array(RuleSourceDomainSchema).optional(),
  sourceCoverageStatus: RuleSourceCoverageStatusSchema,
  activeRuleCount: z.number().int().nonnegative().optional(),
  pendingReviewCount: z.number().int().nonnegative().optional(),
  rejectedRuleCount: z.number().int().nonnegative().optional(),
  archivedRuleCount: z.number().int().nonnegative().optional(),
  customRuleCount: z.number().int().nonnegative().optional(),
  entityCoverage: z.object({
    llc: z.enum(['active', 'review', 'none']),
    partnership: z.enum(['active', 'review', 'none']),
    s_corp: z.enum(['active', 'review', 'none']),
    c_corp: z.enum(['active', 'review', 'none']),
    sole_prop: z.enum(['active', 'review', 'none']),
    individual: z.enum(['active', 'review', 'none']),
    trust: z.enum(['active', 'review', 'none']),
  }),
  entitySourceCoverage: z.object({
    llc: RuleSourceCoverageStatusSchema,
    partnership: RuleSourceCoverageStatusSchema,
    s_corp: RuleSourceCoverageStatusSchema,
    c_corp: RuleSourceCoverageStatusSchema,
    sole_prop: RuleSourceCoverageStatusSchema,
    individual: RuleSourceCoverageStatusSchema,
    trust: RuleSourceCoverageStatusSchema,
  }),
})
export type RuleCoverageRow = z.infer<typeof RuleCoverageRowSchema>

export const RuleGenerationClientFactsSchema = z.object({
  id: z.string().min(1),
  entityType: RuleGenerationEntitySchema,
  taxClassification: ClientTaxClassificationSchema.optional(),
  state: RuleGenerationStateSchema,
  taxTypes: z.array(z.string().min(1)),
  taxYearStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  taxYearEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  taxYearType: z.enum(['calendar', 'fiscal']).nullable().optional(),
  fiscalYearEndMonth: z.number().int().min(1).max(12).nullable().optional(),
  fiscalYearEndDay: z.number().int().min(1).max(31).nullable().optional(),
  taxPeriodSource: TaxPeriodSourceSchema.optional(),
  localFacts: z.partialRecord(LocalFactRequirementSchema, z.string().min(1)).optional(),
})
export type RuleGenerationClientFacts = z.infer<typeof RuleGenerationClientFactsSchema>

export const RuleGenerationPreviewInputSchema = z.object({
  client: RuleGenerationClientFactsSchema,
  holidays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
})
export type RuleGenerationPreviewInput = z.infer<typeof RuleGenerationPreviewInputSchema>

export const RuleGenerationMissingClientFactSchema = z.enum([
  'fiscalYearEnd',
  'resident_county',
  'resident_municipality',
  'work_county',
  'work_municipality',
  'worksite_psd_code',
  'principal_office_municipality',
  'local_collector',
  'local_filing_channel',
  'local_tax_rate',
  'lst_exemption_status',
])
export type RuleGenerationMissingClientFact = z.infer<typeof RuleGenerationMissingClientFactSchema>

export const ObligationGenerationPreviewSchema = z.object({
  clientId: z.string().min(1),
  ruleId: z.string().min(1),
  ruleVersion: z.number().int().positive(),
  ruleTitle: z.string().min(1),
  jurisdiction: RuleJurisdictionSchema,
  localJurisdiction: LocalJurisdictionRefSchema.optional(),
  localFactRequirements: z.array(LocalFactRequirementSchema).min(1).optional(),
  taxType: z.string().min(1),
  matchedTaxType: z.string().min(1),
  period: z.string().min(1),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  taxPeriodStart: z.iso.date().nullable(),
  taxPeriodEnd: z.iso.date().nullable(),
  taxPeriodKind: TaxPeriodKindSchema,
  taxPeriodSource: TaxPeriodSourceSchema,
  taxPeriodReviewReason: z.string().min(1).nullable(),
  eventType: ObligationEventTypeSchema,
  isFiling: z.boolean(),
  isPayment: z.boolean(),
  formName: z.string().min(1),
  sourceIds: z.array(z.string().min(1)),
  evidence: z.array(RuleEvidenceSchema),
  requiresReview: z.boolean(),
  reminderReady: z.boolean(),
  reviewReasons: z.array(z.string().min(1)),
  missingClientFacts: z.array(RuleGenerationMissingClientFactSchema),
})
export type ObligationGenerationPreview = z.infer<typeof ObligationGenerationPreviewSchema>

export const RuleReviewDecisionStatusSchema = z.enum(['verified', 'rejected'])
export type RuleReviewDecisionStatus = z.infer<typeof RuleReviewDecisionStatusSchema>

export const RuleReviewDecisionSchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  baseVersion: z.number().int().positive(),
  status: RuleReviewDecisionStatusSchema,
  rule: ObligationRuleSchema.nullable(),
  reviewNote: z.string().nullable(),
  reviewedBy: z.string().min(1),
  reviewedAt: z.string().datetime(),
})
export type RuleReviewDecision = z.infer<typeof RuleReviewDecisionSchema>

export const RuleReviewTaskReasonSchema = z.enum([
  'new_template',
  'source_changed',
  'pulse_signal',
  'custom_edit',
  'annual_review',
])
export type RuleReviewTaskReason = z.infer<typeof RuleReviewTaskReasonSchema>

export const RuleReviewTaskSchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  templateVersion: z.number().int().positive(),
  status: RuleReviewTaskStatusSchema,
  reason: RuleReviewTaskReasonSchema,
  rule: ObligationRuleSchema,
  reviewNote: z.string().nullable(),
  reviewedBy: z.string().min(1).nullable(),
  reviewedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type RuleReviewTask = z.infer<typeof RuleReviewTaskSchema>

export const RuleReviewTaskListInputSchema = z
  .object({
    status: RuleReviewTaskStatusSchema.optional(),
    jurisdiction: RuleJurisdictionSchema.optional(),
  })
  .optional()
export type RuleReviewTaskListInput = z.infer<typeof RuleReviewTaskListInputSchema>

const RuleVersionSelectionSchema = z.object({
  ruleId: z.string().min(1),
  expectedVersion: z.number().int().positive(),
})
export type RuleVersionSelection = z.infer<typeof RuleVersionSelectionSchema>

export const RuleAcceptTemplateInputSchema = RuleVersionSelectionSchema.extend({
  reviewNote: z.string().trim().min(1).max(1000),
})
export type RuleAcceptTemplateInput = z.infer<typeof RuleAcceptTemplateInputSchema>

export const RuleBulkAcceptTemplatesInputSchema = z.object({
  rules: z.array(RuleVersionSelectionSchema).min(1).max(100),
  reviewNote: z.string().trim().min(1).max(1000),
})
export type RuleBulkAcceptTemplatesInput = z.infer<typeof RuleBulkAcceptTemplatesInputSchema>

export const RuleBulkAcceptSkipSchema = z.object({
  ruleId: z.string().min(1),
  expectedVersion: z.number().int().positive().nullable(),
  reason: z.enum([
    'template_not_found',
    'version_conflict',
    'already_active',
    'rejected',
    'archived',
    'invalid_template',
    'source_changed_requires_review',
    'source_drifted_requires_review',
    'source_defined_requires_ai_review',
    'substantive_requires_review',
  ]),
})
export type RuleBulkAcceptSkip = z.infer<typeof RuleBulkAcceptSkipSchema>

export const RuleBulkAcceptTemplatesOutputSchema = z.object({
  accepted: z.array(RuleReviewTaskSchema),
  skipped: z.array(RuleBulkAcceptSkipSchema),
})
export type RuleBulkAcceptTemplatesOutput = z.infer<typeof RuleBulkAcceptTemplatesOutputSchema>

// Year-over-year review diff (serialized shape of @duedatehq/core's RuleDiff).
export const RuleFieldDiffSchema = z.object({
  field: z.string().min(1),
  kind: z.enum(['date', 'substantive']),
  before: z.unknown(),
  after: z.unknown(),
})
export type RuleFieldDiff = z.infer<typeof RuleFieldDiffSchema>

export const RuleDiffSchema = z.object({
  hasPredecessor: z.boolean(),
  classification: z.enum(['new', 'date_only', 'substantive']),
  fields: z.array(RuleFieldDiffSchema),
})
export type RuleDiff = z.infer<typeof RuleDiffSchema>

// Carry-forward bulk accept: like bulkAcceptTemplates but classifies each rule
// against its predecessor and skips substantive changes unless explicitly forced.
export const RuleBulkAcceptCarryforwardInputSchema = z.object({
  rules: z.array(RuleVersionSelectionSchema).min(1).max(100),
  reviewNote: z.string().trim().min(1).max(1000),
  // Rule ids the reviewer accepts despite a substantive (non-date-only) change.
  forceRuleIds: z.array(z.string().min(1)).optional(),
})
export type RuleBulkAcceptCarryforwardInput = z.infer<typeof RuleBulkAcceptCarryforwardInputSchema>

export const RuleOnboardingActivationInputSchema = z.object({
  states: z.array(RuleGenerationStateSchema).max(RuleGenerationStateValues.length),
})
export type RuleOnboardingActivationInput = z.infer<typeof RuleOnboardingActivationInputSchema>

export const RuleOnboardingActivationOutputSchema = z.object({
  selectedStates: z.array(RuleGenerationStateSchema),
  jurisdictions: z.array(RuleJurisdictionSchema),
  activatedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  reviewRequiredCount: z.number().int().nonnegative(),
  reviewRequiredJurisdictions: z.array(RuleJurisdictionSchema),
  generatedObligationCount: z.number().int().nonnegative(),
})
export type RuleOnboardingActivationOutput = z.infer<typeof RuleOnboardingActivationOutputSchema>

export const RuleRejectTemplateInputSchema = RuleVersionSelectionSchema.extend({
  reason: z.string().trim().min(1).max(1000),
})
export type RuleRejectTemplateInput = z.infer<typeof RuleRejectTemplateInputSchema>

export const RuleCustomRuleInputSchema = z.object({
  rule: ObligationRuleSchema,
  reviewNote: z.string().trim().min(1).max(1000),
})
export type RuleCustomRuleInput = z.infer<typeof RuleCustomRuleInputSchema>

export const RuleArchivePracticeRuleInputSchema = z.object({
  ruleId: z.string().min(1),
  reason: z.string().trim().min(1).max(1000),
})
export type RuleArchivePracticeRuleInput = z.infer<typeof RuleArchivePracticeRuleInputSchema>

export const RuleImpactDistributionRowSchema = z.object({
  key: z.string().min(1),
  count: z.number().int().nonnegative(),
})
export type RuleImpactDistributionRow = z.infer<typeof RuleImpactDistributionRowSchema>

export const RuleBulkImpactPreviewInputSchema = z.object({
  rules: z.array(RuleVersionSelectionSchema).min(1).max(100),
})
export type RuleBulkImpactPreviewInput = z.infer<typeof RuleBulkImpactPreviewInputSchema>

export const RuleBulkImpactPreviewSchema = z.object({
  selectedCount: z.number().int().nonnegative(),
  acceptReadyCount: z.number().int().nonnegative(),
  skipped: z.array(RuleBulkAcceptSkipSchema),
  jurisdictionCounts: z.array(RuleImpactDistributionRowSchema),
  entityCounts: z.array(RuleImpactDistributionRowSchema),
  formCounts: z.array(RuleImpactDistributionRowSchema),
  reviewReasonCounts: z.array(RuleImpactDistributionRowSchema),
  // Year-over-year classification across the accept-ready selections, so the
  // bulk dialog can show "N date-only · M need individual review".
  classificationCounts: z.object({
    new: z.number().int().nonnegative(),
    date_only: z.number().int().nonnegative(),
    substantive: z.number().int().nonnegative(),
  }),
  sourceCount: z.number().int().nonnegative(),
  estimatedObligationCount: z.number().int().nonnegative(),
})
export type RuleBulkImpactPreview = z.infer<typeof RuleBulkImpactPreviewSchema>

export const TemporaryRuleStatusSchema = z.enum(['active', 'reverted', 'retracted', 'expired'])
export type TemporaryRuleStatus = z.infer<typeof TemporaryRuleStatusSchema>

export const TemporaryRuleSchema = z.object({
  id: z.string().min(1),
  alertId: z.string().min(1).nullable(),
  sourcePulseId: z.string().min(1).nullable(),
  title: z.string().min(1),
  sourceUrl: z.url().nullable(),
  sourceExcerpt: z.string().nullable(),
  jurisdiction: z.string().min(1),
  counties: z.array(z.string()),
  affectedForms: z.array(z.string()),
  affectedEntityTypes: z.array(z.string()),
  overrideType: z.enum(['extend_due_date', 'waive_penalty']),
  overrideDueDate: z.iso.date().nullable(),
  effectiveFrom: z.iso.date().nullable(),
  effectiveUntil: z.iso.date().nullable(),
  status: TemporaryRuleStatusSchema,
  appliedObligationCount: z.number().int().min(0),
  activeObligationCount: z.number().int().min(0),
  revertedObligationCount: z.number().int().min(0),
  firstAppliedAt: z.iso.datetime().nullable(),
  lastActivityAt: z.iso.datetime(),
})
export type TemporaryRule = z.infer<typeof TemporaryRuleSchema>

export const RulesReviewListInputSchema = z
  .object({
    status: RuleReviewDecisionStatusSchema.optional(),
  })
  .optional()
export type RulesReviewListInput = z.infer<typeof RulesReviewListInputSchema>

export const RuleVerifyCandidateInputSchema = z.object({
  ruleId: z.string().min(1),
  sourceId: z.string().min(1),
  aiOutputId: EntityIdSchema,
  reviewNote: z.string().trim().max(1000).optional(),
})
export type RuleVerifyCandidateInput = z.infer<typeof RuleVerifyCandidateInputSchema>

export const RuleDraftConcreteRuleInputSchema = z.object({
  ruleId: z.string().min(1),
  sourceId: z.string().min(1),
})
export type RuleDraftConcreteRuleInput = z.infer<typeof RuleDraftConcreteRuleInputSchema>

export const RuleConcreteDraftSchema = z.object({
  aiOutputId: EntityIdSchema,
  dueDateLogic: ConcreteDueDateLogicSchema,
  extensionPolicy: ExtensionPolicySchema,
  coverageStatus: CoverageStatusSchema,
  requiresApplicabilityReview: z.boolean(),
  quality: RuleQualityChecklistSchema,
  sourceHeading: z.string().min(1),
  sourceExcerpt: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
})
export type RuleConcreteDraft = z.infer<typeof RuleConcreteDraftSchema>

export const RuleListConcreteDraftsInputSchema = z.object({
  rules: z.array(RuleDraftConcreteRuleInputSchema).max(500),
})
export type RuleListConcreteDraftsInput = z.infer<typeof RuleListConcreteDraftsInputSchema>

export const RuleConcreteDraftCacheEntrySchema = z.object({
  ruleId: z.string().min(1),
  sourceId: z.string().min(1),
  draft: RuleConcreteDraftSchema,
})
export type RuleConcreteDraftCacheEntry = z.infer<typeof RuleConcreteDraftCacheEntrySchema>

export const RuleBulkVerifyCandidateSelectionSchema = z.object({
  ruleId: z.string().min(1),
  sourceId: z.string().min(1),
  aiOutputId: EntityIdSchema,
})
export type RuleBulkVerifyCandidateSelection = z.infer<
  typeof RuleBulkVerifyCandidateSelectionSchema
>

export const RuleBulkVerifyCandidatesInputSchema = z.object({
  rules: z.array(RuleBulkVerifyCandidateSelectionSchema).min(1).max(100),
  reviewNote: z.string().trim().min(1).max(1000),
})
export type RuleBulkVerifyCandidatesInput = z.infer<typeof RuleBulkVerifyCandidatesInputSchema>

export const RuleBulkVerifyCandidateSkipSchema = z.object({
  ruleId: z.string().min(1),
  sourceId: z.string().min(1).nullable(),
  reason: z.enum([
    'rule_not_found',
    'not_source_defined',
    'draft_not_found',
    'draft_mismatch',
    'already_active',
    'rejected',
    'archived',
    'source_changed_requires_review',
    'source_drifted_requires_review',
    'low_trust_requires_review',
    'draft_stale_source',
    'no_open_task',
    'validation_failed',
  ]),
})
export type RuleBulkVerifyCandidateSkip = z.infer<typeof RuleBulkVerifyCandidateSkipSchema>

export const RuleBulkVerifyCandidatesOutputSchema = z.object({
  verified: z.array(RuleReviewDecisionSchema),
  skipped: z.array(RuleBulkVerifyCandidateSkipSchema),
})
export type RuleBulkVerifyCandidatesOutput = z.infer<typeof RuleBulkVerifyCandidatesOutputSchema>

export const RuleRejectCandidateInputSchema = z.object({
  ruleId: z.string().min(1),
  reason: z.string().trim().min(1).max(1000),
})
export type RuleRejectCandidateInput = z.infer<typeof RuleRejectCandidateInputSchema>

export const RulesListInputSchema = z
  .object({
    jurisdiction: RuleJurisdictionSchema.optional(),
    status: RuleStatusSchema.optional(),
    includeCandidates: z.boolean().optional(),
  })
  .optional()
export type RulesListInput = z.infer<typeof RulesListInputSchema>

export const RuleSourcesListInputSchema = z
  .object({
    jurisdiction: RuleJurisdictionSchema.optional(),
  })
  .optional()
export type RuleSourcesListInput = z.infer<typeof RuleSourcesListInputSchema>

export const rulesContract = oc.router({
  listSources: oc.input(RuleSourcesListInputSchema).output(z.array(RuleSourceSchema)),
  listRules: oc.input(RulesListInputSchema).output(z.array(ObligationRuleSchema)),
  listTemporaryRules: oc.input(z.undefined()).output(z.array(TemporaryRuleSchema)),
  listReviewTasks: oc.input(RuleReviewTaskListInputSchema).output(z.array(RuleReviewTaskSchema)),
  listReviewDecisions: oc
    .input(RulesReviewListInputSchema)
    .output(z.array(RuleReviewDecisionSchema)),
  acceptTemplate: oc.input(RuleAcceptTemplateInputSchema).output(RuleReviewTaskSchema),
  bulkAcceptTemplates: oc
    .input(RuleBulkAcceptTemplatesInputSchema)
    .output(RuleBulkAcceptTemplatesOutputSchema),
  diffAgainstPredecessor: oc.input(RuleVersionSelectionSchema).output(RuleDiffSchema),
  bulkAcceptCarryforward: oc
    .input(RuleBulkAcceptCarryforwardInputSchema)
    .output(RuleBulkAcceptTemplatesOutputSchema),
  activateOnboardingJurisdictions: oc
    .input(RuleOnboardingActivationInputSchema)
    .output(RuleOnboardingActivationOutputSchema),
  rejectTemplate: oc.input(RuleRejectTemplateInputSchema).output(RuleReviewTaskSchema),
  createCustomRule: oc.input(RuleCustomRuleInputSchema).output(RuleReviewTaskSchema),
  updatePracticeRule: oc.input(RuleCustomRuleInputSchema).output(RuleReviewTaskSchema),
  archivePracticeRule: oc.input(RuleArchivePracticeRuleInputSchema).output(RuleReviewTaskSchema),
  previewRuleImpact: oc.input(RuleVersionSelectionSchema).output(RuleBulkImpactPreviewSchema),
  previewBulkRuleImpact: oc
    .input(RuleBulkImpactPreviewInputSchema)
    .output(RuleBulkImpactPreviewSchema),
  draftConcreteRule: oc.input(RuleDraftConcreteRuleInputSchema).output(RuleConcreteDraftSchema),
  listConcreteDrafts: oc
    .input(RuleListConcreteDraftsInputSchema)
    .output(z.array(RuleConcreteDraftCacheEntrySchema)),
  verifyCandidate: oc.input(RuleVerifyCandidateInputSchema).output(RuleReviewDecisionSchema),
  bulkVerifyCandidates: oc
    .input(RuleBulkVerifyCandidatesInputSchema)
    .output(RuleBulkVerifyCandidatesOutputSchema),
  rejectCandidate: oc.input(RuleRejectCandidateInputSchema).output(RuleReviewDecisionSchema),
  coverage: oc.input(z.undefined()).output(z.array(RuleCoverageRowSchema)),
  previewObligations: oc
    .input(RuleGenerationPreviewInputSchema)
    .output(z.array(ObligationGenerationPreviewSchema)),
})
export type RulesContract = typeof rulesContract
