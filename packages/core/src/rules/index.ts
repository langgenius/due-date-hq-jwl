import { expandDueDateLogic } from '../date-logic'
import {
  resolveClientReturnTaxPeriod,
  resolveTaxPeriodFromExplicitDates,
  type TaxPeriodKind,
  type TaxPeriodMissingClientFact,
  type TaxPeriodSource,
} from '../tax-periods'

export const STATE_RULE_JURISDICTIONS = [
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

export const MVP_RULE_JURISDICTIONS = ['FED', ...STATE_RULE_JURISDICTIONS] as const

export type RuleJurisdiction = (typeof MVP_RULE_JURISDICTIONS)[number]
export type RuleGenerationState = (typeof STATE_RULE_JURISDICTIONS)[number]

export type RuleSourceType =
  | 'publication'
  | 'instructions'
  | 'due_dates'
  | 'calendar'
  | 'emergency_relief'
  | 'news'
  | 'form'
  | 'early_warning'
  | 'subscription'

export type AcquisitionMethod =
  | 'html_watch'
  | 'pdf_watch'
  | 'manual_review'
  | 'email_subscription'
  | 'api_watch'

export type SourceCadence = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'pre_season'
export type SourcePriority = 'critical' | 'high' | 'medium' | 'low'
export type SourceHealthStatus = 'healthy' | 'degraded' | 'failing' | 'paused'
export type SourceAdapterKind =
  | 'rss_or_announcement_list'
  | 'html_due_date_page'
  | 'html_announcement_list'
  | 'pdf_due_date_document'
  | 'pdf_index'
  | 'email_inbound'

export type RuleSourceDomain =
  | 'individual_income_return'
  | 'individual_estimated_tax'
  | 'fiduciary_income_return'
  | 'business_income_return'
  | 'business_estimated_tax'
  | 'pass_through_entity_return'
  | 'franchise_or_entity_tax'
  | 'sales_use_tax'
  | 'withholding'
  | 'ui_wage_report'
  | 'local_individual_income'
  | 'local_business_income'
  | 'local_employer_withholding'
  | 'local_services_tax'

export type SourceCoverageStatus =
  | 'missing_source'
  | 'source_registered'
  | 'source_verified'
  | 'rule_pending_review'
  | 'rule_active'
  | 'not_applicable'

export type RuleNotificationChannel =
  | 'source_change'
  | 'practice_rule_review'
  | 'practice_rule_preview'
  | 'user_deadline_reminder'

export type AlertSourceCoverageRole =
  | 'primary_web_news'
  | 'guidance_notice'
  | 'email_signal'
  | 'rule_source_watch'
  | 'tax_type_sources'
  | 'relief_or_disaster_signal'
  | 'rights_window_signal'
  | 'multi_agency_sources'

export type SourceVerificationStatus =
  | 'verified'
  | 'manual_verification_required'
  | 'not_available_verified'

export type InboundEmailVerificationStatus = 'verified_official' | 'routing_only'

export type LocalJurisdictionLevel =
  | 'state_administered_local'
  | 'county'
  | 'municipality'
  | 'school_district'
  | 'special_district'

export type LocalJurisdictionAdministeredBy = 'state' | 'local_collector' | 'municipal_authority'

export type LocalJurisdictionCollectedVia =
  | 'state_return'
  | 'local_return'
  | 'employer_withholding'
  | 'manual_review'

export type LocalFactRequirement =
  | 'resident_county'
  | 'resident_municipality'
  | 'work_county'
  | 'work_municipality'
  | 'worksite_psd_code'
  | 'principal_office_municipality'
  | 'local_collector'
  | 'local_filing_channel'
  | 'local_tax_rate'
  | 'lst_exemption_status'

export type RuleGenerationMissingClientFact = TaxPeriodMissingClientFact | LocalFactRequirement

export interface LocalJurisdictionRef {
  level: LocalJurisdictionLevel
  state: RuleGenerationState
  localCode: string
  displayName: string
  administeredBy: LocalJurisdictionAdministeredBy
  collectedVia: LocalJurisdictionCollectedVia
  sourceAuthority: string
}

export interface InboundEmailRuleSourceConfig {
  localParts: readonly string[]
  senderDomains: readonly string[]
  listIdPatterns: readonly string[]
  canonicalUrlHosts: readonly string[]
  accountCodes?: readonly string[]
  verificationStatus?: InboundEmailVerificationStatus
  subscriptionUrl?: string
  verificationNotes?: string
}

export type AlertSourcePurpose =
  | 'explicit_live_adapter'
  | 'temporary_announcements_or_news'
  | 'rule_source_watch'
  | 'email_signal'
  | 'hidden_policy_watch'

export interface RuleSource {
  id: string
  jurisdiction: RuleJurisdiction
  localJurisdiction?: LocalJurisdictionRef
  localFactRequirements?: readonly LocalFactRequirement[]
  title: string
  url: string
  sourceType: RuleSourceType
  acquisitionMethod: AcquisitionMethod
  cadence: SourceCadence
  priority: SourcePriority
  healthStatus: SourceHealthStatus
  isEarlyWarning: boolean
  domains: readonly RuleSourceDomain[]
  entityApplicability: readonly EntityApplicability[]
  authorityRole: RuleEvidenceAuthorityRole
  alertPurpose: AlertSourcePurpose
  alertCoverageRoles?: readonly AlertSourceCoverageRole[]
  notificationChannels: readonly RuleNotificationChannel[]
  lastReviewedOn: string
  /**
   * Real publication / revision date of the source document as published by the
   * issuing authority — e.g. an IRS instruction's "Rev. MM/YYYY" date, or a
   * living IRS page's "Page Last Reviewed or Updated" stamp. Distinct from
   * `lastReviewedOn` (the date WE last reviewed the source). Drives the rule
   * library "Effective" column via the server-derived `effectiveOn`. Optional:
   * authored only where a genuine source date is known (federal sources today);
   * rules whose basis source has none fall back to the rule's `verifiedAt`.
   */
  publishedOn?: string
  adapterKind?: SourceAdapterKind
  // Initial pulse-source baseline override. 'backfill' makes the first scan
  // enqueue items already on the page (instead of baselining them out) so an
  // already-published, still-open window can enter ingest. Omit for the default.
  initialBaselineMode?: 'backfill'
  feedUrl?: string
  inboundEmail?: InboundEmailRuleSourceConfig
  sourceAgency?: string
  verificationStatus?: SourceVerificationStatus
  verifiedOn?: string
  sourceNotes?: string
}

export type EntityApplicability =
  | 'llc'
  | 'partnership'
  | 's_corp'
  | 'c_corp'
  | 'sole_prop'
  | 'trust'
  | 'individual'
  | 'any_business'

export const RULE_SOURCE_DOMAINS = [
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
] as const satisfies readonly RuleSourceDomain[]

export const RULE_SOURCE_COVERAGE_ENTITIES = [
  'llc',
  'partnership',
  's_corp',
  'c_corp',
  'sole_prop',
  'individual',
  'trust',
] as const satisfies readonly Exclude<EntityApplicability, 'any_business'>[]

export type RuleSourceCoverageEntity = (typeof RULE_SOURCE_COVERAGE_ENTITIES)[number]

export type ObligationEventType =
  | 'filing'
  | 'payment'
  | 'deposit'
  | 'extension'
  | 'election'
  | 'information_report'
  | 'client_action'
  | 'internal_review'
export type ObligationType =
  | 'filing'
  | 'payment'
  | 'deposit'
  | 'information'
  | 'client_action'
  | 'internal_review'
export type RuleTier = 'basic' | 'annual_rolling' | 'exception' | 'applicability_review'
export type RuleStatus = 'candidate' | 'verified' | 'deprecated'
export type RuleRiskLevel = 'low' | 'med' | 'high'
export type CoverageStatus = 'full' | 'skeleton' | 'manual'

export type DueDateLogic =
  | {
      kind: 'fixed_date'
      date: string
      holidayRollover: 'source_adjusted' | 'next_business_day'
    }
  | {
      kind: 'nth_day_after_tax_year_end'
      monthOffset: number
      day: number
      holidayRollover: 'next_business_day'
    }
  | {
      kind: 'nth_day_after_tax_year_begin'
      monthOffset: number
      day: number
      holidayRollover: 'next_business_day'
    }
  | {
      kind: 'period_table'
      frequency: 'semiweekly' | 'monthly' | 'quarterly' | 'annual'
      periods: readonly { period: string; dueDate: string }[]
      holidayRollover: 'source_adjusted'
    }
  | {
      kind: 'source_defined_calendar'
      description: string
      holidayRollover: 'source_adjusted' | 'next_business_day'
    }

export interface ExtensionPolicy {
  available: boolean
  formName?: string
  durationMonths?: number
  paymentExtended: boolean
  notes: string
}

export interface RuleQualityChecklist {
  filingPaymentDistinguished: boolean
  extensionHandled: boolean
  calendarFiscalSpecified: boolean
  holidayRolloverHandled: boolean
  crossVerified: boolean
  exceptionChannel: boolean
}

export type RuleEvidenceAuthorityRole = 'basis' | 'cross_check' | 'watch' | 'early_warning'

export interface RuleEvidenceLocator {
  kind: 'html' | 'pdf' | 'table' | 'api' | 'email_subscription'
  heading?: string
  selector?: string
  pdfPage?: number
  tableLabel?: string
  rowLabel?: string
}

export interface RuleEvidence {
  sourceId: string
  aiOutputId?: string | null
  authorityRole: RuleEvidenceAuthorityRole
  locator: RuleEvidenceLocator
  summary: string
  sourceExcerpt: string
  retrievedAt: string
  sourceUpdatedOn?: string
}

export interface ObligationRule {
  id: string
  title: string
  jurisdiction: RuleJurisdiction
  localJurisdiction?: LocalJurisdictionRef
  localFactRequirements?: readonly LocalFactRequirement[]
  entityApplicability: readonly EntityApplicability[]
  taxType: string
  formName: string
  eventType: ObligationEventType
  obligationType?: ObligationType
  isFiling: boolean
  isPayment: boolean
  taxYear: number
  applicableYear: number
  /**
   * Prior filing-year equivalent of this rule, for year-over-year review diffs.
   * Authored when a new annual cohort is added; absent on the first-ever cohort
   * (then the rule reviews "cold" with no predecessor to diff against).
   */
  predecessorRuleId?: string
  ruleTier: RuleTier
  status: RuleStatus
  coverageStatus: CoverageStatus
  riskLevel: RuleRiskLevel
  requiresApplicabilityReview: boolean
  dueDateLogic: DueDateLogic
  extensionPolicy: ExtensionPolicy
  sourceIds: readonly string[]
  evidence: readonly RuleEvidence[]
  defaultTip: string
  quality: RuleQualityChecklist
  verifiedBy: string
  verifiedAt: string
  reviewedByName?: string
  reviewedAt?: string
  nextReviewOn: string
  version: number
}

export {
  derivePredecessorRuleIdFromToken,
  diffObligationRules,
  isDateOnlyDueDateLogicChange,
  resolvePredecessorRuleId,
} from './rule-diff'
export type { RuleDiff, RuleDiffClassification, RuleFieldDiff } from './rule-diff'
export {
  detectNewCohort,
  expectedCatalogReleaseDate,
  MIN_NEW_COHORT_SIZE,
  substantialCohortYears,
} from './catalog-release'
export type { RuleCohort } from './catalog-release'
export {
  PIPELINE_LIVE_SINCE,
  RECALL_GROUND_TRUTH_EVENTS,
  RECALL_LAG_BUDGET_DEFAULT_DAYS,
} from './recall-events'
export type {
  RecallEventOrigin,
  RecallExpectedChangeKind,
  RecallGroundTruthEvent,
} from './recall-events'

export type RuleGenerationEntity = Exclude<EntityApplicability, 'any_business'> | 'other'

export interface RuleGenerationClientFacts {
  id: string
  entityType: RuleGenerationEntity
  taxClassification?:
    | 'individual'
    | 'disregarded_entity'
    | 'partnership'
    | 's_corp'
    | 'c_corp'
    | 'trust'
    | 'estate'
    | 'nonprofit'
    | 'foreign_reporting_company'
    | 'unknown'
  state: RuleGenerationState
  taxTypes: readonly string[]
  taxYearStart?: string
  taxYearEnd?: string
  taxYearType?: 'calendar' | 'fiscal' | null
  fiscalYearEndMonth?: number | null
  fiscalYearEndDay?: number | null
  taxPeriodSource?: TaxPeriodSource
  localFacts?: Partial<Record<LocalFactRequirement, string>>
}

export interface RuleGenerationInput {
  client: RuleGenerationClientFacts
  rules?: readonly ObligationRule[]
  holidays?: readonly string[]
}

export interface RuleTaxTypeCandidate {
  inputTaxType: string
  taxType: string
  requiresReview: boolean
  reviewReason: string | null
}

export interface ObligationGenerationPreview {
  clientId: string
  ruleId: string
  ruleVersion: number
  ruleTitle: string
  jurisdiction: RuleJurisdiction
  localJurisdiction?: LocalJurisdictionRef
  localFactRequirements?: readonly LocalFactRequirement[]
  taxType: string
  matchedTaxType: string
  period: string
  dueDate: string | null
  taxPeriodStart: string | null
  taxPeriodEnd: string | null
  taxPeriodKind: TaxPeriodKind
  taxPeriodSource: TaxPeriodSource
  taxPeriodReviewReason: string | null
  eventType: ObligationEventType
  isFiling: boolean
  isPayment: boolean
  formName: string
  sourceIds: readonly string[]
  evidence: readonly RuleEvidence[]
  requiresReview: boolean
  reminderReady: boolean
  reviewReasons: readonly string[]
  missingClientFacts: readonly RuleGenerationMissingClientFact[]
}

const VERIFIED_QUALITY: RuleQualityChecklist = {
  filingPaymentDistinguished: true,
  extensionHandled: true,
  calendarFiscalSpecified: true,
  holidayRolloverHandled: true,
  crossVerified: true,
  exceptionChannel: true,
}

const VERIFIED_AT = '2026-04-27'
// State disaster/emergency tax-relief sources researched and URL-verified on
// this date (see the relief block in RULE_SOURCES below).
const DISASTER_RELIEF_VERIFIED_AT = '2026-06-08'
const NEXT_PRE_SEASON_REVIEW = '2026-11-15'

const RULE_TAX_TYPE_ALIASES: Record<
  string,
  readonly { taxType: string; requiresReview?: boolean; reason?: string }[]
> = {
  federal_1040_sch_c: [{ taxType: 'federal_1040' }],
  federal_4868: [{ taxType: 'federal_1040_extension' }],
  ca_state_fiduciary_income_tax: [{ taxType: 'ca_541' }],
  ny_state_fiduciary_income_tax: [{ taxType: 'ny_it205' }],
  ca_100_franchise: [
    { taxType: 'ca_100' },
    { taxType: 'ca_state_business_income_tax' },
    { taxType: 'ca_state_franchise_or_entity_tax' },
  ],
  ca_100: [
    { taxType: 'ca_state_business_income_tax' },
    { taxType: 'ca_state_franchise_or_entity_tax' },
  ],
  ca_100s: [
    { taxType: 'ca_state_business_income_tax' },
    { taxType: 'ca_state_franchise_or_entity_tax' },
  ],
  ca_100s_franchise: [
    { taxType: 'ca_100s' },
    { taxType: 'ca_state_business_income_tax' },
    { taxType: 'ca_state_franchise_or_entity_tax' },
  ],
  ca_565_partnership: [{ taxType: 'ca_state_business_income_tax' }],
  ca_llc_fee_gross_receipts: [
    {
      taxType: 'ca_llc_estimated_fee',
      requiresReview: true,
      reason: 'ca_llc_fee_depends_on_california_source_income',
    },
    {
      taxType: 'ca_state_franchise_or_entity_tax',
      requiresReview: true,
      reason: 'ca_llc_fee_depends_on_california_source_income',
    },
  ],
  ca_llc_franchise_min_800: [
    { taxType: 'ca_llc_annual_tax' },
    { taxType: 'ca_state_franchise_or_entity_tax' },
  ],
  federal_1065_or_1040: [
    {
      taxType: 'federal_1065',
      requiresReview: true,
      reason: 'llc_federal_classification_required',
    },
  ],
  ny_llc_filing_fee: [
    {
      taxType: 'ny_it204ll',
      requiresReview: true,
      reason: 'ny_it204ll_applicability_required',
    },
    {
      taxType: 'ny_state_franchise_or_entity_tax',
      requiresReview: true,
      reason: 'ny_it204ll_applicability_required',
    },
  ],
  ny_it204: [{ taxType: 'ny_state_business_income_tax' }],
  ny_ct3: [
    { taxType: 'ny_state_business_income_tax' },
    { taxType: 'ny_state_franchise_or_entity_tax' },
  ],
  ny_ct3s: [
    { taxType: 'ny_state_business_income_tax' },
    { taxType: 'ny_state_franchise_or_entity_tax' },
  ],
  ny_ptet_optional: [
    {
      taxType: 'ny_ptet_election',
      requiresReview: true,
      reason: 'ny_ptet_election_required',
    },
    {
      taxType: 'ny_ptet_estimated_tax',
      requiresReview: true,
      reason: 'ny_ptet_election_required',
    },
    {
      taxType: 'ny_ptet',
      requiresReview: true,
      reason: 'ny_ptet_election_required',
    },
  ],
  tx_franchise_tax: [
    {
      taxType: 'tx_franchise_report',
      requiresReview: true,
      reason: 'tx_franchise_taxability_required',
    },
    {
      taxType: 'tx_state_franchise_or_entity_tax',
      requiresReview: true,
      reason: 'tx_franchise_taxability_required',
    },
    {
      taxType: 'tx_pir_oir',
      requiresReview: true,
      reason: 'tx_information_report_type_required',
    },
  ],
  wa_combined_excise: [
    {
      taxType: 'wa_combined_excise_monthly',
      requiresReview: true,
      reason: 'wa_filing_frequency_required',
    },
    {
      taxType: 'wa_combined_excise_quarterly',
      requiresReview: true,
      reason: 'wa_filing_frequency_required',
    },
    {
      taxType: 'wa_combined_excise_annual',
      requiresReview: true,
      reason: 'wa_filing_frequency_required',
    },
  ],
}

interface StateRuleSourceSeed {
  jurisdiction: RuleGenerationState
  name: string
}

type StateCandidateRuleSlug =
  | 'individual_income_return'
  | 'individual_estimated_tax'
  | 'fiduciary_income_return'
  | 'business_income_return'
  | 'business_estimated_tax'
  | 'pass_through_entity_return'
  | 'franchise_or_entity_tax'
  | 'sales_use_tax'
  | 'withholding'
  | 'ui_wage_report'

interface StateIncomeTaxSourceSeed {
  jurisdiction: RuleGenerationState
  title: string
  url: string
  // Fetch-address override for year-paginated pages: carries the {year} token
  // (resolved at fetch time) while `url` stays the current dated content page
  // that rules cite and UIs link to. See ruleSourceFetchUrl.
  feedUrl?: string
  sourceType?: RuleSourceType
  acquisitionMethod?: AcquisitionMethod
  candidateDomainSlugs?: readonly StateCandidateRuleSlug[]
}

interface StateAdditionalRuleSourceSeed {
  jurisdiction: RuleGenerationState
  id: string
  localJurisdiction?: LocalJurisdictionRef
  localFactRequirements?: readonly LocalFactRequirement[]
  title: string
  url: string
  // Same {year}-token fetch override as StateIncomeTaxSourceSeed.feedUrl.
  feedUrl?: string
  sourceType: RuleSourceType
  acquisitionMethod: AcquisitionMethod
  domains: readonly RuleSourceDomain[]
  entityApplicability: readonly EntityApplicability[]
  priority?: SourcePriority
  healthStatus?: SourceHealthStatus
}

const DEFAULT_INCOME_CANDIDATE_DOMAIN_SLUGS = [
  'individual_income_return',
  'individual_estimated_tax',
] as const satisfies readonly StateCandidateRuleSlug[]

export const STATE_RULE_SOURCE_SEEDS = [
  {
    jurisdiction: 'AL',
    name: 'Alabama',
  },
  {
    jurisdiction: 'AK',
    name: 'Alaska',
  },
  {
    jurisdiction: 'AZ',
    name: 'Arizona',
  },
  {
    jurisdiction: 'AR',
    name: 'Arkansas',
  },
  {
    jurisdiction: 'CA',
    name: 'California',
  },
  {
    jurisdiction: 'CO',
    name: 'Colorado',
  },
  {
    jurisdiction: 'CT',
    name: 'Connecticut',
  },
  {
    jurisdiction: 'DE',
    name: 'Delaware',
  },
  {
    jurisdiction: 'DC',
    name: 'District of Columbia',
  },
  {
    jurisdiction: 'FL',
    name: 'Florida',
  },
  {
    jurisdiction: 'GA',
    name: 'Georgia',
  },
  {
    jurisdiction: 'HI',
    name: 'Hawaii',
  },
  {
    jurisdiction: 'ID',
    name: 'Idaho',
  },
  {
    jurisdiction: 'IL',
    name: 'Illinois',
  },
  {
    jurisdiction: 'IN',
    name: 'Indiana',
  },
  {
    jurisdiction: 'IA',
    name: 'Iowa',
  },
  {
    jurisdiction: 'KS',
    name: 'Kansas',
  },
  {
    jurisdiction: 'KY',
    name: 'Kentucky',
  },
  {
    jurisdiction: 'LA',
    name: 'Louisiana',
  },
  {
    jurisdiction: 'ME',
    name: 'Maine',
  },
  {
    jurisdiction: 'MD',
    name: 'Maryland',
  },
  {
    jurisdiction: 'MA',
    name: 'Massachusetts',
  },
  {
    jurisdiction: 'MI',
    name: 'Michigan',
  },
  {
    jurisdiction: 'MN',
    name: 'Minnesota',
  },
  {
    jurisdiction: 'MS',
    name: 'Mississippi',
  },
  {
    jurisdiction: 'MO',
    name: 'Missouri',
  },
  {
    jurisdiction: 'MT',
    name: 'Montana',
  },
  {
    jurisdiction: 'NE',
    name: 'Nebraska',
  },
  {
    jurisdiction: 'NV',
    name: 'Nevada',
  },
  {
    jurisdiction: 'NH',
    name: 'New Hampshire',
  },
  {
    jurisdiction: 'NJ',
    name: 'New Jersey',
  },
  {
    jurisdiction: 'NM',
    name: 'New Mexico',
  },
  {
    jurisdiction: 'NY',
    name: 'New York',
  },
  {
    jurisdiction: 'NC',
    name: 'North Carolina',
  },
  {
    jurisdiction: 'ND',
    name: 'North Dakota',
  },
  {
    jurisdiction: 'OH',
    name: 'Ohio',
  },
  {
    jurisdiction: 'OK',
    name: 'Oklahoma',
  },
  {
    jurisdiction: 'OR',
    name: 'Oregon',
  },
  {
    jurisdiction: 'PA',
    name: 'Pennsylvania',
  },
  {
    jurisdiction: 'RI',
    name: 'Rhode Island',
  },
  {
    jurisdiction: 'SC',
    name: 'South Carolina',
  },
  {
    jurisdiction: 'SD',
    name: 'South Dakota',
  },
  {
    jurisdiction: 'TN',
    name: 'Tennessee',
  },
  {
    jurisdiction: 'TX',
    name: 'Texas',
  },
  {
    jurisdiction: 'UT',
    name: 'Utah',
  },
  {
    jurisdiction: 'VT',
    name: 'Vermont',
  },
  {
    jurisdiction: 'VA',
    name: 'Virginia',
  },
  {
    jurisdiction: 'WA',
    name: 'Washington',
  },
  {
    jurisdiction: 'WV',
    name: 'West Virginia',
  },
  {
    jurisdiction: 'WI',
    name: 'Wisconsin',
  },
  {
    jurisdiction: 'WY',
    name: 'Wyoming',
  },
] as const satisfies readonly StateRuleSourceSeed[]

const STATE_INCOME_TAX_SOURCE_SEEDS = [
  {
    jurisdiction: 'AL',
    title: 'Alabama DOR Individual Income Tax Return Filing FAQ',
    url: 'https://www.revenue.alabama.gov/faqs/when-should-i-file-my-alabama-individual-income-tax-return/',
    candidateDomainSlugs: ['individual_income_return'],
  },
  {
    jurisdiction: 'AK',
    title: 'Alaska Tax Facts',
    url: 'https://www.commerce.alaska.gov/web/dcra/OfficeoftheStateAssessor/AlaskaTaxFacts',
    candidateDomainSlugs: ['individual_income_return'],
  },
  {
    jurisdiction: 'AZ',
    title: 'Arizona Department of Revenue Individual Income Tax Highlights',
    url: 'https://azdor.gov/forms/individual-income-tax-highlights',
    candidateDomainSlugs: ['individual_income_return'],
  },
  {
    jurisdiction: 'AR',
    title: 'Arkansas DFA Individual Income Tax Deadlines and Extensions',
    url: 'https://www.dfa.arkansas.gov/office/taxes/income-tax-administration/individual-income-tax/deadlines-extensions/',
    candidateDomainSlugs: ['individual_income_return'],
  },
  {
    jurisdiction: 'CA',
    title: 'California FTB Due Dates for Individuals',
    url: 'https://www.ftb.ca.gov/file/when-to-file/due-dates-personal.html',
  },
  {
    jurisdiction: 'CO',
    title: 'Colorado Department of Revenue Individual Income Tax',
    url: 'https://tax.colorado.gov/individual-income-tax',
  },
  {
    jurisdiction: 'CT',
    title: 'Connecticut DRS Individual Income Tax',
    url: 'https://portal.ct.gov/drs/individuals/individuals-tax-page',
  },
  {
    jurisdiction: 'DE',
    title: 'Delaware Division of Revenue Personal Income Tax',
    url: 'https://revenue.delaware.gov/personal-income-tax/',
  },
  {
    jurisdiction: 'DC',
    title: 'DC OTR Individual Income Tax',
    url: 'https://otr.cfo.dc.gov/es/node/1796481',
  },
  {
    jurisdiction: 'FL',
    title: 'Florida DOR Tax Information for New Residents',
    url: 'https://floridarevenue.com/Forms_library/current/brochure/gt800025.pdf',
    sourceType: 'publication',
    acquisitionMethod: 'pdf_watch',
    candidateDomainSlugs: ['individual_income_return'],
  },
  {
    jurisdiction: 'GA',
    title: 'Georgia DOR Filing Georgia State Individual Income Tax Return',
    url: 'https://dor.georgia.gov/taxes/filing-georgia-state-individual-income-tax-return',
    candidateDomainSlugs: ['individual_income_return'],
  },
  {
    jurisdiction: 'HI',
    title: 'Hawaii Department of Taxation Tax Year Information',
    url: 'https://tax.hawaii.gov/tax-year-information/',
    candidateDomainSlugs: ['individual_income_return'],
  },
  {
    jurisdiction: 'ID',
    title: 'Idaho State Tax Commission Individual Income Tax',
    url: 'https://tax.idaho.gov/taxes/income-tax/individual-income/',
  },
  {
    jurisdiction: 'IL',
    title: 'Illinois DOR Due Dates for Filing Returns',
    url: 'https://tax.illinois.gov/individuals/filingrequirements/extension.html',
  },
  {
    jurisdiction: 'IN',
    title: 'Indiana DOR Individual Income Taxes',
    url: 'https://www.in.gov/dor/individual-income-taxes/',
  },
  {
    jurisdiction: 'IA',
    title: 'Iowa Department of Revenue Individual Income Tax FAQ',
    url: 'https://revenue.iowa.gov/taxes/frequently-asked-questions/individual-income',
    sourceType: 'due_dates',
    candidateDomainSlugs: ['individual_income_return'],
  },
  {
    jurisdiction: 'KS',
    title: 'Kansas Department of Revenue Individual Income Tax',
    url: 'https://www.ksrevenue.gov/perstaxtypesii.html',
  },
  {
    jurisdiction: 'KY',
    title: 'Kentucky Department of Revenue Individual Income Tax',
    url: 'https://revenue.ky.gov/Individual/Individual-Income-Tax/Pages/default.aspx',
  },
  {
    jurisdiction: 'LA',
    title: 'Louisiana Department of Revenue Individual Income Tax',
    url: 'https://revenue.louisiana.gov/individuals/general-resources/individual-income-tax/',
  },
  {
    jurisdiction: 'ME',
    title: 'Maine Revenue Services List of Forms and Due Dates',
    url: 'https://www.maine.gov/revenue/tax-return-forms/due-dates',
  },
  {
    jurisdiction: 'MD',
    title: 'Comptroller of Maryland iFile Individual Income Tax Help',
    url: 'https://interactive.marylandtaxes.gov/Individuals/iFile_ChooseForm/Help/iih_geninfo.asp',
    candidateDomainSlugs: ['individual_income_return'],
  },
  {
    jurisdiction: 'MA',
    title: 'Massachusetts DOR Due Dates',
    url: 'https://www.mass.gov/info-details/massachusetts-dor-tax-due-dates-and-extensions',
  },
  {
    jurisdiction: 'MI',
    title: 'Michigan Treasury 2026 Individual Income Tax Filing Season',
    url: 'https://www.michigan.gov/treasury/news/2026/01/26/individual-income-tax-filing-season-begins-today',
    sourceType: 'due_dates',
    candidateDomainSlugs: ['individual_income_return'],
  },
  {
    jurisdiction: 'MN',
    title: 'Minnesota Department of Revenue Individual Income Tax',
    url: 'https://www.revenue.state.mn.us/individual-income-tax',
  },
  {
    jurisdiction: 'MS',
    title: 'Mississippi DOR Individual Income Tax FAQs',
    url: 'https://www.dor.ms.gov/individual/individual-income-tax-faqs',
  },
  {
    jurisdiction: 'MO',
    title: 'Missouri Department of Revenue Individual Income Tax',
    url: 'https://dor.mo.gov/taxation/individual/',
  },
  {
    jurisdiction: 'MT',
    title: 'Montana Department of Revenue Individual Income Tax',
    url: 'https://revenue.mt.gov/taxes/individual-income-tax/',
  },
  {
    jurisdiction: 'NE',
    title: 'Nebraska Department of Revenue Individual Income Tax',
    url: 'https://revenue.nebraska.gov/individuals/individual-income-tax',
  },
  {
    jurisdiction: 'NV',
    title: 'Nevada Department of Taxation Income Tax in Nevada',
    url: 'https://tax.nv.gov/about-nevada-department-of-taxation/income-tax-in-nevada/',
  },
  {
    jurisdiction: 'NH',
    title: 'New Hampshire DRA Interest and Dividends Tax FAQs',
    url: 'https://www.revenue.nh.gov/resource-center/frequently-asked-questions/interest-dividends-tax-frequently-asked-questions',
  },
  {
    jurisdiction: 'NJ',
    title: 'New Jersey Division of Taxation Individual Income Tax',
    url: 'https://www.nj.gov/treasury/taxation/prntgit.shtml',
  },
  {
    jurisdiction: 'NM',
    title: 'New Mexico Taxation and Revenue Income Tax Due Date Reminder',
    url: 'https://www.tax.newmexico.gov/wp-content/uploads/2026/03/20260315_Reminder-Income-tax-returns-due-April-15.pdf',
    sourceType: 'publication',
    acquisitionMethod: 'pdf_watch',
    candidateDomainSlugs: ['individual_income_return'],
  },
  {
    jurisdiction: 'NY',
    title: 'New York Tax Department 2026 Tax Filing Dates',
    // Year-paginated; MUST carry the same feedUrl as ny.tax_calendar.2026 so
    // uniqueByFetchUrl keeps deduping the two watchers to one fetch.
    url: 'https://www.tax.ny.gov/help/calendar/2026.htm',
    feedUrl: 'https://www.tax.ny.gov/help/calendar/{year}.htm',
  },
  {
    jurisdiction: 'NC',
    title: 'North Carolina DOR Individual Income Tax Filing Due Dates',
    url: 'https://www.ncdor.gov/taxes/individual-income-tax/when-where-and-how-file-your-north-carolina-return',
    sourceType: 'due_dates',
    candidateDomainSlugs: ['individual_income_return'],
  },
  {
    jurisdiction: 'ND',
    title: 'North Dakota Office of State Tax Commissioner Individual Income Tax Deadlines',
    url: 'https://www.tax.nd.gov/news/resources/tax-deadlines/individual-income-tax-deadlines',
  },
  {
    jurisdiction: 'OH',
    title: 'Ohio 2025 Individual Income Tax IT 1040 and SD 100 Instructions',
    url: 'https://dam.assets.ohio.gov/image/upload/v1735920104/tax.ohio.gov/forms/ohio_individual/individual/2025/it1040-booklet.pdf',
    acquisitionMethod: 'pdf_watch',
  },
  {
    jurisdiction: 'OK',
    title: 'Oklahoma Tax Commission Individual Income Tax Help Center',
    url: 'https://oklahoma.gov/tax/helpcenter/income-tax.html',
  },
  {
    jurisdiction: 'OR',
    title: 'Oregon DOR Personal Income Tax',
    url: 'https://www.oregon.gov/dor/programs/individuals/pages/pit.aspx',
  },
  {
    jurisdiction: 'PA',
    title: 'Pennsylvania Personal Income Tax Filing Requirements',
    url: 'https://www.pa.gov/agencies/revenue/forms-and-publications/pa-personal-income-tax-guide/brief-overview-and-filing-requirements',
    sourceType: 'due_dates',
  },
  {
    jurisdiction: 'RI',
    title: 'Rhode Island Division of Taxation Personal Income Tax',
    url: 'https://tax.ri.gov/tax-sections/personal-income-tax',
  },
  {
    jurisdiction: 'SC',
    title: 'South Carolina DOR 2025 Individual Income Filing Extension',
    url: 'https://dor.sc.gov/news/scdor-statement-income-tax-conformity-april-15-filing-deadline-extended-sc-returns',
    sourceType: 'due_dates',
    candidateDomainSlugs: ['individual_income_return'],
  },
  {
    jurisdiction: 'SD',
    title: 'South Dakota DOR Taxes for Individuals',
    url: 'https://dor.sd.gov/individuals/taxes/',
  },
  {
    jurisdiction: 'TN',
    title: 'Tennessee Department of Revenue Hall Income Tax',
    url: 'https://www.tn.gov/revenue/taxes/hall-income-tax.html',
  },
  {
    jurisdiction: 'UT',
    title: 'Utah State Tax Commission Individual Income Tax Due Date',
    url: 'https://tax.utah.gov/event/individual-corporate-partnership-income-tax-due-date-jan-dec-2025/',
    sourceType: 'calendar',
    candidateDomainSlugs: ['individual_income_return'],
  },
  {
    jurisdiction: 'VT',
    title: 'Vermont Income Tax Returns by Individuals, Trusts, and Estates Statute',
    url: 'https://legislature.vermont.gov/statutes/section/32/151/05861',
    sourceType: 'publication',
    candidateDomainSlugs: ['individual_income_return'],
  },
  {
    jurisdiction: 'VA',
    title: 'Virginia Tax When to File',
    url: 'https://www.tax.virginia.gov/when-to-file',
  },
  {
    jurisdiction: 'WV',
    title: 'West Virginia Tax Division Individuals',
    url: 'https://tax.wv.gov/Individuals/Pages/Individuals.aspx',
  },
  {
    jurisdiction: 'WI',
    title: 'Wisconsin DOR Individual Income Tax Deadlines',
    url: 'https://www.revenue.wi.gov/Pages/FAQS/pcs-late.aspx',
    sourceType: 'due_dates',
    candidateDomainSlugs: ['individual_income_return'],
  },
  {
    jurisdiction: 'WY',
    title: 'Wyoming Constitution Taxation and Revenue',
    url: 'https://sos.wyo.gov/Forms/Publications/WYConstitution.pdf',
    sourceType: 'publication',
    acquisitionMethod: 'pdf_watch',
  },
] as const satisfies readonly StateIncomeTaxSourceSeed[]

const STATE_INCOME_TAX_SOURCE_BY_JURISDICTION = new Map<
  RuleGenerationState,
  StateIncomeTaxSourceSeed
>(STATE_INCOME_TAX_SOURCE_SEEDS.map((seed) => [seed.jurisdiction, seed]))

const STATE_ADDITIONAL_RULE_SOURCE_SEEDS: readonly StateAdditionalRuleSourceSeed[] = [
  {
    jurisdiction: 'AL',
    id: 'al.individual_estimated_tax',
    title: 'Alabama DOR Estimated Tax Payment Due Dates',
    url: 'https://www.revenue.alabama.gov/faqs/when-are-estimated-tax-payments-due/',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['individual_estimated_tax'],
    entityApplicability: ['individual', 'sole_prop'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AL',
    id: 'al.due_dates',
    title: 'Alabama DOR Income Tax Due Dates',
    url: 'https://www.revenue.alabama.gov/individual-corporate/due-dates/',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: [
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'franchise_or_entity_tax',
      'fiduciary_income_return',
      'withholding',
    ],
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp', 'sole_prop', 'trust'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AL',
    id: 'al.corporate_income_extensions',
    title: 'Alabama DOR Corporate Income Due Date and Extensions',
    url: 'https://www.revenue.alabama.gov/individual-corporate/corporate-income-due-date-extensions/',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['business_income_return', 'business_estimated_tax'],
    entityApplicability: ['c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AL',
    id: 'al.pass_through_entities',
    title: 'Alabama DOR Pass-Through Entities',
    url: 'https://www.revenue.alabama.gov/individual-corporate/pass-thru-entities-subchapter-k-entities-partnerships-and-s-corporations/',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['pass_through_entity_return', 'business_estimated_tax'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AL',
    id: 'al.business_privilege_tax',
    title: 'Alabama DOR Business Privilege Tax',
    url: 'https://www.revenue.alabama.gov/tax-types/business-privilege-tax/',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['franchise_or_entity_tax'],
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AL',
    id: 'al.fiduciary_income_tax',
    title: 'Alabama DOR Fiduciary Income Tax',
    url: 'https://www.revenue.alabama.gov/tax-types/fiduciary-income-tax/',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AL',
    id: 'al.sales_use_due_dates',
    title: 'Alabama DOR Sales and Use Due Date Calendar',
    url: 'https://www.revenue.alabama.gov/sales-use/due-date-calendar-for-taxes-administered-by-sales-use/',
    sourceType: 'calendar',
    acquisitionMethod: 'html_watch',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AL',
    id: 'al.withholding_tax',
    title: 'Alabama DOR Income Tax Withholding',
    url: 'https://www.revenue.alabama.gov/tax-types/income-tax-withholding/',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AL',
    id: 'al.ui_wage_report',
    title: 'Alabama Department of Labor Quarterly Contribution and Wage Report',
    url: 'https://adol.alabama.gov/faq/when-is-the-last-day-i-can-file-my-quarterly-contribution-and-wage-report-and-not-be-late/',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'CA',
    id: 'ca.ftb_541_booklet_2025',
    title: 'California FTB 2025 Form 541 Fiduciary Income Tax Booklet',
    url: 'https://www.ftb.ca.gov/forms/2025/2025-541-booklet.html',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'CA',
    id: 'ca.ftb_estates_trusts',
    title: 'California FTB Estates and Trusts',
    url: 'https://www.ftb.ca.gov/file/personal/filing-situations/estates-and-trusts/index.html',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'CA',
    id: 'ca.cdtfa_sales_use_filing_dates',
    title: 'California CDTFA Filing Dates for Sales and Use Tax Returns',
    url: 'https://www.cdtfa.ca.gov/taxes-and-fees/sales-use-tax-returns-filing-dates.htm',
    sourceType: 'calendar',
    acquisitionMethod: 'html_watch',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'CA',
    id: 'ca.edd_required_filings_due_dates',
    title: 'California EDD Payroll Tax Calendar',
    url: 'https://edd.ca.gov/en/payroll_taxes/Due_Dates_Calendar/',
    sourceType: 'calendar',
    acquisitionMethod: 'html_watch',
    domains: ['withholding', 'ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NY',
    id: 'ny.nyc_yonkers_income_tax',
    title: 'New York Tax Department NYC and Yonkers Personal Income Tax',
    url: 'https://www.tax.ny.gov/pit/file/nyc_yonkers_residents.htm',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['local_individual_income'],
    entityApplicability: ['individual', 'sole_prop'],
    priority: 'high',
    healthStatus: 'healthy',
    localFactRequirements: ['resident_municipality', 'local_filing_channel'],
    localJurisdiction: {
      level: 'municipality',
      state: 'NY',
      localCode: 'NY:NYC-YONKERS',
      displayName: 'New York City and Yonkers local income tax',
      administeredBy: 'state',
      collectedVia: 'state_return',
      sourceAuthority: 'New York State Department of Taxation and Finance',
    },
  },
  {
    jurisdiction: 'NY',
    id: 'ny.it205_instructions_2025',
    title: 'New York 2025 Form IT-205-I Fiduciary Income Tax Return Instructions',
    url: 'https://www.tax.ny.gov/forms/html-instructions/2025/it/it205i-2025.htm',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NY',
    id: 'ny.personal_fiduciary_filing_due_dates',
    title: 'New York Income Tax Filing Due Dates',
    url: 'https://www.tax.ny.gov/pit/file/income_tax_filing_due_dates.htm',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NY',
    id: 'ny.sales_tax_vendor_due_dates',
    title: 'New York Helpful Reminders for Sales Tax Vendors',
    url: 'https://www.tax.ny.gov/bus/st/helpful_reminders.htm',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NY',
    id: 'ny.withholding_tax_due_dates',
    title: 'New York Withholding Tax Due Dates',
    url: 'https://www.tax.ny.gov/bus/wt/duedates.htm',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['withholding', 'ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'TX',
    id: 'tx.sales_use_tax',
    title: 'Texas Comptroller Sales and Use Tax',
    url: 'https://comptroller.texas.gov/taxes/sales/index.php',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'TX',
    id: 'tx.ui_wage_report_due_dates',
    title: 'Texas Workforce Commission Tax Report and Payment Due Dates',
    url: 'https://www.twc.texas.gov/programs/unemployment-tax/tax-report-payment-due-dates',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'FL',
    id: 'fl.sales_use_tax',
    title: 'Florida DOR Sales and Use Tax',
    url: 'https://floridarevenue.com/taxes/taxesfees/Pages/sales_tax.aspx',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'FL',
    id: 'fl.reemployment_tax_return_pay',
    title: 'Florida DOR Reemployment Tax Return and Payment Information',
    url: 'https://floridarevenue.com/taxes/taxesfees/Pages/rt_return_pay.aspx',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'WA',
    id: 'wa.esd_quarterly_tax_wage_reports',
    title: 'Washington ESD Quarterly Tax and Wage Reports',
    url: 'https://esd.wa.gov/employer-requirements/quarterly-reports/how-file-your-quarterly-tax-and-wage-reports',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'GA',
    id: 'ga.tax_due_dates',
    title: 'Georgia DOR Tax Due Dates',
    url: 'https://dor.georgia.gov/taxes/tax-faqs-due-dates-and-other-resources/tax-due-dates',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: [
      'business_income_return',
      'pass_through_entity_return',
      'sales_use_tax',
      'withholding',
    ],
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'GA',
    id: 'ga.individual_fiduciary_estimated_tax',
    title: 'Georgia DOR Individual and Fiduciary Estimated Tax',
    url: 'https://dor.georgia.gov/500-uet-underpayment-estimated-tax-individualfiduciary',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['individual_estimated_tax'],
    entityApplicability: ['individual', 'sole_prop'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'GA',
    id: 'ga.fiduciary_income_tax_booklet',
    title: 'Georgia DOR Fiduciary Income Tax Instructions',
    url: 'https://dor.georgia.gov/document/document/2025-501-and-501x-fiduciary-income-tax-instruction-booklet/download',
    sourceType: 'instructions',
    acquisitionMethod: 'pdf_watch',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'GA',
    id: 'ga.corporate_income_net_worth_tax',
    title: 'Georgia DOR Taxes for Corporations',
    url: 'https://dor.georgia.gov/taxes/taxes-corporations',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['business_income_return', 'business_estimated_tax', 'franchise_or_entity_tax'],
    entityApplicability: ['s_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'GA',
    id: 'ga.ui_wage_report',
    title: 'Georgia Department of Labor Tax and Wage Reports',
    url: 'https://dol.georgia.gov/file-tax-and-wage-reports-and-make-payments',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'IL',
    id: 'il.business_income_tax_forms',
    title: 'Illinois DOR Personal Property Replacement Tax Due Dates',
    url: 'https://tax.illinois.gov/localgovernments/personal-property-replacement-tax.html',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['business_income_return', 'pass_through_entity_return', 'franchise_or_entity_tax'],
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'IL',
    id: 'il.fiduciary_income_replacement_tax',
    title: 'Illinois DOR Fiduciary Income and Replacement Tax',
    url: 'https://tax.illinois.gov/questionsandanswers/answer.73.html',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'IL',
    id: 'il.business_estimated_tax',
    title: 'Illinois DOR Business Income Tax Estimated Payments',
    url: 'https://tax.illinois.gov/businesses/business-income-tax-estimated-payments.html',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['business_estimated_tax'],
    entityApplicability: ['s_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'IL',
    id: 'il.sales_use_tax_due_dates',
    title: 'Illinois DOR Retailers Sales and Use Tax Filing Requirements',
    url: 'https://tax.illinois.gov/forms/sales/salesandusetax/st-1-instructions-2024.html',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'IL',
    id: 'il.withholding_tax_due_dates',
    title: 'Illinois DOR Form IL-941 Instructions',
    url: 'https://tax.illinois.gov/forms/withholding/currentyear/il-941-instr.html',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'IL',
    id: 'il.ui_wage_report',
    title: 'Illinois IDES Employer Tax Information',
    url: 'https://ides.illinois.gov/employer-resources/tax-employer-information.html',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MA',
    id: 'ma.dor_tax_due_dates_extensions',
    title: 'Massachusetts DOR Tax Due Dates and Extensions',
    url: 'https://www.mass.gov/info-details/massachusetts-dor-tax-due-dates-and-extensions',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: [
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'sales_use_tax',
      'withholding',
    ],
    entityApplicability: ['trust', 'llc', 'partnership', 's_corp', 'c_corp', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MA',
    id: 'ma.corporate_excise_tax_guide',
    title: 'Massachusetts DOR Corporate Excise Tax Guide',
    url: 'https://www.mass.gov/corporations',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['franchise_or_entity_tax'],
    entityApplicability: ['s_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MA',
    id: 'ma.ui_wage_report',
    title: 'Massachusetts DUA Employment and Wage Detail Report',
    url: 'https://www.mass.gov/how-to/submit-employment-and-wage-detail-report',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NJ',
    id: 'nj.tax_calendar_2026',
    title: 'New Jersey Tax Calendar 2026 Due Dates by Tax',
    url: 'https://www.nj.gov/treasury/taxation/pdf/alphasum26.pdf',
    sourceType: 'calendar',
    acquisitionMethod: 'pdf_watch',
    domains: [
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'franchise_or_entity_tax',
      'sales_use_tax',
      'withholding',
    ],
    entityApplicability: ['trust', 'llc', 'partnership', 's_corp', 'c_corp', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NJ',
    id: 'nj.ui_wage_report',
    title: 'New Jersey Employer Contribution and Wage Report Due Dates',
    url: 'https://www.nj.gov/labor/ea/employer-services/rate-info/',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'PA',
    id: 'pa.local_eit_lit_psd',
    title: 'Pennsylvania DCED PSD Codes and Local EIT Rates',
    url: 'https://dced.pa.gov/local-government/local-income-tax-information/psd-codes-and-eit-rates/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['local_individual_income'],
    entityApplicability: ['individual', 'sole_prop'],
    priority: 'high',
    healthStatus: 'healthy',
    localFactRequirements: [
      'resident_municipality',
      'work_municipality',
      'worksite_psd_code',
      'local_collector',
      'local_tax_rate',
    ],
    localJurisdiction: {
      level: 'municipality',
      state: 'PA',
      localCode: 'PA:PSD:*',
      displayName: 'Pennsylvania PSD / local earned income tax jurisdictions',
      administeredBy: 'local_collector',
      collectedVia: 'manual_review',
      sourceAuthority: 'Pennsylvania Department of Community and Economic Development',
    },
  },
  {
    jurisdiction: 'PA',
    id: 'pa.local_eit_act32_employer_withholding',
    title: 'Pennsylvania DCED Act 32 Local Earned Income Tax Withholding FAQ',
    url: 'https://dced.pa.gov/local-government/local-income-tax-information/act32-faq/',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['local_employer_withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
    localFactRequirements: [
      'resident_municipality',
      'work_municipality',
      'worksite_psd_code',
      'local_collector',
    ],
    localJurisdiction: {
      level: 'municipality',
      state: 'PA',
      localCode: 'PA:PSD:*',
      displayName: 'Pennsylvania Act 32 local earned income tax withholding',
      administeredBy: 'local_collector',
      collectedVia: 'employer_withholding',
      sourceAuthority: 'Pennsylvania Department of Community and Economic Development',
    },
  },
  {
    jurisdiction: 'PA',
    id: 'pa.local_services_tax',
    title: 'Pennsylvania DCED Local Services Tax',
    url: 'https://dced.pa.gov/local-government/local-income-tax-information/local-services-tax/',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['local_services_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
    localFactRequirements: [
      'work_municipality',
      'local_collector',
      'local_tax_rate',
      'lst_exemption_status',
    ],
    localJurisdiction: {
      level: 'municipality',
      state: 'PA',
      localCode: 'PA:LST:*',
      displayName: 'Pennsylvania local services tax jurisdictions',
      administeredBy: 'local_collector',
      collectedVia: 'employer_withholding',
      sourceAuthority: 'Pennsylvania Department of Community and Economic Development',
    },
  },
  {
    jurisdiction: 'PA',
    id: 'pa.fiduciary_estates_trusts',
    title: 'Pennsylvania Estates, Trusts, and Decedents',
    url: 'https://www.pa.gov/agencies/revenue/forms-and-publications/pa-personal-income-tax-guide/estates%2C-trusts-and-decedents.html',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'PA',
    id: 'pa.corporate_net_income_tax',
    title: 'Pennsylvania Corporate Net Income Tax',
    url: 'https://www.pa.gov/agencies/revenue/resources/tax-types-and-information/corporation-taxes/corporate-net-income-tax',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['business_income_return', 'business_estimated_tax'],
    entityApplicability: ['c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'PA',
    id: 'pa.partnerships_s_corps_llcs',
    title: 'Pennsylvania Partnerships, S Corporations, and LLCs',
    url: 'https://www.pa.gov/en/agencies/revenue/resources/tax-types-and-information/partnerships-s-corporations-llcs.html',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'PA',
    id: 'pa.sales_use_tax',
    title: 'Pennsylvania Sales, Use, and Hotel Occupancy Tax',
    url: 'https://www.pa.gov/agencies/revenue/resources/tax-types-and-information/sales-use-and-hotel-occupancy-tax',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'PA',
    id: 'pa.employer_withholding',
    title: 'Pennsylvania Employer Withholding',
    url: 'https://www.pa.gov/agencies/revenue/resources/tax-types-and-information/employer-withholding',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'PA',
    id: 'pa.ui_wage_report',
    title: 'Pennsylvania UC Quarterly Wage and Tax Reports',
    url: 'https://www.pa.gov/services/dli/file-unemployment-compensation-quarterly-wage-tax-reports',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NC',
    id: 'nc.individual_estimated_tax',
    title: 'North Carolina DOR Estimated Income Tax',
    url: 'https://www.ncdor.gov/taxes-forms/individual-income-tax/estimated-income-tax',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['individual_estimated_tax'],
    entityApplicability: ['individual', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NC',
    id: 'nc.corporate_income_franchise_filing',
    title: 'North Carolina Corporate Income and Franchise Tax Filing Requirements',
    url: 'https://www.ncdor.gov/taxes-forms/corporate-income-franchise-tax/when-file',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['business_income_return', 'business_estimated_tax', 'franchise_or_entity_tax'],
    entityApplicability: ['s_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NC',
    id: 'nc.pass_through_entity_return',
    title: 'North Carolina Partnership Income Tax Return Instructions',
    url: 'https://www.ncdor.gov/tax-forms/2025-d-403a-partnership-tax-return-instructions/open',
    sourceType: 'due_dates',
    acquisitionMethod: 'pdf_watch',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NC',
    id: 'nc.fiduciary_income_tax',
    title: 'North Carolina Estates and Trusts General Information',
    url: 'https://www.ncdor.gov/taxes-forms/other-taxes-and-fees/estate-trusts/general-information',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NC',
    id: 'nc.sales_use_due_dates',
    title: 'North Carolina Sales and Use Tax Filing Frequency and Due Dates',
    url: 'https://www.ncdor.gov/taxes-forms/sales-and-use-tax/sales-and-use-tax-filing-requirements-payment-options/filing-frequency-and-due-dates',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NC',
    id: 'nc.withholding_tax_due_dates',
    title: 'North Carolina Withholding Tax Frequently Asked Questions',
    url: 'https://www.ncdor.gov/taxes/withholding-tax/withholding-tax-frequently-asked-questions',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NC',
    id: 'nc.ui_wage_report',
    title: 'North Carolina DES Quarterly Tax and Wage Report',
    url: 'https://www.des.nc.gov/employers/file-adjust-or-review-quarterly-tax-wage-report',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'VA',
    id: 'va.fiduciary_income_tax',
    title: 'Virginia Fiduciary Income Tax Return',
    url: 'https://www.tax.virginia.gov/node/35395',
    sourceType: 'form',
    acquisitionMethod: 'html_watch',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'VA',
    id: 'va.corporation_income_tax',
    title: 'Virginia Corporation Income Tax',
    url: 'https://www.tax.virginia.gov/corporation-income-tax',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['business_income_return', 'business_estimated_tax'],
    entityApplicability: ['c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'VA',
    id: 'va.pass_through_entities',
    title: 'Virginia Pass-Through Entities',
    url: 'https://www.tax.virginia.gov/pass-through-entities',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'VA',
    id: 'va.sales_use_tax_return',
    title: 'Virginia Retail Sales and Use Tax Return',
    url: 'https://www.tax.virginia.gov/node/35097',
    sourceType: 'form',
    acquisitionMethod: 'html_watch',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'VA',
    id: 'va.employer_withholding_instructions',
    title: 'Virginia Employer Withholding Instructions',
    url: 'https://www.tax.virginia.gov/sites/default/files/inline-files/Employer%20Withholding%20Instructions.pdf',
    sourceType: 'instructions',
    acquisitionMethod: 'pdf_watch',
    domains: ['withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'VA',
    id: 'va.ui_wage_report',
    title: 'Virginia VEC Quarterly Payroll and Tax Report',
    url: 'https://vec.virginia.gov/FAQs/employers/what-do-i-do-after-i-register-new-business',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AZ',
    id: 'az.individual_estimated_tax',
    title: 'Arizona Individual Estimated Tax Payments',
    url: 'https://azdor.gov/individuals/individual-estimated-tax-payments',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['individual_estimated_tax'],
    entityApplicability: ['individual', 'sole_prop'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AZ',
    id: 'az.fiduciary_income_tax',
    title: 'Arizona Fiduciary Income Tax Highlights',
    url: 'https://azdor.gov/forms/fiduciary-income-tax-highlights',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AZ',
    id: 'az.corporate_income_tax',
    title: 'Arizona Corporate Income Tax',
    url: 'https://azdor.gov/business/corporate-income-tax',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['business_income_return', 'business_estimated_tax'],
    entityApplicability: ['c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AZ',
    id: 'az.pass_through_entities',
    title: 'Arizona Pass-Through Entity Election Publication',
    url: 'https://azdor.gov/sites/default/files/2023-03/PUBLICATION_713.pdf',
    sourceType: 'publication',
    acquisitionMethod: 'manual_review',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AZ',
    id: 'az.tpt_due_dates',
    title: 'Arizona Transaction Privilege Tax Due Dates',
    url: 'https://azdor.gov/business/transaction-privilege-tax/due-dates',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AZ',
    id: 'az.withholding_due_dates',
    title: 'Arizona Withholding Due Dates Calendar',
    url: 'https://azdor.gov/sites/default/files/media/WH_duedate-calendar.pdf',
    sourceType: 'calendar',
    acquisitionMethod: 'manual_review',
    domains: ['withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AZ',
    id: 'az.ui_wage_report',
    title: 'Arizona DES Unemployment Insurance Tax Wage Report Schedule',
    url: 'https://des.az.gov/main.aspx?id=3992&menu=316',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'CO',
    id: 'co.due_date_guide',
    title: 'Colorado DOR Taxes and Fees Due Date Guide',
    url: 'https://tax.colorado.gov/due-date-guide',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: [
      'individual_estimated_tax',
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'sales_use_tax',
      'withholding',
    ],
    entityApplicability: [
      'individual',
      'sole_prop',
      'trust',
      'llc',
      'partnership',
      's_corp',
      'c_corp',
    ],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'CO',
    id: 'co.ui_wage_report',
    title: 'Colorado CDLE Quarterly Wage Reporting Deadlines',
    url: 'https://cdle.colorado.gov/employers/unemployment-insurance-premiums/wage-reporting',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MI',
    id: 'mi.individual_estimated_tax',
    title: 'Michigan Treasury Quarterly Estimated Tax Payments',
    url: 'https://www.michigan.gov/taxes/questions/iit/accordion/estimate/when-are-the-quarterly-estimated-tax-payments-due-1',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['individual_estimated_tax'],
    entityApplicability: ['individual', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MI',
    id: 'mi.fiduciary_income_tax',
    title: 'Michigan Treasury Fiduciary Filing Guidance',
    url: 'https://www.michigan.gov/taxes/iit/tax-guidance/tax-situations/fiduciary',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MI',
    id: 'mi.corporate_income_tax',
    title: 'Michigan Treasury Corporate Income Tax Filing Requirements',
    url: 'https://www.michigan.gov/taxes/business-taxes/cit/detail/michigan-corporate-income-tax-cit/filing-requirements',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['business_income_return', 'business_estimated_tax'],
    entityApplicability: ['c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MI',
    id: 'mi.flow_through_entity_tax',
    title: 'Michigan Treasury Flow-Through Entity Tax Due Dates',
    url: 'https://www.michigan.gov/taxes/business-taxes/flowthrough-entity-tax',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MI',
    id: 'mi.sales_use_tax',
    title: 'Michigan Treasury Sales and Use Taxes',
    url: 'https://www.michigan.gov/taxes/business-taxes/sales-use-tax',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MI',
    id: 'mi.withholding_due_dates',
    title: 'Michigan Treasury Sales, Use, and Withholding Filing Due Dates',
    url: 'https://www.michigan.gov/taxes/business-taxes/payroll-service-providers/filing-and-payment-due-dates',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MI',
    id: 'mi.ui_wage_report',
    title: 'Michigan UIA Submit Reports and Payments',
    url: 'https://www.michigan.gov/leo/bureaus-agencies/uia/tools/employer-help-center/submit-reports-and-payments',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'OH',
    id: 'oh.municipal_income_tax_finder',
    title: 'Ohio The Finder Municipal Income Tax',
    url: 'https://thefinder.tax.ohio.gov/StreamlineSalesTaxWeb/default_municipal.aspx',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['local_individual_income', 'local_business_income'],
    entityApplicability: ['individual', 'sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
    localFactRequirements: [
      'resident_municipality',
      'work_municipality',
      'principal_office_municipality',
      'local_tax_rate',
    ],
    localJurisdiction: {
      level: 'municipality',
      state: 'OH',
      localCode: 'OH:MUNI:*',
      displayName: 'Ohio municipal income tax jurisdictions',
      administeredBy: 'municipal_authority',
      collectedVia: 'manual_review',
      sourceAuthority: 'Ohio Department of Taxation',
    },
  },
  {
    jurisdiction: 'OH',
    id: 'oh.municipal_income_tax_annual_return',
    title: 'Ohio Revised Code Municipal Income Tax Annual Return Filing',
    url: 'https://codes.ohio.gov/ohio-revised-code/section-718.05',
    sourceType: 'publication',
    acquisitionMethod: 'html_watch',
    domains: ['local_individual_income'],
    entityApplicability: ['individual', 'sole_prop'],
    priority: 'high',
    healthStatus: 'healthy',
    localFactRequirements: [
      'resident_municipality',
      'work_municipality',
      'local_collector',
      'local_filing_channel',
    ],
    localJurisdiction: {
      level: 'municipality',
      state: 'OH',
      localCode: 'OH:MUNI:*',
      displayName: 'Ohio municipal income tax annual return jurisdictions',
      administeredBy: 'municipal_authority',
      collectedVia: 'local_return',
      sourceAuthority: 'Ohio Revised Code Chapter 718',
    },
  },
  {
    jurisdiction: 'OH',
    id: 'oh.municipal_net_profit_filing',
    title: 'Ohio Revised Code Municipal Net Profit Filing',
    url: 'https://codes.ohio.gov/ohio-revised-code/section-718.051',
    sourceType: 'publication',
    acquisitionMethod: 'html_watch',
    domains: ['local_business_income'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
    localFactRequirements: [
      'principal_office_municipality',
      'work_municipality',
      'local_collector',
      'local_filing_channel',
    ],
    localJurisdiction: {
      level: 'municipality',
      state: 'OH',
      localCode: 'OH:MUNI-NET-PROFIT:*',
      displayName: 'Ohio municipal net profit tax jurisdictions',
      administeredBy: 'municipal_authority',
      collectedVia: 'local_return',
      sourceAuthority: 'Ohio Revised Code Chapter 718',
    },
  },
  {
    jurisdiction: 'OH',
    id: 'oh.fiduciary_income_tax',
    title: 'Ohio IT 1041 Fiduciary Income Tax Instructions',
    url: 'https://dam.assets.ohio.gov/image/upload/v1769121382/tax.ohio.gov/forms/pass-through_entities/2025/it1041-instructions.pdf',
    sourceType: 'instructions',
    acquisitionMethod: 'pdf_watch',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'OH',
    id: 'oh.pass_through_entities',
    title: 'Ohio IT 4738 Electing Pass-Through Entity Income Tax Instructions',
    url: 'https://dam.assets.ohio.gov/image/upload/v1769121383/tax.ohio.gov/forms/pass-through_entities/2025/it4738-instructions.pdf',
    sourceType: 'instructions',
    acquisitionMethod: 'pdf_watch',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'OH',
    id: 'oh.commercial_activity_tax',
    title: 'Ohio Commercial Activity Tax Information Release',
    url: 'https://dam.assets.ohio.gov/image/upload/tax.ohio.gov/commercial_activities/information_releases/CAT_2023-01_info_release.pdf',
    sourceType: 'instructions',
    acquisitionMethod: 'pdf_watch',
    domains: ['franchise_or_entity_tax'],
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'OH',
    id: 'oh.sales_use_tax',
    title: 'Ohio Sales and Use Tax UST-1 Instructions',
    url: 'https://dam.assets.ohio.gov/image/upload/tax.ohio.gov/forms/sales_and_use/generic/ust-instructions.pdf',
    sourceType: 'instructions',
    acquisitionMethod: 'pdf_watch',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'OH',
    id: 'oh.employer_withholding',
    title: 'Ohio Employer and School District Withholding Tax Filing Guidelines',
    url: 'https://dam.assets.ohio.gov/image/upload/tax.ohio.gov/employer_withholding/2025-2026%20NYP%20Updates/2026_OH_Employer_School_District_Withholding_Tax_Filing_Guidelines.pdf',
    sourceType: 'instructions',
    acquisitionMethod: 'pdf_watch',
    domains: ['withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'OH',
    id: 'oh.ui_wage_report',
    title: 'Ohio Administrative Code Quarterly Reports and Due Date',
    url: 'https://codes.ohio.gov/ohio-administrative-code/rule-4141-11-01',
    sourceType: 'publication',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'OR',
    id: 'or.fiduciary_income_tax',
    title: 'Oregon Form OR-41 Fiduciary Income Tax Instructions',
    url: 'https://www.oregon.gov/dor/forms/FormsPubs/form-or-41-instr_101-041-1_2025.pdf',
    sourceType: 'instructions',
    acquisitionMethod: 'pdf_watch',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'OR',
    id: 'or.corporation_excise_income_tax',
    title: 'Oregon DOR Corporation Excise and Income Tax',
    url: 'https://www.oregon.gov/DOR/programs/businesses/Pages/corp-subc.aspx',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['business_income_return', 'business_estimated_tax'],
    entityApplicability: ['s_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'OR',
    id: 'or.pass_through_entity_elective_tax',
    title: 'Oregon Pass-Through Entity Elective Tax',
    url: 'https://www.oregon.gov/dor/programs/businesses/pages/pass-through-entity-elective-tax.aspx',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'OR',
    id: 'or.corporate_activity_tax',
    title: 'Oregon Corporate Activity Tax',
    url: 'https://www.oregon.gov/dor/programs/businesses/Pages/Corporate-Activity-Tax.aspx',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['franchise_or_entity_tax'],
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'OR',
    id: 'or.withholding_payroll_tax',
    title: 'Oregon DOR Withholding and Payroll Tax',
    url: 'https://www.oregon.gov/dor/programs/businesses/pages/withholding-and-payroll-tax.aspx',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['withholding', 'ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'SC',
    id: 'sc.individual_estimated_tax',
    title: 'South Carolina DOR Individual Declaration of Estimated Tax',
    url: 'https://dor.sc.gov/sites/dor/files/forms/SC1040ES_2026.pdf',
    sourceType: 'publication',
    acquisitionMethod: 'pdf_watch',
    domains: ['individual_estimated_tax'],
    entityApplicability: ['individual', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'SC',
    id: 'sc.fiduciary_income_tax',
    title: 'South Carolina DOR Fiduciary Income Tax',
    url: 'https://dor.sc.gov/business-income-taxes/fiduciary',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'SC',
    id: 'sc.corporate_income_tax',
    title: 'South Carolina DOR Corporate Income Tax',
    url: 'https://dor.sc.gov/business-income-taxes/corporate',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['business_income_return', 'business_estimated_tax', 'franchise_or_entity_tax'],
    entityApplicability: ['c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'SC',
    id: 'sc.partnership_tax',
    title: 'South Carolina DOR Partnership Tax',
    url: 'https://dor.sc.gov/tax/partnership',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'SC',
    id: 'sc.sales_tax',
    title: 'South Carolina DOR Sales Tax',
    url: 'https://dor.sc.gov/index.php/sales-use-tax-index/sales-tax',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'SC',
    id: 'sc.withholding_tax',
    title: 'South Carolina DOR Withholding Tax',
    url: 'https://dor.sc.gov/withholding',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'SC',
    id: 'sc.ui_wage_report',
    title: 'South Carolina DEW File a Wage Report',
    url: 'https://dew.sc.gov/unemployment-tax-information/file-wage-report',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'TN',
    id: 'tn.franchise_excise_tax',
    title: 'Tennessee DOR Franchise and Excise Tax Due Dates and Tax Rates',
    url: 'https://www.tn.gov/revenue/taxes/franchise---excise-tax/due-dates-and-tax-rates.html',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['business_income_return', 'business_estimated_tax', 'franchise_or_entity_tax'],
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'TN',
    id: 'tn.sales_use_due_dates',
    title: 'Tennessee DOR Sales and Use Tax Due Dates and Tax Rates',
    url: 'https://www.tn.gov/revenue/taxes/sales-and-use-tax/due-dates-and-tax-rates.html',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'TN',
    id: 'tn.ui_wage_report',
    title: 'Tennessee Unemployment Quarterly Report Due Date and Delinquent Cycle',
    url: 'https://lwdsupport.tn.gov/hc/en-us/articles/360001003928-What-is-delinquent-cycle',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'UT',
    id: 'ut.individual_estimated_tax',
    title:
      'Utah Individual Income Tax General Instructions (Due Dates, Extensions and Prepayments)',
    // 2026-06-10: tc-546.pdf is gone (404 at tax.utah.gov AND files.tax.utah.gov —
    // the state's own forms index links the dead file). The general-instructions
    // page carries the TC-546 prepayment/due-date/extension content.
    url: 'https://incometax.utah.gov/general-instructions',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['individual_estimated_tax'],
    entityApplicability: ['individual', 'sole_prop'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'UT',
    id: 'ut.fiduciary_income_tax',
    title: 'Utah Current Forms and Publications for Fiduciary Income Tax',
    url: 'https://tax.utah.gov/forms-pubs/',
    sourceType: 'publication',
    acquisitionMethod: 'html_watch',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'UT',
    id: 'ut.corporate_franchise_income_tax',
    title: 'Utah Corporation Franchise and Income Tax',
    url: 'https://tax.utah.gov/business/corporate-income-tax/',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['business_income_return', 'business_estimated_tax', 'franchise_or_entity_tax'],
    entityApplicability: ['c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'UT',
    id: 'ut.pass_through_entities',
    title: 'Utah Pass-Through Entity SALT Report FAQ',
    url: 'https://tax.utah.gov/business/pass-through/salt-faq/',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'UT',
    id: 'ut.sales_withholding_due_dates',
    title: 'Utah Quarterly Due Date Calendar for Sales and Withholding',
    url: 'https://tax.utah.gov/event/quarterly-due-date-jan-mar-2026/',
    sourceType: 'calendar',
    acquisitionMethod: 'html_watch',
    domains: ['sales_use_tax', 'withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'UT',
    id: 'ut.ui_wage_report',
    title: 'Utah Unemployment Quarterly Reporting',
    url: 'https://jobs.utah.gov/UI/Employer/Public/Questions/QuarterlyReporting.aspx',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'WI',
    id: 'wi.individual_estimated_tax',
    title: 'Wisconsin DOR Individual Income Tax Estimated Tax Payments',
    url: 'https://www.revenue.wi.gov/Pages/FAQS/pcs-estpay.aspx',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['individual_estimated_tax'],
    entityApplicability: ['individual', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'WI',
    id: 'wi.fiduciary_estates_trusts',
    title: 'Wisconsin DOR Estates, Trusts, and Fiduciaries',
    url: 'https://www.revenue.wi.gov/Pages/FAQS/ise-estate.aspx',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'WI',
    id: 'wi.corporation_franchise_income_tax',
    title: 'Wisconsin DOR Corporation Franchise or Income Tax',
    url: 'https://www.revenue.wi.gov/Pages/FAQS/ise-crpginfo.aspx',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['business_income_return', 'business_estimated_tax', 'franchise_or_entity_tax'],
    entityApplicability: ['c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'WI',
    id: 'wi.pass_through_entity_withholding',
    title: 'Wisconsin DOR Pass-Through Entity Withholding',
    url: 'https://www.revenue.wi.gov/Pages/OnlineServices/pw-home.aspx',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'WI',
    id: 'wi.sales_use_tax',
    title: 'Wisconsin DOR Sales and Use Tax Common Questions',
    url: 'https://www.revenue.wi.gov/Pages/faqs/pcs-sales.aspx',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'WI',
    id: 'wi.withholding_tax',
    title: 'Wisconsin DOR General Withholding Tax Questions',
    url: 'https://www.revenue.wi.gov/Pages/FAQS/pcs-with.aspx',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    domains: ['withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'WI',
    id: 'wi.ui_wage_report',
    title: 'Wisconsin DWD Wage Reporting Penalties and Due Dates',
    url: 'https://dwd.wisconsin.gov/ui201/w7201.htm',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AK',
    id: 'ak.corporate_income_tax',
    title: 'Alaska Tax Division Corporate Income Tax',
    url: 'https://tax.alaska.gov/programs/programs/index.aspx?10002',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['business_income_return', 'business_estimated_tax'],
    entityApplicability: ['c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AK',
    id: 'ak.ui_wage_report',
    title: 'Alaska Quarterly Contribution Report Instructions',
    url: 'https://www.labor.alaska.gov/estax/forms/TQ01B-26.pdf',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AR',
    id: 'ar.income_tax_deadlines',
    title: 'Arkansas DFA Individual Estimated Tax Vouchers',
    url: 'https://www.dfa.arkansas.gov/wp-content/uploads/2025_Final_AR1000ES.pdf',
    sourceType: 'instructions',
    acquisitionMethod: 'pdf_watch',
    domains: ['individual_estimated_tax'],
    entityApplicability: ['individual', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AR',
    id: 'ar.fiduciary_income_tax',
    title: 'Arkansas DFA Fiduciary Income Tax Instructions',
    url: 'https://www.dfa.arkansas.gov/wp-content/uploads/FiduciaryTaxInstructions_2025.pdf',
    sourceType: 'instructions',
    acquisitionMethod: 'pdf_watch',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AR',
    id: 'ar.corporation_income_tax',
    title: 'Arkansas DFA Corporation Income Tax Instructions',
    url: 'https://www.dfa.arkansas.gov/wp-content/uploads/CorporationIncomeTaxInstructions_2025.pdf',
    sourceType: 'instructions',
    acquisitionMethod: 'pdf_watch',
    domains: ['business_income_return', 'business_estimated_tax'],
    entityApplicability: ['c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AR',
    id: 'ar.pass_through_entity_tax',
    title: 'Arkansas DFA Pass-through Entity Tax',
    url: 'https://www.dfa.arkansas.gov/office/taxes/income-tax-administration/pass-through-entity-tax/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AR',
    id: 'ar.franchise_tax',
    title: 'Arkansas Secretary of State Franchise Tax',
    url: 'https://www.sos.arkansas.gov/business-commercial-services-bcs/franchise-tax-report-forms/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['franchise_or_entity_tax'],
    entityApplicability: ['llc', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AR',
    id: 'ar.sales_use_tax',
    title: 'Arkansas DFA Sales and Use Tax Due Dates',
    url: 'https://www.dfa.arkansas.gov/office/taxes/excise-tax-administration/sales-use-tax/due-dates/',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AR',
    id: 'ar.withholding_tax',
    title: 'Arkansas DFA Withholding Tax Instructions for Employers',
    url: 'https://www.dfa.arkansas.gov/wp-content/uploads/withholdInstructions_2026.pdf',
    sourceType: 'instructions',
    acquisitionMethod: 'pdf_watch',
    domains: ['withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'AR',
    id: 'ar.ui_wage_report',
    title: 'Arkansas Workforce Services Employer Handbook',
    url: 'https://dws.arkansas.gov/wp-content/uploads/Employer_Handbook_20220811.pdf',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'CT',
    id: 'ct.tax_filing_due_dates_2026',
    title: 'Connecticut DRS 2026 Tax Filing Due Dates Calendar',
    url: 'https://portal.ct.gov/-/media/drs/videos/drs-166_1225.pdf?rev=f8e881347ab14b4bb1c67ff9f7e9483d',
    sourceType: 'calendar',
    acquisitionMethod: 'manual_review',
    domains: [
      'individual_estimated_tax',
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'sales_use_tax',
      'withholding',
    ],
    entityApplicability: [
      'individual',
      'sole_prop',
      'trust',
      'llc',
      'partnership',
      's_corp',
      'c_corp',
    ],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'CT',
    id: 'ct.ui_wage_report',
    title: 'Connecticut DOL Quarterly Tax Return Due Dates',
    url: 'https://portal.ct.gov/dol/knowledge-base/articles/unemployment-taxes/what-are-the-due-dates-of-my-quarterly-tax-returns',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'DE',
    id: 'de.business_tax_forms',
    title: 'Delaware Division of Revenue Business Tax Forms',
    url: 'https://revenue.delaware.gov/business-tax-forms/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: [
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'withholding',
    ],
    entityApplicability: ['trust', 'llc', 'partnership', 's_corp', 'c_corp', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'DE',
    id: 'de.franchise_taxes',
    title: 'Delaware Division of Revenue Franchise Taxes',
    url: 'https://revenue.delaware.gov/business-tax-forms/franchise-taxes/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['franchise_or_entity_tax'],
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'DE',
    id: 'de.ui_wage_report',
    title: 'Delaware Department of Labor Employer Handbook',
    url: 'https://labor.delaware.gov/divisions/unemployment-insurance/employer-faqs/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'DC',
    id: 'dc.tax_filing_deadlines',
    title: 'DC OTR Tax Filing Deadlines',
    url: 'https://otr.cfo.dc.gov/',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: [
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'sales_use_tax',
      'withholding',
    ],
    entityApplicability: ['trust', 'llc', 'partnership', 's_corp', 'c_corp', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'DC',
    id: 'dc.business_franchise_tax',
    title: 'DC OTR Franchise Tax FAQs',
    url: 'https://otr.cfo.dc.gov/am/node/1794846',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['franchise_or_entity_tax'],
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'DC',
    id: 'dc.ui_wage_report',
    title: 'DC DOES Unemployment Insurance Tax',
    url: 'https://does.dc.gov/service/reporting-questions',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'HI',
    id: 'hi.individual_estimated_tax',
    title: 'Hawaii Tax Facts Estimated Income Tax for Individuals',
    url: 'https://files.hawaii.gov/tax/legal/taxfacts/tf2019-3.pdf',
    sourceType: 'publication',
    acquisitionMethod: 'pdf_watch',
    domains: ['individual_estimated_tax'],
    entityApplicability: ['individual', 'sole_prop'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'HI',
    id: 'hi.tax_forms',
    title: 'Hawaii Department of Taxation Forms',
    url: 'https://tax.hawaii.gov/forms/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: [
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'withholding',
    ],
    entityApplicability: ['trust', 'llc', 'partnership', 's_corp', 'c_corp', 'sole_prop'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'HI',
    id: 'hi.general_excise_use_tax',
    title: 'Hawaii General Excise Tax Information',
    url: 'https://tax.hawaii.gov/geninfo/get/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'HI',
    id: 'hi.ui_wage_report',
    title: 'Hawaii Unemployment Insurance Employer Handbook',
    url: 'https://labor.hawaii.gov/ui/test-handbook-for-employers/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'ID',
    id: 'id.business_income_tax',
    title: 'Idaho State Tax Commission Business Income Tax',
    url: 'https://tax.idaho.gov/taxes/income-tax/business-income/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: [
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
    ],
    entityApplicability: ['trust', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'ID',
    id: 'id.sales_withholding_due_dates',
    title: 'Idaho Sales, Use, and Withholding Due Dates',
    url: 'https://tax.idaho.gov/taxes/income-tax/withholding/withholding-due-dates/',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['sales_use_tax', 'withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'ID',
    id: 'id.ui_wage_report',
    title: 'Idaho Department of Labor Unemployment Insurance Tax Handbook',
    url: 'https://labor.idaho.gov/wp-content/uploads/publications/UI_TAX_Information-1.pdf',
    sourceType: 'publication',
    acquisitionMethod: 'pdf_watch',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'IN',
    id: 'in.local_county_income_tax',
    title: 'Indiana DOR Local County Income Tax Rates',
    url: 'https://www.in.gov/dor/business-tax/county-tax-information/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['local_individual_income'],
    entityApplicability: ['individual', 'sole_prop'],
    priority: 'high',
    healthStatus: 'healthy',
    localFactRequirements: ['resident_county', 'work_county', 'local_tax_rate'],
    localJurisdiction: {
      level: 'county',
      state: 'IN',
      localCode: 'IN:COUNTY:*',
      displayName: 'Indiana county local income tax',
      administeredBy: 'state',
      collectedVia: 'state_return',
      sourceAuthority: 'Indiana Department of Revenue',
    },
  },
  {
    jurisdiction: 'IN',
    id: 'in.tax_filing_deadlines',
    title: 'Indiana DOR Filing Deadlines',
    url: 'https://www.in.gov/dor/i-am-a/individual/tax-filing-deadlines/',
    sourceType: 'calendar',
    acquisitionMethod: 'manual_review',
    domains: [
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'sales_use_tax',
      'withholding',
    ],
    entityApplicability: ['trust', 'llc', 'partnership', 's_corp', 'c_corp', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'IN',
    id: 'in.ui_wage_report',
    title: 'Indiana DWD Quarterly Report Due Dates',
    url: 'https://www.in.gov/dwd/indiana-unemployment/employers/employer-guide/wage-reporting-need-to-know/quarterly-report-due-dates/',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'IA',
    id: 'ia.individual_estimated_tax',
    title: 'Iowa DOR Estimated Income Tax Payments',
    url: 'https://revenue.iowa.gov/taxes/tax-guidance/individual-income-tax/estimated-income-tax-payments',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['individual_estimated_tax'],
    entityApplicability: ['individual', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'IA',
    id: 'ia.business_tax_due_dates',
    title: 'Iowa DOR Filing Frequency and Return Due Dates',
    url: 'https://revenue.iowa.gov/taxes/file-my-taxes/business-taxes/filing-frequency-return-due-dates',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: [
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'sales_use_tax',
      'withholding',
    ],
    entityApplicability: [
      'individual',
      'sole_prop',
      'trust',
      'llc',
      'partnership',
      's_corp',
      'c_corp',
    ],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'IA',
    id: 'ia.ui_wage_report',
    title: 'Iowa Workforce Development Unemployment Insurance Handbook',
    url: 'https://workforce.iowa.gov/media/3040/download?inline=',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'KS',
    id: 'ks.tax_calendar',
    title: 'Kansas DOR Pub. KS-1515 Tax Calendar of Due Dates',
    url: 'https://www.ksrevenue.gov/pub1515.html',
    sourceType: 'calendar',
    acquisitionMethod: 'manual_review',
    domains: [
      'individual_income_return',
      'individual_estimated_tax',
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'sales_use_tax',
      'withholding',
    ],
    entityApplicability: [
      'individual',
      'sole_prop',
      'trust',
      'llc',
      'partnership',
      's_corp',
      'c_corp',
    ],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'KS',
    id: 'ks.ui_wage_report',
    title: 'Kansas Department of Labor Unemployment Tax',
    url: 'https://www.dol.ks.gov/employers/employer-services/unemployment-tax',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'KY',
    id: 'ky.tax_calendar_2026',
    title: 'Kentucky DOR 2026 Tax Calendar',
    url: 'https://revenue.ky.gov/News/Pages/Calendars.aspx',
    sourceType: 'calendar',
    acquisitionMethod: 'manual_review',
    domains: [
      'individual_estimated_tax',
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'franchise_or_entity_tax',
      'sales_use_tax',
      'withholding',
    ],
    entityApplicability: [
      'individual',
      'sole_prop',
      'trust',
      'llc',
      'partnership',
      's_corp',
      'c_corp',
    ],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'KY',
    id: 'ky.ui_wage_report',
    title: 'Kentucky Unemployment Insurance Portal Wage Report Guide',
    url: 'https://kcc.ky.gov/Documents/KUIP%20Delimited%20File%20Format%20Reference%20Guide.pdf',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'LA',
    id: 'la.tax_calendar',
    title: 'Louisiana Department of Revenue Tax Calendar',
    // Year-paginated calendar; feedUrl's {year} resolves at fetch time so the
    // watcher follows the live year (url stays the dated page rules cite).
    url: 'https://revenue.louisiana.gov/calendar/2026/',
    feedUrl: 'https://revenue.louisiana.gov/calendar/{year}/',
    sourceType: 'calendar',
    acquisitionMethod: 'manual_review',
    domains: [
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'franchise_or_entity_tax',
      'sales_use_tax',
      'withholding',
    ],
    entityApplicability: ['trust', 'llc', 'partnership', 's_corp', 'c_corp', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'LA',
    id: 'la.ui_wage_report',
    title: 'Louisiana Workforce Commission Employer Tax FAQs',
    url: 'https://www2.laworks.net/FAQs/FAQ_UI_EmployerTaxes.asp',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'ME',
    id: 'me.tax_due_dates',
    title: 'Maine Revenue Services List of Forms and Due Dates',
    url: 'https://www.maine.gov/revenue/tax-return-forms/due-dates',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: [
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'sales_use_tax',
      'withholding',
    ],
    entityApplicability: ['trust', 'llc', 'partnership', 's_corp', 'c_corp', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'ME',
    id: 'me.ui_wage_report',
    title: 'Maine Revenue Services List of Forms and Due Dates',
    url: 'https://www.maine.gov/revenue/tax-return-forms/due-dates',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MD',
    id: 'md.local_income_tax',
    title: 'Comptroller of Maryland Local Income Tax',
    url: 'https://www.marylandtaxes.gov/forms/Personal_Tax_Tips/tip50.pdf',
    sourceType: 'publication',
    acquisitionMethod: 'pdf_watch',
    domains: ['local_individual_income'],
    entityApplicability: ['individual'],
    priority: 'high',
    healthStatus: 'healthy',
    localFactRequirements: ['resident_county', 'local_tax_rate', 'local_filing_channel'],
    localJurisdiction: {
      level: 'state_administered_local',
      state: 'MD',
      localCode: 'MD:LOCAL-INCOME:*',
      displayName: 'Maryland counties and Baltimore City local income tax',
      administeredBy: 'state',
      collectedVia: 'state_return',
      sourceAuthority: 'Comptroller of Maryland',
    },
  },
  {
    jurisdiction: 'MD',
    id: 'md.tax_deadlines',
    title: 'Comptroller of Maryland Deadlines and Due Dates',
    url: 'https://www.marylandtaxes.gov/pros/deadlines-and-duedates.php',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: [
      'individual_estimated_tax',
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'sales_use_tax',
      'withholding',
    ],
    entityApplicability: [
      'individual',
      'sole_prop',
      'trust',
      'llc',
      'partnership',
      's_corp',
      'c_corp',
    ],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MD',
    id: 'md.pass_through_entity_tax',
    title: 'Maryland Pass-Through Entity Income Tax Return Instructions',
    url: 'https://www.marylandcomptroller.gov/content/dam/mdcomp/tax/instructions/2025/pte-booklet-510.pdf',
    sourceType: 'publication',
    acquisitionMethod: 'pdf_watch',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MD',
    id: 'md.ui_wage_report',
    title: 'Maryland Labor Quarterly Contributions and Payments Schedule',
    url: 'https://labor.maryland.gov/employment/danpcafaqs.shtml',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MN',
    id: 'mn.tax_due_dates',
    title: 'Minnesota Revenue Tax Due Dates',
    url: 'https://www.revenue.state.mn.us/tax-due-dates',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: [
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'sales_use_tax',
      'withholding',
    ],
    entityApplicability: ['trust', 'llc', 'partnership', 's_corp', 'c_corp', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MN',
    id: 'mn.ui_wage_report',
    title: 'Minnesota Employer Handbook Reports and Payments Due Dates',
    url: 'https://www.uimn.org/employers/publications/emp-hbook/due-date.jsp',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MS',
    id: 'ms.corporate_income_franchise_tax',
    title: 'Mississippi DOR Corporate Income and Franchise Tax',
    url: 'https://www.dor.ms.gov/business/corporate-income-and-franchise-tax',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['business_income_return', 'business_estimated_tax', 'franchise_or_entity_tax'],
    entityApplicability: ['c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MS',
    id: 'ms.fiduciary_income_tax',
    title: 'Mississippi DOR Fiduciary Return Instructions',
    url: 'https://www.dor.ms.gov/sites/default/files/tax-forms/individual/81100251%201.pdf',
    sourceType: 'publication',
    acquisitionMethod: 'pdf_watch',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MS',
    id: 'ms.pass_through_entity_tax',
    title: 'Mississippi DOR Business Tax Frequently Asked Questions',
    url: 'https://www.dor.ms.gov/business/business-tax-frequently-asked-questions#corporate-income-and-franchise-tax',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MS',
    id: 'ms.sales_withholding_tax',
    title: 'Mississippi DOR Business Tax Forms',
    url: 'https://www.dor.ms.gov/business',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MS',
    id: 'ms.withholding_tax',
    title: 'Mississippi DOR Withholding Tax',
    url: 'https://www.dor.ms.gov/business/withholding-tax',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MS',
    id: 'ms.ui_wage_report',
    title: 'Mississippi Department of Employment Security Quarterly Report and Tax Due Dates',
    url: 'https://mdes.ms.gov/employers/unemployment-tax/reporting-and-filing/quarterly-report-and-tax-due-dates/',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MO',
    id: 'mo.tax_calendar_2026',
    title: 'Missouri DOR 2026 Tax Calendar',
    url: 'https://dor.mo.gov/tax-calendar/',
    sourceType: 'calendar',
    acquisitionMethod: 'manual_review',
    domains: [
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'sales_use_tax',
      'withholding',
    ],
    entityApplicability: ['trust', 'llc', 'partnership', 's_corp', 'c_corp', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MO',
    id: 'mo.ui_wage_report',
    title: 'Missouri Labor Quarterly Reports',
    url: 'https://labor.mo.gov/des/employers/quarterly-reports',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MT',
    id: 'mt.tax_due_dates',
    title: 'Montana Department of Revenue Corporate Income Tax',
    url: 'https://revenue.mt.gov/taxes/corporate-income-tax',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['business_income_return', 'business_estimated_tax'],
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MT',
    id: 'mt.fiduciary_income_tax',
    title: 'Montana Department of Revenue Estate and Trust Income Tax Filing Requirements',
    url: 'https://revenue.mt.gov/taxes/fiduciaries/estate-and-trust-filing-requirements',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MT',
    id: 'mt.pass_through_entity_tax',
    title: 'Montana Department of Revenue Pass-Through Entities',
    url: 'https://revenue.mt.gov/taxes/pass-through-entities/',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MT',
    id: 'mt.withholding_due_dates',
    title: 'Montana Department of Revenue Wage Withholding Returns and Payments',
    url: 'https://revenue.mt.gov/taxes/withholding-tax/wage-withholding-returns-and-payments',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'MT',
    id: 'mt.ui_wage_report',
    title: 'Montana UI eServices for Employers',
    url: 'https://uid.dli.mt.gov/employers/eservices/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NE',
    id: 'ne.tax_calendar',
    title: 'Nebraska Department of Revenue Tax Calendar',
    url: 'https://revenue.nebraska.gov/about/tax-calendar',
    sourceType: 'calendar',
    acquisitionMethod: 'manual_review',
    domains: [
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'sales_use_tax',
      'withholding',
    ],
    entityApplicability: ['trust', 'llc', 'partnership', 's_corp', 'c_corp', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NE',
    id: 'ne.ui_wage_report',
    title: 'Nebraska Employer Tax Services User Guide Tax and Wage Reports',
    url: 'https://dol.nebraska.gov/webdocs/Resources/Items/1_Employers_Services_User_Guide%20Edited%20Version.pdf',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NV',
    id: 'nv.commerce_tax',
    title: 'Nevada Department of Taxation Commerce Tax FAQs',
    url: 'https://tax.nv.gov/faqs/commerce-tax-faqs/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['franchise_or_entity_tax'],
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NV',
    id: 'nv.sales_use_tax',
    title: 'Nevada Department of Taxation Sales and Use Tax FAQs',
    url: 'https://tax.nv.gov/faqs/sales-use-tax-faqs/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NV',
    id: 'nv.ui_wage_report',
    title: 'Nevada DETR Quarterly Reporting Information',
    url: 'https://detr.nv.gov/Page/NUI_View_Quarterly_Reporting_Info',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NH',
    id: 'nh.business_tax',
    title: 'New Hampshire DRA Business Tax Summary Instructions',
    url: 'https://www.revenue.nh.gov/sites/g/files/ehbemt736/files/documents/bt-summary-instructions-2024.pdf',
    sourceType: 'publication',
    acquisitionMethod: 'manual_review',
    domains: [
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'franchise_or_entity_tax',
    ],
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NH',
    id: 'nh.ui_wage_report',
    title: 'New Hampshire Employment Security File Employer Quarterly Tax and Wage Report',
    url: 'https://www2.nhes.nh.gov/webtax/File_Employer_Quarterly_Tax_Wage_Report.pdf',
    sourceType: 'publication',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NM',
    id: 'nm.corporate_income_franchise_tax',
    title: 'New Mexico Corporate Income and Franchise Tax Filing Requirements',
    url: 'https://www.tax.newmexico.gov/businesses/corporate-income-franchise-tax-overview/filing-requirements/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['business_income_return', 'business_estimated_tax', 'franchise_or_entity_tax'],
    entityApplicability: ['c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NM',
    id: 'nm.individual_estimated_tax',
    title: 'New Mexico Individual Estimated Payments',
    url: 'https://www.tax.newmexico.gov/individuals/file-your-taxes-overview/estimated-payments/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['individual_estimated_tax'],
    entityApplicability: ['individual', 'sole_prop'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NM',
    id: 'nm.fiduciary_income_tax',
    title: 'New Mexico Estate, Trust, and Fiduciary Income Tax',
    url: 'https://www.tax.newmexico.gov/individuals/personal-income-tax-information-overview/estate-trust-and-fiduciary-income-tax/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NM',
    id: 'nm.pass_through_entity_tax',
    title: 'New Mexico Pass-Through Entity Information',
    url: 'https://www.tax.newmexico.gov/businesses/pass-through-entity/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NM',
    id: 'nm.gross_receipts_tax',
    title: 'New Mexico Gross Receipts Tax Overview',
    url: 'https://www.tax.newmexico.gov/governments/gross-receipts-tax/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NM',
    id: 'nm.withholding_tax',
    title: 'New Mexico Wage Withholding Tax',
    url: 'https://www.tax.newmexico.gov/Businesses/Wage-Withholding-Tax/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'NM',
    id: 'nm.ui_wage_report',
    title: 'New Mexico Workforce Solutions UI Tax and Claims System',
    url: 'https://www.dws.state.nm.us/en-us/Unemployment/Unemployment-Insurance-Tax-Claims-System',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'ND',
    id: 'nd.tax_types',
    title: 'North Dakota Tax Types',
    url: 'https://www.tax.nd.gov/tax-types',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['fiduciary_income_return', 'pass_through_entity_return'],
    entityApplicability: ['trust', 'llc', 'partnership', 's_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'ND',
    id: 'nd.fiduciary_tax',
    title: 'North Dakota Fiduciary Tax',
    url: 'https://www.tax.nd.gov/business/fiduciary-tax',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'ND',
    id: 'nd.corporate_income_tax_deadlines',
    title: 'North Dakota Corporate Income Tax Deadlines',
    url: 'https://www.tax.nd.gov/corporate-income-tax-deadlines',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['business_income_return', 'business_estimated_tax'],
    entityApplicability: ['c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'ND',
    id: 'nd.s_corp_partnership_tax_deadlines',
    title: 'North Dakota S Corp and Partnership Tax Deadlines',
    url: 'https://www.tax.nd.gov/s-corp-and-partnership-tax-deadlines',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'ND',
    id: 'nd.sales_use_tax',
    title: 'North Dakota Sales and Use Tax Deadlines',
    url: 'https://www.tax.nd.gov/sales-and-use-tax-deadlines',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'ND',
    id: 'nd.withholding_tax',
    title: 'North Dakota Income Tax Withholding Deadlines',
    url: 'https://www.tax.nd.gov/news/resources/tax-deadlines/income-tax-withholding-deadlines',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'ND',
    id: 'nd.ui_wage_report',
    title: 'North Dakota Job Service File Reports',
    url: 'https://www.jobsnd.com/unemployment-business-tax/file-reports',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'OK',
    id: 'ok.other_taxes',
    title: 'Oklahoma Tax Commission Other Taxes',
    url: 'https://oklahoma.gov/tax/businesses/other-taxes.html',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: [
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
    ],
    entityApplicability: ['trust', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'OK',
    id: 'ok.business_tax_help',
    title: 'Oklahoma Tax Commission Business Help Center',
    url: 'https://www.oklahoma.gov/tax/helpcenter/businesses.html?q=BUSGEN3',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['sales_use_tax', 'withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'OK',
    id: 'ok.ui_wage_report',
    title: 'Oklahoma Employment Security Commission Wage Reporting',
    url: 'https://oklahoma.gov/oesc/employers/tax/wage-reporting.html',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'RI',
    id: 'ri.fiduciary_income_tax',
    title: 'Rhode Island Fiduciary Tax Filing Requirements',
    url: 'https://tax.ri.gov/tax-sections/personal-income-tax/fiduciary-tax-filing-requirements',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'RI',
    id: 'ri.corporate_tax_forms',
    title: 'Rhode Island Division of Taxation Corporate Tax Forms',
    url: 'https://tax.ri.gov/forms/business-tax-forms/corporate-tax-forms',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: [
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'franchise_or_entity_tax',
    ],
    entityApplicability: ['trust', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'RI',
    id: 'ri.sales_tax',
    title: 'Rhode Island Division of Taxation Sales and Use Tax',
    url: 'https://tax.ri.gov/tax-sections/sales-excise-taxes/sales-use-tax',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'RI',
    id: 'ri.withholding_tax',
    title: 'Rhode Island Division of Taxation Withholding Tax',
    url: 'https://tax.ri.gov/tax-sections/withholding-tax',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'RI',
    id: 'ri.ui_wage_report',
    title: 'Rhode Island DLT Employer Tax Unit',
    url: 'https://dlt.ri.gov/employers/employer-tax-unit',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'SD',
    id: 'sd.sales_use_tax',
    title: 'South Dakota DOR Sales and Use Tax',
    url: 'https://dor.sd.gov/businesses/taxes/sales-use-tax/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'SD',
    id: 'sd.ui_wage_report',
    title: 'South Dakota Reemployment Assistance for Businesses',
    url: 'https://dlr.sd.gov/ra/businesses/default.aspx',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'VT',
    id: 'vt.individual_estimated_tax',
    title: 'Vermont Individual Estimated Income Tax Payment Voucher Instructions',
    url: 'https://tax.vermont.gov/sites/tax/files/documents/IN-114-Instr-2025.pdf',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['individual_estimated_tax'],
    entityApplicability: ['individual', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'VT',
    id: 'vt.fiduciary_income_tax',
    title: 'Vermont Income Tax Returns by Individuals, Trusts, and Estates Statute',
    url: 'https://legislature.vermont.gov/statutes/section/32/151/05861',
    sourceType: 'publication',
    acquisitionMethod: 'manual_review',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'VT',
    id: 'vt.corporate_income_tax',
    title: 'Vermont Corporate and Business Income Tax Return Instructions',
    url: 'https://tax.vermont.gov/business/corporate-income-tax',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['business_income_return', 'business_estimated_tax'],
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'VT',
    id: 'vt.pass_through_entity_tax',
    title: 'Vermont Business Income Tax Return Instructions',
    url: 'https://tax.vermont.gov/business/business-entity-income-tax',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'VT',
    id: 'vt.sales_use_tax',
    title: 'Vermont Sales and Use Tax Business Registration Guidance',
    url: 'https://tax.vermont.gov/business/sales-and-use-tax',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'VT',
    id: 'vt.withholding_tax',
    title: 'Vermont Income Tax Withholding Instructions',
    url: 'https://tax.vermont.gov/sites/tax/files/documents/GB-1210-2023.pdf',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['withholding'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'VT',
    id: 'vt.tax_due_dates',
    title: 'Vermont Department of Taxes Forms and Publications',
    url: 'https://tax.vermont.gov/all-forms',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['sales_use_tax', 'withholding'],
    entityApplicability: [
      'individual',
      'sole_prop',
      'trust',
      'llc',
      'partnership',
      's_corp',
      'c_corp',
    ],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'VT',
    id: 'vt.ui_wage_report',
    title: 'Vermont Department of Labor Quarterly Wage and Contribution Reports',
    url: 'https://labor.vermont.gov/unemployment-insurance/ui-employers/quarterly-reporting-taxable-wage-information',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'WV',
    id: 'wv.business_tax_due_dates',
    title: 'West Virginia Tax Division Business Taxes',
    url: 'https://tax.wv.gov/Business/Pages/Business.aspx',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: [
      'fiduciary_income_return',
      'business_income_return',
      'business_estimated_tax',
      'pass_through_entity_return',
      'sales_use_tax',
      'withholding',
    ],
    entityApplicability: ['trust', 'llc', 'partnership', 's_corp', 'c_corp', 'sole_prop'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'WV',
    id: 'wv.ui_wage_report',
    title: 'WorkForce West Virginia Tax Filing and Reporting',
    url: 'https://workforcewv.org/businesses/unemployment-tax-information/tax-filing-reporting/',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'WY',
    id: 'wy.sales_use_tax',
    title: 'Wyoming Statutes Title 39 Sales Tax Compliance Procedures',
    url: 'https://wyoleg.gov/statutes/compress/title39.pdf',
    sourceType: 'publication',
    acquisitionMethod: 'pdf_watch',
    domains: ['sales_use_tax'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'WY',
    id: 'wy.annual_license_tax',
    title: 'Wyoming Secretary of State Annual Report License Tax',
    url: 'https://sos.wyo.gov/faqs.aspx?root=BUS',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['franchise_or_entity_tax'],
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'critical',
    healthStatus: 'healthy',
  },
  {
    jurisdiction: 'WY',
    id: 'wy.ui_wage_report',
    title: 'Wyoming DWS Unemployment Insurance User Portal',
    url: 'https://dws.wyo.gov/de/dws-division/unemployment-insurance/wyui/',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'healthy',
  },
] as const

type StateRuleSourceIds = Readonly<{
  incomeTax: string
}>

export const STATE_RULE_SOURCE_IDS = new Map<RuleGenerationState, StateRuleSourceIds>(
  STATE_RULE_SOURCE_SEEDS.map((seed): readonly [RuleGenerationState, StateRuleSourceIds] => [
    seed.jurisdiction,
    {
      incomeTax: `${seed.jurisdiction.toLowerCase()}.income_tax`,
    },
  ]),
)

function stateRuleSourceIds(jurisdiction: RuleGenerationState): StateRuleSourceIds {
  const ids = STATE_RULE_SOURCE_IDS.get(jurisdiction)
  if (!ids) throw new Error(`Missing official source ids for ${jurisdiction}`)
  return ids
}

export const STATE_OFFICIAL_SOURCES = STATE_RULE_SOURCE_SEEDS.flatMap<RuleSource>((seed) => {
  const ids = stateRuleSourceIds(seed.jurisdiction)
  const incomeTaxSource = STATE_INCOME_TAX_SOURCE_BY_JURISDICTION.get(seed.jurisdiction)
  const sources: RuleSource[] = []

  if (incomeTaxSource) {
    const supportedSlugs =
      incomeTaxSource.candidateDomainSlugs ?? DEFAULT_INCOME_CANDIDATE_DOMAIN_SLUGS
    sources.push({
      id: ids.incomeTax,
      jurisdiction: seed.jurisdiction,
      title: incomeTaxSource.title,
      url: incomeTaxSource.url,
      ...(incomeTaxSource.feedUrl ? { feedUrl: incomeTaxSource.feedUrl } : {}),
      sourceType: incomeTaxSource.sourceType ?? 'instructions',
      acquisitionMethod: incomeTaxSource.acquisitionMethod ?? 'manual_review',
      cadence: 'pre_season',
      priority: 'high',
      healthStatus: 'healthy',
      isEarlyWarning: false,
      domains: supportedSlugs,
      entityApplicability: supportedSlugs.includes('individual_estimated_tax')
        ? ['individual', 'sole_prop']
        : ['individual'],
      authorityRole: 'basis',
      alertPurpose: 'rule_source_watch',
      notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
      lastReviewedOn: VERIFIED_AT,
    })
  }

  for (const source of STATE_ADDITIONAL_RULE_SOURCE_SEEDS) {
    if (source.jurisdiction !== seed.jurisdiction) continue
    sources.push({
      id: source.id,
      jurisdiction: source.jurisdiction,
      ...(source.localJurisdiction ? { localJurisdiction: source.localJurisdiction } : {}),
      ...(source.localFactRequirements
        ? { localFactRequirements: [...source.localFactRequirements] }
        : {}),
      title: source.title,
      url: source.url,
      ...(source.feedUrl ? { feedUrl: source.feedUrl } : {}),
      sourceType: source.sourceType,
      acquisitionMethod: source.acquisitionMethod,
      cadence: 'pre_season',
      priority: source.priority ?? 'high',
      healthStatus: source.healthStatus ?? 'healthy',
      isEarlyWarning: false,
      domains: source.domains,
      entityApplicability: source.entityApplicability,
      authorityRole: 'basis',
      alertPurpose: 'rule_source_watch',
      notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
      lastReviewedOn: VERIFIED_AT,
    })
  }

  return sources
})

type RuleSourceSeedRecord = Omit<
  RuleSource,
  'domains' | 'entityApplicability' | 'authorityRole' | 'alertPurpose'
> &
  Partial<Pick<RuleSource, 'domains' | 'entityApplicability' | 'authorityRole' | 'alertPurpose'>>

const STATE_TEMPORARY_ANNOUNCEMENT_SOURCES: readonly {
  id: string
  jurisdiction: RuleGenerationState
  title: string
  url: string
  sourceType?: RuleSourceType
  acquisitionMethod?: AcquisitionMethod
  priority?: SourcePriority
  adapterKind?: SourceAdapterKind
  feedUrl?: string
  inboundEmail?: InboundEmailRuleSourceConfig
  alertCoverageRoles?: readonly AlertSourceCoverageRole[]
  sourceAgency?: string
  sourceNotes?: string
}[] = [
  {
    id: 'ak.temporary_announcements',
    jurisdiction: 'AK',
    title: 'Alaska Tax Division News',
    url: 'https://tax.alaska.gov/programs/whatsnew.aspx',
  },
  {
    id: 'al.temporary_announcements',
    jurisdiction: 'AL',
    title: 'Alabama DOR News',
    url: 'https://www.revenue.alabama.gov/news/',
    // Index-level relief signal: AL has no dedicated relief page; it posts
    // disaster filing extensions here (mirrors IRS-designated areas).
    alertCoverageRoles: ['relief_or_disaster_signal'],
  },
  {
    id: 'ar.temporary_announcements',
    jurisdiction: 'AR',
    title: 'Arkansas DFA News',
    url: 'https://www.dfa.arkansas.gov/about/news/',
    // Index-level relief signal: AR posts disaster relief via DFA news +
    // gubernatorial orders; no dedicated relief page.
    alertCoverageRoles: ['relief_or_disaster_signal'],
  },
  {
    id: 'az.temporary_announcements',
    jurisdiction: 'AZ',
    title: 'Arizona DOR News Center',
    // 2026-06-10: metadata corrected api_watch/rss → html_watch (the URL is an
    // HTML news page, not a feed; same fix as RI/ND). azdor.gov WAF-403s
    // non-browser clients — fetched via browserless (PULSE_BROWSERLESS_SOURCE_IDS).
    url: 'https://azdor.gov/news-center',
    alertCoverageRoles: ['relief_or_disaster_signal'],
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  {
    id: 'ca.temporary_announcements',
    jurisdiction: 'CA',
    title: 'California FTB Emergency Tax Relief',
    url: 'https://www.ftb.ca.gov/file/when-to-file/emergency-tax-relief.html',
    sourceType: 'emergency_relief',
    priority: 'critical',
  },
  {
    id: 'co.temporary_announcements',
    jurisdiction: 'CO',
    title: 'Colorado DOR Press Releases',
    url: 'https://tax.colorado.gov/category/press-release?page=0',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  {
    id: 'ct.temporary_announcements',
    jurisdiction: 'CT',
    title: 'Connecticut DRS Media Room',
    url: 'https://portal.ct.gov/drs/press-room/press-releases',
    alertCoverageRoles: ['relief_or_disaster_signal'],
  },
  {
    id: 'dc.temporary_announcements',
    jurisdiction: 'DC',
    title: 'District of Columbia OTR Newsroom',
    url: 'https://otr.cfo.dc.gov/newsroom',
    // Index-level relief signal: DC posts disaster relief as OTR newsroom
    // releases; the prior dedicated page was a frozen one-off (retired 2026-06-10).
    alertCoverageRoles: ['relief_or_disaster_signal'],
  },
  {
    id: 'de.temporary_announcements',
    jurisdiction: 'DE',
    title: 'Delaware Division of Revenue News',
    url: 'https://news.delaware.gov/category/finance/division-of-revenue/',
    alertCoverageRoles: ['relief_or_disaster_signal'],
  },
  {
    id: 'fl.temporary_announcements',
    jurisdiction: 'FL',
    title: 'Florida DOR Tax Information Publications',
    url: 'https://floridarevenue.com/taxes/tips/Pages/default.aspx',
  },
  {
    id: 'ga.temporary_announcements',
    jurisdiction: 'GA',
    title: 'Georgia DOR Press Releases',
    url: 'https://dor.georgia.gov/press-releases',
    // Index-level relief signal: GA posts disaster relief as press-release
    // items; the prior dedicated page was a frozen one-off (retired 2026-06-10).
    alertCoverageRoles: ['relief_or_disaster_signal'],
  },
  {
    id: 'hi.temporary_announcements',
    jurisdiction: 'HI',
    title: 'Hawaii DOTAX News',
    url: 'https://tax.hawaii.gov/news/a2_1media/',
  },
  {
    id: 'ia.temporary_announcements',
    jurisdiction: 'IA',
    title: 'Iowa DOR Newsroom',
    url: 'https://revenue.iowa.gov/newsroom',
  },
  {
    id: 'id.temporary_announcements',
    jurisdiction: 'ID',
    title: 'Idaho Tax Commission Newsroom',
    url: 'https://tax.idaho.gov/pressrelease/',
    // Index-level relief signal: ID posts disaster relief as press releases;
    // the prior dedicated page was a frozen one-off (retired 2026-06-10).
    alertCoverageRoles: ['relief_or_disaster_signal'],
  },
  {
    id: 'il.temporary_announcements',
    jurisdiction: 'IL',
    title: 'Illinois DOR News',
    // research/news.html is client-rendered (a non-JS fetch sees "No recent
    // news"). research/publications/bulletins.html is the server-rendered <table>
    // of the same FY-2026-NN bulletins, newest first — readable by the default
    // direct fetch with no JS/browserless. (Per-item pub dates, if ever needed,
    // live on the individual .../research/news/fy-2026-NN-news.html pages.)
    url: 'https://tax.illinois.gov/research/publications/bulletins.html',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  {
    id: 'in.temporary_announcements',
    jurisdiction: 'IN',
    title: 'Indiana DOR News and Publications',
    url: 'https://www.in.gov/dor/about/news-publications/',
  },
  {
    id: 'ks.temporary_announcements',
    jurisdiction: 'KS',
    title: 'Kansas DOR Press Releases',
    // 2026-06-10: metadata corrected api_watch/rss → html_watch (HTML page, not
    // a feed). ksrevenue.gov TLS-blocks non-browser clients — fetched via
    // browserless (PULSE_BROWSERLESS_SOURCE_IDS).
    url: 'https://www.ksrevenue.gov/pressreleases.html',
    alertCoverageRoles: ['relief_or_disaster_signal'],
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  {
    id: 'ky.temporary_announcements',
    jurisdiction: 'KY',
    title: 'Kentucky DOR News',
    url: 'https://revenue.ky.gov/News/Pages/default.aspx',
    // Index-level relief signal: KY posts disaster relief as DOR news items;
    // the prior dedicated page was a frozen one-off (retired 2026-06-10).
    alertCoverageRoles: ['relief_or_disaster_signal'],
  },
  {
    id: 'la.temporary_announcements',
    jurisdiction: 'LA',
    title: 'Louisiana DOR News and Announcements',
    url: 'https://revenue.louisiana.gov/news-and-announcements/',
  },
  {
    id: 'ma.temporary_announcements',
    jurisdiction: 'MA',
    title: 'Massachusetts DOR Press Releases',
    url: 'https://www.mass.gov/lists/2026-dor-press-releases',
    inboundEmail: {
      localParts: ['pulse-ingest+ma-dor-press'],
      senderDomains: [
        'content.govdelivery.com',
        'public.govdelivery.com',
        'service.govdelivery.com',
        'mass.gov',
      ],
      listIdPatterns: ['mador', 'massachusetts department of revenue', 'massachusetts dor'],
      canonicalUrlHosts: ['content.govdelivery.com', 'mass.gov', 'www.mass.gov'],
      verificationStatus: 'verified_official',
      subscriptionUrl: 'https://www.mass.gov/lists/2026-dor-press-releases',
      verificationNotes:
        'Official Massachusetts DOR GovDelivery/List-ID signal; monitored in parallel with the web page.',
    },
  },
  {
    id: 'md.temporary_announcements',
    jurisdiction: 'MD',
    title: 'Comptroller of Maryland Newsroom',
    url: 'https://www.marylandcomptroller.gov/about/newsroom/media.html',
    // MD has no standing dedicated disaster-relief page; relief is posted here
    // (e.g. the 2024 Key Bridge business-tax relief), so this newsroom doubles
    // as MD's index-level relief signal.
    alertCoverageRoles: ['relief_or_disaster_signal'],
  },
  {
    id: 'me.temporary_announcements',
    jurisdiction: 'ME',
    title: 'Maine Revenue Services Tax Alerts',
    // MRS publishes Tax Alerts only as monthly PDFs indexed here; pdf_watch so the
    // adapter follows + parses the PDFs rather than scraping the index link text.
    url: 'https://www.maine.gov/revenue/publications/maine-tax-alerts',
    acquisitionMethod: 'pdf_watch',
    adapterKind: 'pdf_index',
  },
  {
    id: 'me.revenue_important_updates',
    jurisdiction: 'ME',
    title: 'Maine Revenue Services Important Updates',
    // Secondary ME signal: the MRS homepage "Important Updates" panel surfaces
    // current alerts/notices (Maine Tax Portal changes, OBBBA conformity, phishing
    // warnings) as HTML links. Overlap with the Tax Alerts PDFs above is deduped.
    url: 'https://www.maine.gov/revenue/',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  {
    id: 'mi.temporary_announcements',
    jurisdiction: 'MI',
    title: 'Michigan Treasury Taxes News',
    // 2026-06-10: metadata corrected api_watch/rss → html_watch (HTML page, not
    // a feed). michigan.gov WAF-403s non-browser clients — fetched via
    // browserless (PULSE_BROWSERLESS_SOURCE_IDS).
    url: 'https://www.michigan.gov/taxes/news',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  {
    id: 'mn.temporary_announcements',
    jurisdiction: 'MN',
    title: 'Minnesota DOR News Release Archive',
    url: 'https://www.revenue.state.mn.us/newsroom/press-release-archive',
  },
  {
    id: 'mo.temporary_announcements',
    jurisdiction: 'MO',
    title: 'Missouri DOR News',
    url: 'https://dor.mo.gov/news/',
    acquisitionMethod: 'api_watch',
    adapterKind: 'rss_or_announcement_list',
    feedUrl: 'https://dor.mo.gov/news/rss',
    // Index-level relief signal: MO posts disaster relief as DOR news items;
    // the prior dedicated page was a frozen one-off (retired 2026-06-10).
    alertCoverageRoles: ['relief_or_disaster_signal'],
  },
  {
    id: 'ms.temporary_announcements',
    jurisdiction: 'MS',
    title: 'Mississippi DOR News',
    url: 'https://www.dor.ms.gov/news',
    // Index-level relief signal: MS posts disaster relief (e.g. Winter Storm
    // Fern, Jan 2026) as news items; the prior dedicated page was a frozen
    // one-off (retired 2026-06-10).
    alertCoverageRoles: ['relief_or_disaster_signal'],
  },
  {
    id: 'mt.temporary_announcements',
    jurisdiction: 'MT',
    title: 'Montana DOR News',
    url: 'https://mtrevenue.gov/news/',
  },
  {
    id: 'nc.temporary_announcements',
    jurisdiction: 'NC',
    title: 'North Carolina DOR Press Releases',
    url: 'https://www.ncdor.gov/news/press-releases',
  },
  {
    id: 'nd.temporary_announcements',
    jurisdiction: 'ND',
    title: 'North Dakota Office of State Tax Commissioner News',
    // /news/tax-legislative-changes is a hub; /news is the parent newsroom that
    // renders the reverse-chron dated release list as server-side HTML. Same
    // RI-style correction: this is an HTML listing, not an RSS/Atom feed, so it
    // is html_watch (not api_watch with feedUrl pointed at the same HTML page).
    url: 'https://www.tax.nd.gov/news',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  {
    id: 'ne.temporary_announcements',
    jurisdiction: 'NE',
    title: 'Nebraska DOR News Releases',
    url: 'https://revenue.nebraska.gov/about/news-releases',
  },
  {
    id: 'nh.temporary_announcements',
    jurisdiction: 'NH',
    title: 'New Hampshire DRA News and Announcements',
    // /news-and-media 301-redirects here (the resource-center news & announcements
    // page); point straight at the canonical target instead of the redirect.
    url: 'https://www.revenue.nh.gov/resource-center/news-and-announcements',
  },
  {
    id: 'nj.temporary_announcements',
    jurisdiction: 'NJ',
    title: 'New Jersey Division of Taxation Latest News',
    url: 'https://www.nj.gov/treasury/taxation/whatsnew.shtml',
  },
  {
    id: 'nm.temporary_announcements',
    jurisdiction: 'NM',
    title: 'New Mexico TRD News Alerts',
    url: 'https://www.tax.newmexico.gov/news-alerts/',
    // Index-level relief signal: NM posts disaster filing-extension relief as
    // news alerts / B-100 bulletins here; no dedicated relief page.
    alertCoverageRoles: ['relief_or_disaster_signal'],
  },
  {
    id: 'nv.temporary_announcements',
    jurisdiction: 'NV',
    title: 'Nevada Department of Taxation Tax Notes',
    // 2026-06-10: repointed. The old WordPress /feed/ has been dead since
    // 2024-06 (single junk 'Search Results' item) and /news-publications/ is a
    // bare hub — NV effectively had zero coverage. Tax Notes is the dated
    // quarterly newsletter index (PDF links), the same pdf_index pattern as ME.
    url: 'https://tax.nv.gov/news-publications/nevada-tax-notes/',
    acquisitionMethod: 'pdf_watch',
    adapterKind: 'pdf_index',
    sourceNotes:
      'Quarterly Nevada Tax Notes newsletter index; PDF issues carry due-date and policy announcements.',
  },
  {
    id: 'ny.temporary_announcements',
    jurisdiction: 'NY',
    title: 'New York Tax Department Press Releases',
    // /press/ is only a hub and /press/rel/ a bare year index; the dated release
    // list lives on the per-year page. {year} resolves to the current year at
    // fetch time (resolveAnnouncementYearUrl) so the watcher follows the live year.
    url: 'https://www.tax.ny.gov/press/rel/{year}/',
    // Index-level relief signal: NY announces disaster due-date changes via
    // press releases + N-Notices; no single dedicated relief landing page.
    alertCoverageRoles: ['relief_or_disaster_signal'],
  },
  {
    id: 'oh.temporary_announcements',
    jurisdiction: 'OH',
    title: 'Ohio Department of Taxation Tax Alerts',
    url: 'https://public.govdelivery.com/accounts/OHTAX/subscriber/new',
    acquisitionMethod: 'email_subscription',
    adapterKind: 'email_inbound',
    inboundEmail: {
      localParts: ['pulse-ingest+oh-tax-alerts'],
      senderDomains: [
        'content.govdelivery.com',
        'public.govdelivery.com',
        'service.govdelivery.com',
      ],
      listIdPatterns: ['ohtax', 'ohio department of taxation', 'ohio tax'],
      canonicalUrlHosts: ['content.govdelivery.com', 'tax.ohio.gov'],
      verificationStatus: 'verified_official',
      subscriptionUrl: 'https://public.govdelivery.com/accounts/OHTAX/subscriber/new',
      verificationNotes: 'Official Ohio Department of Taxation GovDelivery subscription page.',
    },
  },
  {
    id: 'oh.sales_tax_rate_changes',
    jurisdiction: 'OH',
    title: 'Ohio Department of Taxation Tax Alerts Archive',
    // 2026-06-10: repointed /taxalerts (subscription hub) → the dated alerts
    // archive content page. tax.ohio.gov WAF-404s non-browser clients (even its
    // homepage), so this is fetched via browserless (PULSE_BROWSERLESS_SOURCE_IDS).
    // OH's only web watch — the parallel oh.temporary_announcements is email-only.
    url: 'https://tax.ohio.gov/professional/ohtaxalert/taxalertsarchive',
    alertCoverageRoles: ['relief_or_disaster_signal'],
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
    sourceNotes:
      'Official Ohio Department of Taxation Tax Alerts archive (dated tax-change notices). Replaces The Finder rate-lookup tool, which is an interactive query form, not an announcement stream.',
  },
  {
    id: 'ok.temporary_announcements',
    jurisdiction: 'OK',
    title: 'Oklahoma Tax Commission Newsroom',
    url: 'https://oklahoma.gov/tax/newsroom.html',
    // Index-level relief signal: OK posts disaster relief as dated newsroom
    // items; the prior dedicated page was a frozen one-off (retired 2026-06-10).
    alertCoverageRoles: ['relief_or_disaster_signal'],
  },
  {
    id: 'or.temporary_announcements',
    jurisdiction: 'OR',
    title: 'Oregon DOR Newsroom Press Releases',
    url: 'https://apps.oregon.gov/oregon-newsroom/OR/DOR/Posts/Search?type=Press+Release',
    // Index-level relief signal: OR posts wildfire/disaster relief via DOR
    // newsroom releases; no dedicated relief landing page.
    alertCoverageRoles: ['relief_or_disaster_signal'],
  },
  {
    id: 'pa.temporary_announcements',
    jurisdiction: 'PA',
    title: 'Pennsylvania DOR Newsroom',
    // DOR Newsroom (replaced the PA Tax Update newsletter PDF index): a
    // reverse-chron dated press-release list rendered as HTML, hence html_watch
    // not pdf_watch. The list is JS-rendered (routed via browserless), and the
    // #sortCriteria effective-date-desc fragment makes that JS sort newest-first.
    // NOTE: `url` is required — omitting it crashes the worker at boot
    // (resolveAnnouncementYearUrl reads `url.includes`).
    // Index-level relief signal: PA surfaces disaster relief via DOR newsroom
    // releases; relief is otherwise federal/PEMA-driven.
    url: 'https://www.pa.gov/agencies/revenue/newsroom#sortCriteria=%40copapwpeffectivedate%20descending',
    alertCoverageRoles: ['relief_or_disaster_signal'],
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  {
    id: 'ri.temporary_announcements',
    jurisdiction: 'RI',
    title: 'Rhode Island DOR Press Releases',
    // RI publishes press releases as an HTML listing (dor.ri.gov/press-releases
    // with /press-releases/<slug> items), not an RSS/Atom feed. Previously this
    // was mislabeled api_watch + rss_or_announcement_list with feedUrl pointing
    // at the same HTML page; corrected to html_watch so the metadata matches the
    // actual acquisition path.
    url: 'https://dor.ri.gov/press-releases',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
  },
  {
    id: 'sc.temporary_announcements',
    jurisdiction: 'SC',
    title: 'South Carolina DOR News',
    url: 'https://dor.sc.gov/news',
  },
  {
    id: 'sd.temporary_announcements',
    jurisdiction: 'SD',
    title: 'South Dakota DOR Newsroom',
    url: 'https://dor.sd.gov/newsroom/',
  },
  {
    id: 'tn.temporary_announcements',
    jurisdiction: 'TN',
    title: 'Tennessee DOR Revenue News',
    // /revenue/revenue-news.html is a hub; /content/tn/revenue/news.html is the
    // AEM path that serves the actual reverse-chron dated news list (important
    // notices + enforcement releases) and is the form that fetches reliably.
    url: 'https://www.tn.gov/content/tn/revenue/news.html',
  },
  {
    id: 'tx.temporary_announcements',
    jurisdiction: 'TX',
    title: 'Texas Comptroller News',
    url: 'https://comptroller.texas.gov/about/media-center/news/',
    inboundEmail: {
      localParts: ['pulse-ingest+tx-comptroller-news'],
      senderDomains: [
        'content.govdelivery.com',
        'public.govdelivery.com',
        'service.govdelivery.com',
        'comptroller.texas.gov',
      ],
      listIdPatterns: ['txcompt', 'texas comptroller', 'comptroller of public accounts'],
      canonicalUrlHosts: ['content.govdelivery.com', 'comptroller.texas.gov'],
      verificationStatus: 'verified_official',
      subscriptionUrl: 'https://comptroller.texas.gov/about/media-center/news/',
      verificationNotes:
        'Official Texas Comptroller GovDelivery/List-ID signal; monitored in parallel with the web page.',
    },
  },
  {
    id: 'ut.temporary_announcements',
    jurisdiction: 'UT',
    title: 'Utah State Tax Commission News Releases',
    url: 'https://tax.utah.gov/commission-office/news',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
    sourceNotes:
      'Official Utah State Tax Commission dated news releases. Replaces the public-info landing page, which is a static hub with no dated announcement list.',
  },
  {
    id: 'va.temporary_announcements',
    jurisdiction: 'VA',
    title: 'Virginia Tax News',
    url: 'https://www.tax.virginia.gov/news',
    // Index-level relief signal: VA posts disaster relief as /news items and
    // Tax Bulletins; the prior dedicated page was a frozen one-off (retired
    // 2026-06-10).
    alertCoverageRoles: ['relief_or_disaster_signal'],
  },
  {
    id: 'vt.temporary_announcements',
    jurisdiction: 'VT',
    title: 'Vermont Department of Taxes News',
    url: 'https://tax.vermont.gov/news',
  },
  {
    id: 'wa.temporary_announcements',
    jurisdiction: 'WA',
    title: 'Washington DOR News Releases',
    url: 'https://dor.wa.gov/about/news-releases',
  },
  {
    id: 'wi.temporary_announcements',
    jurisdiction: 'WI',
    title: 'Wisconsin DOR News',
    url: 'https://www.revenue.wi.gov/Pages/News/home.aspx',
  },
  {
    id: 'wv.temporary_announcements',
    jurisdiction: 'WV',
    title: 'West Virginia Tax Division Administrative Notices',
    // The WV notices index is paginated by year (…AdministrativeNotices2026.aspx,
    // …2025.aspx, …); there is no non-year index page. The `{year}` token is
    // resolved to the current calendar year at fetch time (see
    // resolveAnnouncementYearUrl in this file) so the watcher follows the
    // live year instead of silently stalling on a past year.
    url: 'https://tax.wv.gov/TaxProfessionals/AdministrativeNotices/Pages/AdministrativeNotices{year}.aspx',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
    // Index-level relief signal: new WV relief flows through these year-indexed
    // administrative notices; the prior dedicated page was a frozen
    // TaxYear2024 one-off (retired 2026-06-10).
    alertCoverageRoles: ['relief_or_disaster_signal'],
    sourceNotes:
      'Year-paginated administrative notices index; URL year is resolved dynamically to the current year at fetch time.',
  },
  {
    id: 'wy.temporary_announcements',
    jurisdiction: 'WY',
    title: 'Wyoming Excise Tax Division Taxing Issues',
    url: 'https://excise-tax-div.wyo.gov/newsletter-taxing-issues',
    acquisitionMethod: 'html_watch',
    adapterKind: 'html_announcement_list',
    sourceNotes:
      'Sales, use, lodging, and excise tax update newsletter; not a disaster relief signal.',
  },
] as const

const GOVDELIVERY_SENDER_DOMAINS = [
  'content.govdelivery.com',
  'public.govdelivery.com',
  'service.govdelivery.com',
] as const

function uniqueEmailConfigValues(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.toLowerCase()).filter(Boolean)))
}

function sourceEmailSlug(sourceId: string): string {
  return sourceId
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function hostCandidatesForSourceUrl(url: string): string[] {
  try {
    const host = new URL(url).host.toLowerCase()
    const bareHost = host.startsWith('www.') ? host.slice(4) : host
    return host === bareHost ? [host] : [host, bareHost]
  } catch {
    return []
  }
}

function defaultInboundEmailForTemporarySource(
  source: (typeof STATE_TEMPORARY_ANNOUNCEMENT_SOURCES)[number],
): InboundEmailRuleSourceConfig {
  const hosts = hostCandidatesForSourceUrl(source.url)
  const stateCode = source.jurisdiction.toLowerCase()
  const normalizedTitle = source.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return {
    localParts: [`pulse-ingest+${sourceEmailSlug(source.id)}`],
    senderDomains: uniqueEmailConfigValues([...GOVDELIVERY_SENDER_DOMAINS, ...hosts]),
    listIdPatterns: uniqueEmailConfigValues([source.id, stateCode, normalizedTitle]),
    canonicalUrlHosts: uniqueEmailConfigValues(['content.govdelivery.com', ...hosts]),
    verificationStatus: 'routing_only',
    verificationNotes:
      'Automatically generated routing metadata; not a verified official email subscription source.',
  }
}

const TEMPORARY_ANNOUNCEMENT_RULE_SOURCES = STATE_TEMPORARY_ANNOUNCEMENT_SOURCES.map(
  (source): RuleSourceSeedRecord => {
    const inboundEmail = source.inboundEmail ?? defaultInboundEmailForTemporarySource(source)
    const record: RuleSourceSeedRecord = {
      id: source.id,
      jurisdiction: source.jurisdiction,
      title: source.title,
      url: source.url,
      sourceType: source.sourceType ?? 'news',
      acquisitionMethod: source.acquisitionMethod ?? 'html_watch',
      cadence: 'daily',
      priority: source.priority ?? 'high',
      healthStatus: 'healthy',
      isEarlyWarning: false,
      domains: RULE_SOURCE_DOMAINS,
      entityApplicability: ['any_business'],
      authorityRole: 'watch',
      alertPurpose:
        source.acquisitionMethod === 'email_subscription'
          ? 'email_signal'
          : 'temporary_announcements_or_news',
      notificationChannels: ['source_change', 'practice_rule_review'],
      lastReviewedOn: VERIFIED_AT,
    }
    if (source.adapterKind) record.adapterKind = source.adapterKind
    if (source.feedUrl) record.feedUrl = source.feedUrl
    if (source.alertCoverageRoles) record.alertCoverageRoles = source.alertCoverageRoles
    if (source.sourceAgency) record.sourceAgency = source.sourceAgency
    if (source.sourceNotes) record.sourceNotes = source.sourceNotes
    record.inboundEmail = inboundEmail
    return record
  },
)

const SOURCE_DOMAIN_OVERRIDES: Record<string, readonly RuleSourceDomain[]> = {
  'ca.ftb_business_due_dates': [
    'business_income_return',
    'business_estimated_tax',
    'pass_through_entity_return',
    'franchise_or_entity_tax',
  ],
  'ny.tax_calendar.2026': [
    'business_income_return',
    'business_estimated_tax',
    'pass_through_entity_return',
    'franchise_or_entity_tax',
  ],
  'ny.ptet': ['business_estimated_tax'],
  'ny.it204ll': ['franchise_or_entity_tax'],
  'ny.article_9a': ['business_income_return', 'business_estimated_tax', 'franchise_or_entity_tax'],
  'tx.franchise_home': ['franchise_or_entity_tax'],
  'tx.franchise_overview': ['franchise_or_entity_tax'],
  'tx.franchise_annual_report': ['franchise_or_entity_tax'],
  'tx.franchise_extensions': ['franchise_or_entity_tax'],
  'tx.franchise_forms_2026': ['franchise_or_entity_tax'],
  'tx.pir_oir': ['franchise_or_entity_tax'],
  'fl.cit': ['business_income_return', 'business_estimated_tax'],
  'fl.cit_due_dates_2026': ['business_income_return', 'business_estimated_tax'],
  'wa.excise_due_dates_2026': ['franchise_or_entity_tax', 'sales_use_tax'],
  'wa.bo': ['franchise_or_entity_tax'],
  'fed.irs_i940_2026': ['withholding'],
  'fed.irs_iw2w3_2026': ['withholding'],
  'fed.irs_i709_2025': ['individual_income_return'],
}

const SOURCE_ENTITY_OVERRIDES: Record<string, readonly EntityApplicability[]> = {
  'ca.ftb_business_due_dates': ['llc', 'partnership', 's_corp', 'c_corp'],
  'ca.ftb_llc': ['llc'],
  'ca.ftb_568_booklet_2025': ['llc'],
  'ny.tax_calendar.2026': ['llc', 'partnership', 's_corp', 'c_corp'],
  'ny.ptet': ['partnership', 's_corp'],
  'ny.it204ll': ['llc', 'partnership'],
  'ny.partnerships': ['partnership', 'llc'],
  'ny.article_9a': ['c_corp'],
  'tx.franchise_home': ['llc', 'partnership', 's_corp', 'c_corp'],
  'tx.franchise_overview': ['llc', 'partnership', 's_corp', 'c_corp'],
  'tx.franchise_annual_report': ['llc', 'partnership', 's_corp', 'c_corp'],
  'tx.franchise_extensions': ['llc', 'partnership', 's_corp', 'c_corp'],
  'tx.franchise_forms_2026': ['llc', 'partnership', 's_corp', 'c_corp'],
  'tx.pir_oir': ['llc', 'partnership', 's_corp', 'c_corp'],
  'fl.cit': ['c_corp'],
  'fl.cit_due_dates_2026': ['c_corp'],
  'wa.excise_due_dates_2026': ['any_business'],
  'wa.bo': ['any_business'],
  'fed.irs_i709_2025': ['individual'],
}

function defaultSourceDomains(source: RuleSourceSeedRecord): readonly RuleSourceDomain[] {
  return SOURCE_DOMAIN_OVERRIDES[source.id] ?? ['business_income_return']
}

function defaultSourceEntityApplicability(
  source: RuleSourceSeedRecord,
): readonly EntityApplicability[] {
  return SOURCE_ENTITY_OVERRIDES[source.id] ?? ['any_business']
}

function defaultSourceAuthorityRole(source: RuleSourceSeedRecord): RuleEvidenceAuthorityRole {
  if (source.isEarlyWarning) return 'early_warning'
  if (source.sourceType === 'news' || source.sourceType === 'emergency_relief') return 'watch'
  return 'basis'
}

function defaultSourceAlertPurpose(source: RuleSourceSeedRecord): AlertSourcePurpose {
  if (source.alertPurpose) return source.alertPurpose
  if (source.acquisitionMethod === 'email_subscription' || source.adapterKind === 'email_inbound') {
    return 'email_signal'
  }
  const authorityRole = source.authorityRole ?? defaultSourceAuthorityRole(source)
  if (authorityRole === 'watch') return 'temporary_announcements_or_news'
  if (authorityRole === 'early_warning') return 'explicit_live_adapter'
  return 'rule_source_watch'
}

// State source publication / last-updated dates, web-verified from each source
// page (an Updated/Revised/Posted footer, a form "Rev. MM/YY" stamp, or a
// statute effective date). Backfilled 2026-06-16; only sources whose page
// explicitly showed a genuine date are listed (63 of 258 state basis sources);
// the rest fall back to the rule verifiedAt. Keyed by RuleSource.id and applied
// in hydrateRuleSources (inline federal publishedOn still take precedence).
const SOURCE_PUBLISHED_ON: Readonly<Record<string, string>> = {
  'ak.ui_wage_report': '2026-02-01', // TQ01B (Rev. 2/26)
  'ar.fiduciary_income_tax': '2025-06-19', // Fiduciary Inst. (R 6/19/2025)
  'ar.income_tax_deadlines': '2024-07-05', // AR1000ES Instr. (R 7/5/2024)
  'ar.withholding_tax': '2025-12-05', // Revised: 12/05/2025
  'az.pass_through_entities': '2025-11-01', // Pub 713 Revised: Nov 2025
  'ca.ftb_568_booklet_2025': '2026-03-01', // 2025 Instructions for Form 568 LLC Tax Booklet
  'ca.ftb_business_due_dates': '2026-03-18', // Last updated: 03/18/2026
  'ca.income_tax': '2026-02-25', // Last updated: 02/25/2026
  'ct.tax_filing_due_dates_2026': '2025-12-01', // DRS-166 (New 12/25)
  'ct.ui_wage_report': '2024-09-04', // Date: September 04, 2024 (article metadata)
  'fl.cit_due_dates_2026': '2026-01-01', // R. 01/26
  'hi.general_excise_use_tax': '2026-01-14', // Page Last Updated: January 14, 2026
  'hi.income_tax': '2026-01-22', // Page Last Updated: January 22, 2026
  'hi.individual_estimated_tax': '2026-02-01', // Dept. of Taxation Revised February 2026
  'hi.tax_forms': '2026-01-20', // Page Last Updated: January 20, 2026
  'id.business_income_tax': '2025-08-21', // last updated: August 21, 2025 (page footer)
  'id.income_tax': '2025-08-21', // last updated: August 21, 2025 (page footer)
  'id.sales_withholding_due_dates': '2025-12-17', // last updated: December 17, 2025 (page footer)
  'il.business_income_tax_forms': '2025-05-01', // PIO-21 (updated May 2025)
  'il.sales_use_tax_due_dates': '2024-11-01', // ST-1 Instructions (R-11/24)
  'il.withholding_tax_due_dates': '2025-12-01', // IL-941 Instructions (R-12/25)
  'mi.income_tax': '2026-01-26', // "January 26, 2026" (news article date)
  'mn.income_tax': '2025-07-14', // Last Updated: July 14, 2025 (footer)
  'mn.tax_due_dates': '2026-06-01', // Last Updated: June 01, 2026 (footer)
  'ms.fiduciary_income_tax': '2025-06-01', // Form 81-100-25-1-1-000 (Rev. 06/25)
  'nj.income_tax': '2025-12-03', // Last Updated: Wednesday, 12/03/25
  'ny.income_tax': '2025-10-30', // Updated: October 30, 2025
  'ny.nyc_yonkers_income_tax': '2025-12-15', // Updated: December 15, 2025
  'ny.personal_fiduciary_filing_due_dates': '2025-10-23', // Updated: October 23, 2025
  'ny.ptet': '2026-04-03', // Updated: April 3, 2026
  'ny.sales_tax_vendor_due_dates': '2026-04-17', // Updated: April 17, 2026
  'ny.tax_calendar.2026': '2025-10-30', // Updated: October 30, 2025
  'ny.withholding_tax_due_dates': '2025-03-23', // Updated: March 23, 2025
  'oh.commercial_activity_tax': '2023-08-21', // 08/21/2023 (page header/footer)
  'oh.employer_withholding': '2025-11-01', // Rev. 11/25 (instructions cover)
  'oh.fiduciary_income_tax': '2025-12-01', // Rev. 12/25 (IT 1041 instructions)
  'oh.municipal_income_tax_annual_return': '2025-07-16', // Last updated July 16, 2025 (footer)
  'oh.municipal_net_profit_filing': '2025-02-13', // Last updated February 13, 2025 (footer)
  'oh.pass_through_entities': '2025-12-01', // Rev. 12/25 (IT 4738 instructions)
  'oh.sales_use_tax': '2022-07-01', // Rev. 7/22 (UST instructions)
  'oh.ui_wage_report': '2025-02-10', // Last updated February 10, 2025 (footer)
  'ok.ui_wage_report': '2025-12-16', // Last Modified on Dec 16, 2025 (footer)
  'or.fiduciary_income_tax': '2025-10-15', // 150-101-041-1 (Rev. 10-15-25)
  'ri.corporate_tax_forms': '2026-01-12', // This page last updated on January 12th, 2026
  'ri.fiduciary_income_tax': '2021-11-04', // This page last updated on November 4th, 2021
  'ri.income_tax': '2021-11-05', // This page last updated on November 5th, 2021
  'ri.sales_tax': '2025-12-08', // This page last updated on December 8th, 2025
  'ri.ui_wage_report': '2026-06-15', // This page last updated on June 15th, 2026
  'ri.withholding_tax': '2026-04-15', // This page last updated on April 15th, 2026
  'sc.income_tax': '2026-03-26', // Thursday, Mar 26, 2026
  'tx.franchise_overview': '2023-12-01', // (12/2023)
  'va.fiduciary_income_tax': '2026-05-01', // Va. Dept. of Taxation Rev. 05/26 Form 770
  'va.sales_use_tax_return': '2024-10-01', // Va. Dept. of Taxation ST-1 Rev. 10/24
  'vt.fiduciary_income_tax': '2025-01-01', // 2025, No. 27, eff. January 1, 2025 (statute)
  'vt.income_tax': '2025-01-01', // 2025, No. 27, eff. January 1, 2025 (statute)
  'wi.corporation_franchise_income_tax': '2026-01-05', // enacted as of January 5, 2026
  'wi.fiduciary_estates_trusts': '2025-12-11', // enacted as of December 11, 2025
  'wi.income_tax': '2026-01-14', // enacted as of January 14, 2026
  'wi.individual_estimated_tax': '2026-01-29', // enacted as of January 29, 2026
  'wi.pass_through_entity_withholding': '2025-10-10', // enacted as of October 10, 2025
  'wi.sales_use_tax': '2026-03-11', // enacted as of March 11, 2026
  'wi.ui_wage_report': '2018-05-18', // Updated: May 18, 2018 (footer)
  'wi.withholding_tax': '2026-04-20', // enacted as of April 20, 2026
}

function hydrateRuleSources(sources: readonly RuleSourceSeedRecord[]): readonly RuleSource[] {
  return sources.map((source) => {
    const authorityRole = source.authorityRole ?? defaultSourceAuthorityRole(source)
    const alertPurpose = defaultSourceAlertPurpose({ ...source, authorityRole })
    // Inline-authored federal publishedOn wins; otherwise apply the
    // web-verified state backfill. Omitted entirely for sources with neither.
    const publishedOn = source.publishedOn ?? SOURCE_PUBLISHED_ON[source.id]
    const notificationChannels: readonly RuleNotificationChannel[] =
      alertPurpose === 'rule_source_watch' &&
      source.notificationChannels.includes('source_change') &&
      !source.notificationChannels.includes('practice_rule_review')
        ? [...source.notificationChannels, 'practice_rule_review']
        : source.notificationChannels
    return {
      ...source,
      domains: source.domains ?? defaultSourceDomains(source),
      entityApplicability: source.entityApplicability ?? defaultSourceEntityApplicability(source),
      authorityRole,
      alertPurpose,
      notificationChannels,
      ...(publishedOn ? { publishedOn } : {}),
    }
  })
}

export const RULE_SOURCES = hydrateRuleSources([
  ...STATE_OFFICIAL_SOURCES,
  ...TEMPORARY_ANNOUNCEMENT_RULE_SOURCES,
  {
    id: 'fed.irs_pub_509_2026',
    jurisdiction: 'FED',
    publishedOn: '2026-03-30', // irs.gov about-publication-509 page last updated
    title: 'IRS Publication 509 (2026), Tax Calendars',
    url: 'https://www.irs.gov/publications/p509',
    sourceType: 'publication',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_pub_15_2026',
    jurisdiction: 'FED',
    publishedOn: '2026-03-30', // irs.gov about-publication-15 page last updated
    title: "IRS Publication 15 (2026), Employer's Tax Guide",
    url: 'https://www.irs.gov/publications/p15',
    sourceType: 'publication',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    // Annual IRS inflation-adjustment Revenue Procedure, watched as a
    // deterministic "pointer" advisory. When a new tax year's Rev. Proc.
    // publishes (this page changes), the pulse extract job short-circuits
    // BEFORE the AI step and emits a review_only `threshold_advisory` Alert
    // that asserts NO dollar figures — it points the CPA at the official
    // source to read the adjusted thresholds (gift/estate exclusions,
    // estimated-tax safe harbor, ...) themselves. The product never lets AI
    // invent dollar amounts (cf. client.estimatedTaxLiabilityCents). See
    // isThresholdAdvisorySource() and the branch in jobs/pulse/extract.ts.
    // Year-stamped like the other fed.irs_* sources; add next season's entry
    // and the prefix gate covers it automatically.
    id: 'fed.irs_inflation_adjustments_2026',
    jurisdiction: 'FED',
    title: 'IRS Annual Inflation Adjustments — Tax Year 2026 (Rev. Proc. 2025-32)',
    // 2026-06-10: the short URL 404s — the IRS published the TY2026 adjustments
    // under an OBBB-amended slug. This page being dead since launch is why the
    // threshold_advisory branch has NEVER fired. backfill baseline so the
    // already-published page emits its advisory on first successful fetch.
    url: 'https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill',
    sourceType: 'publication',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    initialBaselineMode: 'backfill',
    notificationChannels: ['source_change'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_i7004_2025',
    jurisdiction: 'FED',
    publishedOn: '2025-12-01', // IRS instructions Rev. 12/2025
    title: 'IRS Instructions for Form 7004 (12/2025)',
    url: 'https://www.irs.gov/instructions/i7004',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_i1065_2025',
    jurisdiction: 'FED',
    publishedOn: '2026-03-30', // irs.gov about-form-1065 page last updated
    title: 'IRS Instructions for Form 1065 (2025)',
    url: 'https://www.irs.gov/instructions/i1065',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_i1120s_2025',
    jurisdiction: 'FED',
    publishedOn: '2026-06-05', // irs.gov about-form-1120-s page last updated
    title: 'IRS Instructions for Form 1120-S (2025)',
    url: 'https://www.irs.gov/instructions/i1120s',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_i1120_2025',
    jurisdiction: 'FED',
    publishedOn: '2026-03-30', // irs.gov about-form-1120 page last updated
    title: 'IRS Instructions for Form 1120 (2025)',
    url: 'https://www.irs.gov/instructions/i1120',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_when_to_file_individuals_2026',
    jurisdiction: 'FED',
    publishedOn: '2026-05-22', // irs.gov when-to-file page last updated
    title: 'IRS When to file for individuals (2026 filing season)',
    url: 'https://www.irs.gov/filing/individuals/when-to-file',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_i1041_2025',
    jurisdiction: 'FED',
    publishedOn: '2026-03-30', // irs.gov about-form-1041 page last updated
    title: 'IRS Instructions for Form 1041 (2025)',
    url: 'https://www.irs.gov/instructions/i1041',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_i941_2026',
    jurisdiction: 'FED',
    publishedOn: '2026-03-01', // IRS instructions Rev. 03/2026
    title: 'IRS Instructions for Form 941 (03/2026)',
    url: 'https://www.irs.gov/instructions/i941',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'quarterly',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_information_return_reporting',
    jurisdiction: 'FED',
    publishedOn: '2025-09-08', // irs.gov information-return-reporting page last updated
    title: 'IRS Information return reporting',
    url: 'https://www.irs.gov/businesses/small-businesses-self-employed/information-return-reporting',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_p1099_2026',
    jurisdiction: 'FED',
    publishedOn: '2026-03-30', // irs.gov about-form-1099 page last updated
    title: 'IRS Publication 1099 (2026), General Instructions for Certain Information Returns',
    url: 'https://www.irs.gov/publications/p1099',
    sourceType: 'publication',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.fincen_fbar_due_date',
    jurisdiction: 'FED',
    publishedOn: '2020-03-01', // FinCEN "Due Date for FBARs" guidance (03/2020)
    title: 'FinCEN Due Date for FBARs',
    url: 'https://www.fincen.gov/sites/default/files/2020-03/Due_Date_for_FBARs.pdf',
    sourceType: 'instructions',
    acquisitionMethod: 'pdf_watch',
    cadence: 'pre_season',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_990_due_date',
    jurisdiction: 'FED',
    publishedOn: '2026-05-31', // irs.gov annual-exempt-organization-return-due-date page last updated
    title: 'IRS Annual exempt organization return due date',
    url: 'https://www.irs.gov/charities-non-profits/annual-exempt-organization-return-due-date',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_i8868_2026',
    jurisdiction: 'FED',
    publishedOn: '2026-01-01', // IRS instructions Rev. 01/2026
    title: 'IRS Instructions for Form 8868 (01/2026)',
    url: 'https://www.irs.gov/instructions/i8868',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_i940_2026',
    jurisdiction: 'FED',
    publishedOn: '2026-03-30', // irs.gov about-form-940 page last updated
    title: 'IRS Instructions for Form 940 (2025)',
    url: 'https://www.irs.gov/instructions/i940',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_iw2w3_2026',
    jurisdiction: 'FED',
    publishedOn: '2026-03-30', // irs.gov about-form-w-2 page last updated
    title: 'IRS General Instructions for Forms W-2 and W-3 (2026)',
    url: 'https://www.irs.gov/instructions/iw2w3',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_i709_2025',
    jurisdiction: 'FED',
    publishedOn: '2026-03-31', // irs.gov about-form-709 page last updated
    title: 'IRS Instructions for Form 709 (2025)',
    url: 'https://www.irs.gov/instructions/i709',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_5500_corner',
    jurisdiction: 'FED',
    publishedOn: '2026-04-24', // irs.gov form-5500-corner page last updated
    title: 'IRS Form 5500 Corner',
    url: 'https://www.irs.gov/retirement-plans/form-5500-corner',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_disaster_relief',
    jurisdiction: 'FED',
    title: 'IRS Tax Relief in Disaster Situations',
    url: 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'daily',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_newswire',
    jurisdiction: 'FED',
    title: 'IRS Newswire',
    url: 'https://www.irs.gov/newsroom/e-news-subscriptions',
    sourceType: 'subscription',
    acquisitionMethod: 'email_subscription',
    adapterKind: 'email_inbound',
    cadence: 'daily',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review'],
    lastReviewedOn: VERIFIED_AT,
    inboundEmail: {
      localParts: ['pulse-ingest+fed-irs-newswire'],
      senderDomains: ['service.govdelivery.com', 'public.govdelivery.com'],
      listIdPatterns: ['usirs', 'irs newswire', 'internal revenue service'],
      canonicalUrlHosts: [
        'irs.gov',
        'www.irs.gov',
        'federalregister.gov',
        'www.federalregister.gov',
      ],
      accountCodes: ['USIRS'],
      verificationStatus: 'verified_official',
      subscriptionUrl: 'https://www.irs.gov/newsroom/e-news-subscriptions',
      verificationNotes: 'Official IRS Newswire e-News subscription / USIRS GovDelivery channel.',
    },
  },
  {
    id: 'fed.taxpayer_advocate_blog',
    jurisdiction: 'FED',
    title: 'Taxpayer Advocate Service Blog',
    url: 'https://www.taxpayeradvocate.irs.gov/taxnews-information/blogs-nta/',
    sourceType: 'news',
    acquisitionMethod: 'html_watch',
    cadence: 'daily',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review'],
    lastReviewedOn: VERIFIED_AT,
    alertCoverageRoles: ['rights_window_signal'],
    // Backfill on first scan so an already-published, still-open window (e.g. the
    // COVID disaster-period refund window) enters ingest instead of being
    // baselined out. Snapshot dedup keeps later scans to genuinely new items.
    initialBaselineMode: 'backfill',
  },
  {
    id: 'fed.irs_actions_on_decisions',
    jurisdiction: 'FED',
    title: 'IRS Actions on Decisions',
    url: 'https://www.irs.gov/actions-on-decisions',
    sourceType: 'publication',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review'],
    lastReviewedOn: VERIFIED_AT,
    alertCoverageRoles: ['rights_window_signal'],
    // Backfill on first scan so an already-published, still-open window (e.g. the
    // COVID disaster-period refund window) enters ingest instead of being
    // baselined out. Snapshot dedup keeps later scans to genuinely new items.
    initialBaselineMode: 'backfill',
  },
  {
    id: 'fed.irs_irb',
    jurisdiction: 'FED',
    title: 'IRS Internal Revenue Bulletins',
    url: 'https://www.irs.gov/irb',
    sourceType: 'publication',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review'],
    lastReviewedOn: VERIFIED_AT,
    alertCoverageRoles: ['rights_window_signal'],
    // Backfill on first scan so an already-published, still-open window (e.g. the
    // COVID disaster-period refund window) enters ingest instead of being
    // baselined out. Snapshot dedup keeps later scans to genuinely new items.
    initialBaselineMode: 'backfill',
  },
  {
    id: 'fed.fema_disaster_declarations',
    jurisdiction: 'FED',
    title: 'FEMA Disaster Declarations Summaries',
    url: 'https://www.fema.gov/openfema-data-page/disaster-declarations-summaries-v2',
    sourceType: 'early_warning',
    acquisitionMethod: 'api_watch',
    cadence: 'daily',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: true,
    notificationChannels: ['source_change', 'practice_rule_review'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'ca.ftb_business_due_dates',
    jurisdiction: 'CA',
    title: 'California FTB Business Due Dates',
    url: 'https://www.ftb.ca.gov/file/when-to-file/due-dates-business.html',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'ca.ftb_llc',
    jurisdiction: 'CA',
    title: 'California FTB Limited Liability Company',
    url: 'https://www.ftb.ca.gov/file/business/types/limited-liability-company/index.html',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'monthly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'ca.ftb_568_booklet_2025',
    jurisdiction: 'CA',
    title: 'California FTB 2025 Limited Liability Company Tax Booklet',
    url: 'https://www.ftb.ca.gov/forms/2025/2025-568-booklet.html',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'ca.ftb_emergency_tax_relief',
    jurisdiction: 'CA',
    title: 'California FTB Emergency Tax Relief',
    url: 'https://www.ftb.ca.gov/file/when-to-file/emergency-tax-relief.html',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'daily',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'ca.ftb_tax_news',
    jurisdiction: 'CA',
    title: 'California FTB Tax News',
    url: 'https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/index.html',
    sourceType: 'news',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review'],
    lastReviewedOn: VERIFIED_AT,
    inboundEmail: {
      localParts: ['pulse-ingest+ca-ftb-tax-news'],
      senderDomains: [
        'service.govdelivery.com',
        'public.govdelivery.com',
        'content.govdelivery.com',
        'ftb.ca.gov',
      ],
      listIdPatterns: ['california franchise tax board', 'ftb tax news', 'ca ftb tax news'],
      canonicalUrlHosts: ['content.govdelivery.com', 'ftb.ca.gov', 'www.ftb.ca.gov'],
      verificationStatus: 'verified_official',
      subscriptionUrl: 'https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/index.html',
      verificationNotes:
        'Official FTB Tax News channel; inbound messages must link back to FTB or GovDelivery content.',
    },
  },
  {
    id: 'ny.tax_calendar.2026',
    jurisdiction: 'NY',
    title: 'New York 2026 Tax Filing Dates',
    // Year-paginated; feedUrl MUST stay identical to the ny.income_tax seed's
    // so uniqueByFetchUrl keeps deduping the two watchers to one fetch.
    url: 'https://www.tax.ny.gov/help/calendar/2026.htm',
    feedUrl: 'https://www.tax.ny.gov/help/calendar/{year}.htm',
    sourceType: 'calendar',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'ny.ptet',
    jurisdiction: 'NY',
    title: 'New York Pass-Through Entity Tax',
    url: 'https://www.tax.ny.gov/bus/ptet/',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'monthly',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'ny.it204ll',
    jurisdiction: 'NY',
    title: 'New York Partnership, LLC, and LLP Annual Filing Fee',
    url: 'https://www.tax.ny.gov/pit/efile/annual_filing_fee.htm',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'quarterly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'ny.partnerships',
    jurisdiction: 'NY',
    title: 'New York Partnerships',
    url: 'https://www.tax.ny.gov/pit/efile/partneridx.htm',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'quarterly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'ny.email_services',
    jurisdiction: 'NY',
    title: 'New York Tax Department Email Services',
    url: 'https://www.tax.ny.gov/help/subscribe.htm',
    sourceType: 'subscription',
    acquisitionMethod: 'email_subscription',
    cadence: 'weekly',
    priority: 'medium',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review'],
    lastReviewedOn: VERIFIED_AT,
    inboundEmail: {
      localParts: ['pulse-ingest+ny-email-services'],
      senderDomains: ['public.govdelivery.com', 'service.govdelivery.com', 'tax.ny.gov'],
      listIdPatterns: ['tax.ny.gov', 'new-york-tax-department', 'new york tax department'],
      canonicalUrlHosts: ['tax.ny.gov', 'www.tax.ny.gov'],
      verificationStatus: 'verified_official',
      subscriptionUrl: 'https://www.tax.ny.gov/help/subscribe.htm',
      verificationNotes: 'Official New York Tax Department Email Services subscription page.',
    },
  },
  {
    id: 'ny.article_9a',
    jurisdiction: 'NY',
    title: 'New York Article 9-A Franchise Tax on General Business Corporations',
    url: 'https://www.tax.ny.gov/bus/ct/article9a.htm',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'pre_season',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'tx.franchise_overview',
    jurisdiction: 'TX',
    title: 'Texas Comptroller Franchise Tax Overview',
    url: 'https://comptroller.texas.gov/taxes/publications/98-806.php',
    sourceType: 'publication',
    acquisitionMethod: 'html_watch',
    cadence: 'quarterly',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'tx.franchise_home',
    jurisdiction: 'TX',
    title: 'Texas Comptroller Franchise Tax',
    url: 'https://comptroller.texas.gov/taxes/franchise/index.php/taxes/franchise/questionnaire.php',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'tx.franchise_annual_report',
    jurisdiction: 'TX',
    title: 'Texas Annual Report Instructions',
    url: 'https://comptroller.texas.gov/help/franchise/information-report.php?category=taxes',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'quarterly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'tx.franchise_extensions',
    jurisdiction: 'TX',
    title: 'Texas Franchise Tax Extensions',
    url: 'https://comptroller.texas.gov/taxes/franchise/filing-extensions.php/1000',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'quarterly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'tx.franchise_forms_2026',
    jurisdiction: 'TX',
    title: 'Texas Franchise Tax Report Forms for 2026',
    // Year-paginated form index; feedUrl {year} resolves at fetch time.
    url: 'https://comptroller.texas.gov/taxes/franchise/forms/2026-franchise.php',
    feedUrl: 'https://comptroller.texas.gov/taxes/franchise/forms/{year}-franchise.php',
    sourceType: 'form',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'tx.pir_oir',
    jurisdiction: 'TX',
    title: 'Texas Franchise Tax PIR and OIR Filing Requirements',
    url: 'https://comptroller.texas.gov/taxes/franchise/pir-oir-filing-req.php',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'quarterly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fl.cit',
    jurisdiction: 'FL',
    title: 'Florida DOR Corporate Income Tax',
    url: 'https://floridarevenue.com/taxes/taxesfees/Pages/corporate.aspx',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
    cadence: 'monthly',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fl.cit_due_dates_2026',
    jurisdiction: 'FL',
    title: 'Florida Corporate Income Tax Due Dates',
    url: 'https://floridarevenue.com/taxes/Documents/flCitDueDates.pdf',
    sourceType: 'due_dates',
    acquisitionMethod: 'pdf_watch',
    cadence: 'pre_season',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fl.tips',
    jurisdiction: 'FL',
    title: 'Florida DOR Tax Information Publications',
    url: 'https://floridarevenue.com/taxes/tips/Pages/default.aspx',
    sourceType: 'news',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review'],
    lastReviewedOn: VERIFIED_AT,
    inboundEmail: {
      localParts: ['pulse-ingest+fl-tax-publications'],
      senderDomains: ['floridarevenue.com', 'www.floridarevenue.com'],
      listIdPatterns: ['florida department of revenue', 'tax information publications'],
      canonicalUrlHosts: ['floridarevenue.com', 'www.floridarevenue.com'],
      verificationStatus: 'verified_official',
      subscriptionUrl: 'https://floridarevenue.com/taxes/tips/Pages/default.aspx',
      verificationNotes:
        'Official Florida DOR Tax Information Publications channel; inbound messages must link back to Florida DOR.',
    },
  },
  {
    id: 'wa.excise_due_dates_2026',
    jurisdiction: 'WA',
    title: 'Washington DOR 2026 Excise Tax Return Due Dates',
    // Year-paginated calendar; feedUrl {year} resolves at fetch time.
    url: 'https://dor.wa.gov/file-pay-taxes/filing-frequencies-due-dates/2026-excise-tax-return-due-dates',
    feedUrl:
      'https://dor.wa.gov/file-pay-taxes/filing-frequencies-due-dates/{year}-excise-tax-return-due-dates',
    sourceType: 'calendar',
    acquisitionMethod: 'manual_review',
    cadence: 'weekly',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'wa.bo',
    jurisdiction: 'WA',
    title: 'Washington DOR Business and Occupation Tax',
    url: 'https://dor.wa.gov/taxes-rates/business-occupation-tax',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    cadence: 'quarterly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'wa.news',
    jurisdiction: 'WA',
    title: 'Washington DOR News Releases',
    url: 'https://dor.wa.gov/about/news-releases',
    sourceType: 'news',
    acquisitionMethod: 'manual_review',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review'],
    lastReviewedOn: VERIFIED_AT,
    inboundEmail: {
      localParts: ['pulse-ingest+wa-dor-news'],
      senderDomains: [
        'content.govdelivery.com',
        'public.govdelivery.com',
        'service.govdelivery.com',
        'dor.wa.gov',
      ],
      listIdPatterns: ['wador', 'washington department of revenue', 'wa department of revenue'],
      canonicalUrlHosts: ['content.govdelivery.com', 'dor.wa.gov', 'www.dor.wa.gov'],
      verificationStatus: 'verified_official',
      subscriptionUrl: 'https://dor.wa.gov/about/news-releases',
      verificationNotes:
        'Official Washington DOR GovDelivery/List-ID signal; monitored in parallel with the web page.',
    },
  },
  {
    id: 'wa.capital_gains_exception_2026',
    jurisdiction: 'WA',
    title: 'Washington Capital Gains Excise Tax Due Date Moved to May 1, 2026',
    url: 'https://dor.wa.gov/about/news-releases/2026/capital-gains-excise-tax-returns-due-date-moved-may-1-2026',
    sourceType: 'news',
    acquisitionMethod: 'manual_review',
    cadence: 'weekly',
    priority: 'medium',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  // --- State disaster / emergency tax-relief sources (relief_or_disaster_signal) ---
  // Researched and URL-verified on DISASTER_RELIEF_VERIFIED_AT. Each entry is the
  // official state tax authority's disaster/emergency relief page; coverage
  // detection keys on sourceType: 'emergency_relief' (idsForReliefOrDisasterSources).
  //
  // Tier A — official relief pages, verified live unless noted:
  //  - MI, ND return 403 / block the automated probe (host WAF / TLS) but are
  //    confirmed-real official pages — a known tolerated condition.
  //  - RI has no standing dedicated page; it is registered below at the official
  //    Advisories index (ri.tax_disaster_advisories), where RI publishes its
  //    disaster advisories. Index-level signal, not a dedicated page.
  // (MD likewise has no dedicated page — its prior URL went dead; MD is now
  //  covered via the Comptroller Newsroom index on md.temporary_announcements.)
  {
    id: 'co.dor_disaster_relief',
    jurisdiction: 'CO',
    title: 'Colorado DOR Filing and Payment Extensions for Natural Disasters',
    url: 'https://tax.colorado.gov/extensions-for-natural-disasters',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'il.idor_disaster_relief',
    jurisdiction: 'IL',
    title: 'Illinois DOR Disaster Relief',
    url: 'https://tax.illinois.gov/programs/disasterrelief.html',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'in.dor_disaster_relief',
    jurisdiction: 'IN',
    title: 'Indiana DOR Disaster Relief',
    url: 'https://www.in.gov/dor/about/news-publications/notices/disaster-relief/',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'ia.idr_disaster_relief',
    jurisdiction: 'IA',
    title: 'Iowa DOR Disaster Emergency Tax Penalty Relief',
    url: 'https://revenue.iowa.gov/taxes/tax-guidance/general/disaster-emergency-tax-penalty-relief',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'la.ldr_disaster_relief',
    jurisdiction: 'LA',
    title: 'Louisiana DOR Hurricane Recovery and Disaster Relief',
    url: 'https://revenue.louisiana.gov/general/hurricane-recovery-information/',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'ma.dor_disaster_relief',
    jurisdiction: 'MA',
    title: 'Massachusetts DOR Disaster Tax Relief (TIR 24-8)',
    url: 'https://www.mass.gov/technical-information-release/tir-24-8-tax-relief-for-taxpayers-affected-by-a-presidentially-declared-disaster',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'me.mrs_disaster_relief',
    jurisdiction: 'ME',
    title: 'Maine Revenue Services Tax Relief in Disaster Areas',
    url: 'https://www.maine.gov/revenue/Disaster',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'mi.treasury_disaster_relief',
    jurisdiction: 'MI',
    title: 'Michigan Treasury State Tax Relief (Emergency Areas)',
    url: 'https://www.michigan.gov/taxes/state-tax-relief',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'mn.dor_disaster_relief',
    jurisdiction: 'MN',
    title: 'Minnesota DOR Disaster Relief',
    url: 'https://www.revenue.state.mn.us/disaster-relief',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  // ms.dor_disaster_relief was retired 2026-06-10: despite sitting in the
  // standing-pages tier it watched a single storm's news item — MS posted its
  // Winter Storm Fern relief (Jan 2026) as a NEW news item the tombstone could
  // never surface. MS relief is covered at the index level via
  // ms.temporary_announcements (relief_or_disaster_signal role).
  {
    id: 'mt.dor_disaster_relief',
    jurisdiction: 'MT',
    title: 'Montana DOR Natural Disaster Income Tax Extension',
    url: 'https://revenue.mt.gov/taxes/tax-relief/natural-disaster-income-tax-extension',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'nd.tax_disaster_relief',
    jurisdiction: 'ND',
    title: 'North Dakota Disaster Information and Tax Implications',
    url: 'https://www.tax.nd.gov/news/resources/disaster-information-and-tax-implications',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'ne.dor_disaster_relief',
    jurisdiction: 'NE',
    title: 'Nebraska DOR Tax Information for Victims of Natural Disasters',
    url: 'https://revenue.nebraska.gov/about/tax-information-victims-natural-disasters',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'nj.taxation_disaster_relief',
    jurisdiction: 'NJ',
    title: 'New Jersey Division of Taxation Disaster Relief',
    url: 'https://www.nj.gov/treasury/taxation/disaster.shtml',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'nc.ncdor_disaster_relief',
    jurisdiction: 'NC',
    title: 'North Carolina DOR Disaster Related Tax Relief',
    url: 'https://www.ncdor.gov/taxes-forms/policies/penalties-and-interest/disaster-related-tax-relief',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'ri.tax_disaster_advisories',
    jurisdiction: 'RI',
    title: 'Rhode Island Division of Taxation Advisories (Disaster Relief)',
    url: 'https://tax.ri.gov/guidance/advisories',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'sc.dor_disaster_relief',
    jurisdiction: 'SC',
    title: 'South Carolina DOR Emergencies and Disaster Relief',
    url: 'https://dor.sc.gov/communications/emergencies',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'tn.dor_disaster_relief',
    jurisdiction: 'TN',
    title: 'Tennessee DOR Natural Disaster Sales Tax Relief',
    url: 'https://www.tn.gov/revenue/taxes/sales-and-use-tax/natural-disaster-sales-tax-relief.html',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'tx.comptroller_disaster_relief',
    jurisdiction: 'TX',
    title: 'Texas Comptroller Disaster Relief Information',
    url: 'https://comptroller.texas.gov/disaster-relief/',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'ut.tax_disaster_relief',
    jurisdiction: 'UT',
    title: 'Utah State Tax Commission Disaster Area Tax Relief',
    url: 'https://tax.utah.gov/relief/disasters',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'vt.tax_disaster_relief',
    jurisdiction: 'VT',
    title: 'Vermont Department of Taxes Disaster Assistance',
    url: 'https://tax.vermont.gov/business/disaster-assistance',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'wa.dor_disaster_relief',
    jurisdiction: 'WA',
    title: 'Washington DOR Disaster Relief for Taxpayers',
    url: 'https://dor.wa.gov/forms-publications/publications-subject/tax-topics/disaster-relief-taxpayers',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'wi.dor_disaster_relief',
    jurisdiction: 'WI',
    title: 'Wisconsin DOR Disaster Tax Assistance',
    url: 'https://www.revenue.wi.gov/Pages/Businesses/Disaster-Tax-Assistance.aspx',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  {
    id: 'ny.dtf_disaster_relief',
    jurisdiction: 'NY',
    title: 'New York Tax Department Disaster Relief N-Notices',
    // N-Notices announce a new due date for filing/paying because of a natural
    // disaster (tax.ny.gov). Dedicated relief watch — upgrades NY from the
    // press-release index; ny.temporary_announcements stays as a secondary signal.
    url: 'https://www.tax.ny.gov/pubs_and_bulls/n_notices/notices.htm',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: DISASTER_RELIEF_VERIFIED_AT,
  },
  // The former "Tier B" per-event pages (DC, GA, ID, KY, MO, OK, VA, WV — plus
  // the mislabeled MS entry above) were retired 2026-06-10: a 2024 Helene
  // release or a year-stamped extension page never announces the NEXT event,
  // so each was a frozen tombstone counted as "disaster coverage: watching".
  // Those states post relief as items on their news indexes, which their
  // *.temporary_announcements sources already watch — the
  // relief_or_disaster_signal role on those sources is what keeps the
  // jurisdictions covered (AL/AR/MD/NM precedent). FL and HI keep dedicated
  // watchers because they DO publish living pages:
  {
    id: 'fl.dor_emergency_disaster_info',
    jurisdiction: 'FL',
    title: 'Florida DOR Office Closures and Emergency Information',
    // Standing emergency page whose "News and Messages" / "Office Closures" /
    // "Emergency Orders" panels populate during declared events ("None at this
    // time" otherwise — allowEmptyParse covers the quiet state). Replaces the
    // frozen Hurricane_Helene.aspx tombstone. NEW id on purpose: a fresh id
    // goes through the monitoring-baseline damper on first crawl instead of
    // fanning the page's existing content out as alerts.
    url: 'https://floridarevenue.com/emdisaster/Pages/EmergencyDisaster.aspx',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'html_watch',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: '2026-06-10',
  },
  {
    id: 'hi.dotax_tax_announcements',
    jurisdiction: 'HI',
    title: 'Hawaii DOTAX Tax Announcements',
    // Server-rendered dated index of annNN-NN.pdf announcements — where the
    // March 2026 Kona Low relief was actually published while the old
    // hawaii-wildfires/ (2023) tombstone sat frozen. Same pdf_watch+pdf_index
    // pattern as ME; NEW id for the baseline damper.
    url: 'https://tax.hawaii.gov/news/announce/',
    sourceType: 'emergency_relief',
    acquisitionMethod: 'pdf_watch',
    adapterKind: 'pdf_index',
    cadence: 'weekly',
    priority: 'high',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: '2026-06-10',
  },
] as const satisfies readonly RuleSourceSeedRecord[])

// `sourceExcerpt` is a representative content snippet from each official
// page — paraphrased or near-verbatim, not always a literal quote. Authored
// by hand based on a live read of each URL on `VERIFIED_AT` (see
// `docs/dev-log/2026-04-27-rules-data-audit.md`). Pages whose body is dynamic
// (news indexes, subscription / disaster watch channels) carry the page-level
// summary because there is no stable paragraph to quote.
const SOURCE_EXCERPTS: Record<string, string> = {
  'fed.irs_pub_509_2026':
    'If any due date falls on a Saturday, Sunday, or legal holiday, the return is timely if filed the next business day.',
  'fed.irs_pub_15_2026':
    'Under the monthly deposit schedule, deposit employment taxes on payments made during a month by the 15th day of the following month. If a deposit is required to be made on a day that is not a business day, the deposit is timely if made by the close of the next business day.',
  'fed.irs_i7004_2025':
    'Form 7004 does not extend the time for payment of tax. An extension to file is not an extension to pay.',
  'fed.irs_i1065_2025':
    'Generally, a domestic partnership must file Form 1065 by the 15th day of the 3rd month following the date its tax year ended.',
  'fed.irs_i1120s_2025':
    'A corporation must file Form 1120-S by the 15th day of the 3rd month following the close of its tax year.',
  'fed.irs_i1120_2025':
    'A corporation must file Form 1120 by the 15th day of the 4th month after the end of its tax year.',
  'fed.irs_when_to_file_individuals_2026':
    'IRS lists April 15, 2026 as the individual filing date and states that filing extensions do not extend payment time.',
  'fed.irs_i1041_2025':
    'Calendar-year estates and trusts file Form 1041 and Schedule K-1 by April 15, 2026; fiscal-year due dates use the 15th day of the 4th month after year end.',
  'ca.ftb_541_booklet_2025':
    'Calendar-year estates and trusts file Form 541 and Schedules K-1 (541) by April 15, 2026; fiscal-year due dates use the 15th day of the 4th month after year end.',
  'ny.it205_instructions_2025':
    'Calendar-year fiduciary filers file Form IT-205 by April 15, 2026; fiscal-year due dates use the 15th day of the 4th month after year end.',
  'fed.irs_i941_2026':
    'Form 941 due dates follow the month after each quarter; the instructions list January-March wages as due April 30.',
  'fed.irs_information_return_reporting':
    'IRS information return reporting guidance says Form 1099-NEC is due by January 31 for nonemployee compensation.',
  'fed.irs_p1099_2026':
    'Publication 1099 explains weekend and legal-holiday rollover for filing and furnishing due dates.',
  'fed.fincen_fbar_due_date':
    'FinCEN grants an automatic extension from the April 15 FBAR due date to October 15 each year.',
  'fed.irs_990_due_date':
    'Exempt organization annual returns are generally due on the 15th day of the 5th month after the accounting period ends.',
  'fed.irs_i8868_2026': 'Form 8868 cannot be used to extend the due date of Form 990-N.',
  'fed.irs_i940_2026':
    'Form 940 is due January 31. However, if you deposited all your FUTA tax when it was due, you may file Form 940 by February 10; weekend or legal-holiday due dates roll to the next business day.',
  'fed.irs_iw2w3_2026':
    'File Copy A of Form W-2 with Form W-3 with the Social Security Administration by January 31, and furnish Copies B, C, and 2 to employees by January 31; weekend due dates roll to the next business day.',
  'fed.irs_i709_2025':
    'Form 709 is generally due April 15 of the year after the gift; an extension of time to file the donor income tax return also extends the time to file Form 709.',
  'fed.irs_5500_corner':
    'Form 5500 series returns must be filed by the last day of the 7th calendar month after the plan year ends (July 31 for calendar-year plans); Form 5558 extends the deadline 2 1/2 months.',
  'fed.irs_disaster_relief':
    'IRS publishes notice-specific tax relief by date, listing affected localities and postponed acts.',
  'fed.irs_newswire':
    'IRS Newswire distributes IRS news releases and guidance notices through official e-mail subscription bulletins.',
  'fed.fema_disaster_declarations':
    'OpenFEMA disaster declarations dataset; early-warning signal for IRS / state relief follow-up.',
  'al.income_tax':
    'Alabama individual income tax returns are generally due April 15, with weekend or holiday rollover to the next business day.',
  'al.individual_estimated_tax':
    'Alabama estimated tax payment guidance states installment due dates for taxpayers required to make estimated payments.',
  'al.due_dates':
    'Alabama DOR due-date table lists income tax, business privilege, fiduciary, withholding, and related filing due dates by tax type.',
  'al.corporate_income_extensions':
    'Corporate income tax returns are due with the corresponding federal return, with Alabama filing extensions that do not extend payment time.',
  'al.pass_through_entities':
    'Partnership, S corporation, composite, and electing pass-through entity returns are due on the corresponding federal due date.',
  'al.business_privilege_tax':
    'Alabama business privilege tax is levied on entities organized under Alabama law or doing business in Alabama.',
  'al.fiduciary_income_tax':
    'Alabama fiduciary income tax applies to resident estates or trusts and certain Alabama-source income of nonresident trusts and estates.',
  'al.sales_use_due_dates':
    'Sales and use tax returns and remittances are due by filing frequency, generally on the 20th day following the period.',
  'al.withholding_tax':
    'Alabama income tax withholding guidance is the official source for employer withholding filing and payment context.',
  'al.ui_wage_report':
    'Contribution and Wage Reports are due the last day of the month following the end of the quarter.',
  'ca.ftb_business_due_dates':
    'If the due date falls on a weekend or holiday, you have until the next business day to file and pay.',
  'ca.ftb_llc':
    'FTB LLC overview page: classification, annual tax, LLC fee, Form 568 filing requirements.',
  'ca.ftb_568_booklet_2025':
    'Form 568 instructions distinguish partnership-classified LLCs from SMLLCs for original return due dates.',
  'ca.ftb_emergency_tax_relief':
    'FTB emergency tax relief page lists postponed deadlines for declared disasters; eligibility is per-event.',
  'ca.ftb_tax_news':
    'FTB Tax News index; new entries trigger practice review before any rule change.',
  'ny.tax_calendar.2026':
    'If the due date of the return falls on a Saturday, Sunday, or legal holiday, it is due on the next business day.',
  'ny.ptet':
    'PTET is an optional annual entity-level election; eligible entities must opt in by the annual election deadline.',
  'ny.it204ll':
    'There is no extension of time to file Form IT-204-LL or to pay the annual filing fee.',
  'ny.partnerships':
    'NY partnership filing guidance; partnership return due dates follow the partnership tax year close.',
  'ny.email_services': 'NY Tax Department email subscription channel; not a primary basis source.',
  'ny.article_9a':
    'Article 9-A franchise tax on general business corporations; calendar-year due date is April 15.',
  'ny.nyc_yonkers_income_tax':
    'New York Tax Department says NYC or Yonkers resident income tax is reported on the New York State personal income tax return when the taxpayer is required to file a New York State income tax return. New York personal income tax filing guidance lists April 15, 2026 as the filing due date for calendar-year 2025 personal income tax returns.',
  'in.local_county_income_tax':
    'Indiana DOR states that all counties have a Local Income Tax rate and that county tax is based on residence or employment county facts. Indiana individual income tax filing guidance lists April 15, 2026 as the due date for calendar-year 2025 individual income tax returns.',
  'md.local_income_tax':
    'Comptroller of Maryland guidance says local income tax is collected on the state income tax form as a convenience for local governments. Maryland individual income tax filing guidance lists April 15, 2026 as the calendar-year 2025 individual income tax return due date.',
  'pa.local_eit_lit_psd':
    'Pennsylvania DCED states that PSD codes identify municipalities for local Earned Income Tax and help employers and tax collectors remit to the correct taxing jurisdictions. The taxpayer Annual Local Earned Income Tax Return is an annual local earned income tax filing. For the 2025 calendar tax year, the concrete annual local earned income tax return due date is April 15, 2026, pending local collector confirmation.',
  'pa.local_eit_act32_employer_withholding':
    'Pennsylvania DCED Act 32 guidance says employers with worksites in Pennsylvania must withhold local earned income tax using employee residence and workplace facts. Act 32 employer withholding guidance requires quarterly local earned income tax returns within 30 days after the end of each calendar quarter. For calendar-year 2026 the quarterly returns are due April 30, 2026, July 30, 2026, October 30, 2026, and January 30, 2027 (the 30th day after each quarter end, not the last day of the month).',
  'pa.local_services_tax':
    'Pennsylvania DCED Local Services Tax guidance states that employers with worksites in taxing jurisdictions must withhold and remit LST when the tax is listed in the Official Tax Register. DCED local services tax guidance requires employer remittance on the same quarterly cadence used for local withholding, within 30 days after the end of each calendar quarter. For calendar-year 2026 the quarterly returns are due April 30, 2026, July 30, 2026, October 30, 2026, and January 30, 2027 (within 30 days after each quarter end).',
  'oh.municipal_income_tax_finder':
    'Ohio The Finder provides municipal income tax lookup by address and notes JEDD/JEDZ income tax may require a separate lookup.',
  'oh.municipal_income_tax_annual_return':
    'Ohio Revised Code section 718.05 governs annual municipal income tax return filing and extension treatment for municipal corporations. Section 718.05 ties an individual annual municipal income tax return to the state individual income tax return due date; for calendar-year 2025, use April 15, 2026 pending municipality review.',
  'oh.municipal_net_profit_filing':
    'Ohio Revised Code section 718.051 covers municipal filings by business or profession, including net profit returns, estimated returns, and extensions. Municipal net profit annual returns for a calendar-year taxpayer are due on the fifteenth day of the fourth month after the end of the taxable year; for tax year 2025, that date is April 15, 2026.',
  'tx.franchise_overview':
    'Franchise tax reports are due on May 15 each year. If May 15 falls on a Saturday, Sunday or legal holiday, the next business day becomes the due date.',
  'tx.franchise_home':
    'Texas Franchise Tax landing page; canonical entry for forms, due dates, and No Tax Due reporting.',
  'tx.franchise_annual_report':
    'Annual Report Instructions; PIR and OIR distinguished by entity type.',
  'tx.franchise_extensions':
    'Comptroller will tentatively grant an extension upon timely receipt of the appropriate form by the original report due date.',
  'tx.franchise_forms_2026':
    '2026 Franchise Tax Report forms; report-year forms define No Tax Due availability and reporting changes.',
  'tx.pir_oir':
    'PIR is filed by corporations and LLCs; OIR is filed by other entity types. Both follow the franchise tax report due date.',
  'fl.cit':
    'Florida corporate income/franchise tax is imposed on all corporations for the privilege of conducting business in Florida.',
  'fl.cit_due_dates_2026':
    'Florida DOR publishes a taxable-year-end due-date table for corporate income tax returns and estimated payments.',
  'fl.tips':
    'Florida Tax Information Publications index; new entries trigger practice review before any rule change.',
  'wa.excise_due_dates_2026':
    '2026 Excise Tax Return Due Dates; manual review required (DOR blocks machine fetches).',
  'wa.bo': 'B&O tax applicability depends on business activity and assigned filing frequency.',
  'wa.news':
    'WA DOR news releases index; new entries trigger practice review before any rule change.',
  'wa.capital_gains_exception_2026':
    'Tax Year 2025 Capital Gains tax returns and payments are due May 1, 2026. A filing extension does not extend the due date for paying the capital gains tax.',
}

function locatorKindForSource(source: RuleSource | undefined): RuleEvidenceLocator['kind'] {
  if (!source) return 'html'
  if (source.acquisitionMethod === 'api_watch') return 'api'
  if (source.acquisitionMethod === 'pdf_watch') return 'pdf'
  if (source.acquisitionMethod === 'email_subscription') return 'email_subscription'
  if (source.sourceType === 'calendar' || source.sourceType === 'due_dates') return 'table'
  return 'html'
}

function authorityRoleForSource(source: RuleSource | undefined): RuleEvidenceAuthorityRole {
  if (source?.isEarlyWarning) return 'early_warning'
  if (source?.sourceType === 'news' || source?.sourceType === 'emergency_relief') return 'watch'
  return 'basis'
}

function sourceEvidence(
  sourceId: string,
  heading: string,
  summary: string,
  options: {
    authorityRole?: RuleEvidenceAuthorityRole
    locatorKind?: RuleEvidenceLocator['kind']
    sourceExcerpt?: string
    sourceUpdatedOn?: string
    pdfPage?: number
    tableLabel?: string
    rowLabel?: string
  } = {},
): RuleEvidence {
  const source = RULE_SOURCES.find((item) => item.id === sourceId)
  const locator: RuleEvidenceLocator = {
    kind: options.locatorKind ?? locatorKindForSource(source),
    heading,
  }

  if (options.pdfPage !== undefined) locator.pdfPage = options.pdfPage
  if (options.tableLabel !== undefined) locator.tableLabel = options.tableLabel
  if (options.rowLabel !== undefined) locator.rowLabel = options.rowLabel

  const evidence: RuleEvidence = {
    sourceId,
    authorityRole: options.authorityRole ?? authorityRoleForSource(source),
    locator,
    summary,
    sourceExcerpt: options.sourceExcerpt ?? SOURCE_EXCERPTS[sourceId] ?? summary,
    retrievedAt: VERIFIED_AT,
  }

  const sourceUpdatedOn = options.sourceUpdatedOn ?? source?.lastReviewedOn
  if (sourceUpdatedOn !== undefined) evidence.sourceUpdatedOn = sourceUpdatedOn

  return evidence
}

const PENDING_REVIEW_QUALITY: RuleQualityChecklist = {
  filingPaymentDistinguished: false,
  extensionHandled: false,
  calendarFiscalSpecified: false,
  holidayRolloverHandled: false,
  crossVerified: false,
  exceptionChannel: true,
}

interface StateCandidateRuleDomain {
  slug: StateCandidateRuleSlug
  title: string
  taxType: string
  formName: string
  eventType: ObligationEventType
  isFiling: boolean
  isPayment: boolean
  entityApplicability: readonly EntityApplicability[]
  reviewReason: string
}

interface LocalCandidateRuleDomain {
  slug:
    | 'local_individual_income'
    | 'local_business_income'
    | 'local_employer_withholding'
    | 'local_services_tax'
  title: string
  taxType: string
  formName: string
  eventType: ObligationEventType
  isFiling: boolean
  isPayment: boolean
  entityApplicability: readonly EntityApplicability[]
  localFactRequirements: readonly LocalFactRequirement[]
  reviewReason: string
}

const STATE_CANDIDATE_RULE_DOMAINS = [
  {
    slug: 'individual_income_return',
    title: 'individual income tax return applicability',
    taxType: 'state_individual_income_tax',
    formName: 'State individual income tax return',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    entityApplicability: ['individual'],
    reviewReason:
      'Confirm state personal income tax filing requirement, due date, extension, and no-tax status where applicable.',
  },
  {
    slug: 'individual_estimated_tax',
    title: 'individual estimated tax payment schedule',
    taxType: 'state_individual_estimated_tax',
    formName: 'State individual estimated tax',
    eventType: 'payment',
    isFiling: false,
    isPayment: true,
    entityApplicability: ['individual', 'sole_prop'],
    reviewReason:
      'Confirm state estimated tax thresholds, installment schedule, weekend/holiday rollover, and no-tax status where applicable.',
  },
  {
    slug: 'fiduciary_income_return',
    title: 'fiduciary income return applicability',
    taxType: 'state_fiduciary_income_tax',
    formName: 'State fiduciary income tax return',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    entityApplicability: ['trust'],
    reviewReason:
      'Confirm state fiduciary income tax filing requirement, due date, extension, and estate or trust applicability.',
  },
  {
    slug: 'business_income_return',
    title: 'business income return applicability',
    taxType: 'state_business_income_tax',
    formName: 'State business income return',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    reviewReason:
      'Confirm state business income return due date, entity applicability, extension, and tax-year handling against the business source.',
  },
  {
    slug: 'business_estimated_tax',
    title: 'business estimated tax payment schedule',
    taxType: 'state_business_estimated_tax',
    formName: 'State business estimated tax',
    eventType: 'payment',
    isFiling: false,
    isPayment: true,
    entityApplicability: ['s_corp', 'c_corp'],
    reviewReason:
      'Confirm business estimated tax installment schedule, threshold, and payment-only treatment against the business source.',
  },
  {
    slug: 'pass_through_entity_return',
    title: 'pass-through entity return applicability',
    taxType: 'state_pte_composite_ptet',
    formName: 'State pass-through entity return',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reviewReason:
      'Confirm state partnership, S corporation, composite, and electing pass-through entity return due dates against the pass-through entity source.',
  },
  {
    slug: 'franchise_or_entity_tax',
    title: 'franchise or entity tax applicability',
    taxType: 'state_franchise_or_entity_tax',
    formName: 'State franchise or entity tax',
    eventType: 'filing',
    isFiling: true,
    isPayment: true,
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    reviewReason:
      'Confirm franchise, entity, gross receipts, or margin tax due dates and entity-specific filing requirements against the business source.',
  },
  {
    slug: 'sales_use_tax',
    title: 'sales and use tax return schedule',
    taxType: 'state_sales_use_tax',
    formName: 'State sales and use tax return',
    eventType: 'filing',
    isFiling: true,
    isPayment: true,
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    reviewReason:
      'Confirm state sales and use tax filing frequency, due dates, and payment treatment against the sales/use source.',
  },
  {
    slug: 'withholding',
    title: 'withholding tax return schedule',
    taxType: 'state_withholding_tax',
    formName: 'State withholding tax return',
    eventType: 'deposit',
    isFiling: true,
    isPayment: true,
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    reviewReason:
      'Confirm state withholding filing frequency, deposits, reconciliation, and wage statement due dates against the withholding source.',
  },
  {
    slug: 'ui_wage_report',
    title: 'unemployment wage report schedule',
    taxType: 'state_ui_wage_report',
    formName: 'State unemployment contribution and wage report',
    eventType: 'information_report',
    isFiling: true,
    isPayment: true,
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    reviewReason:
      'Confirm state unemployment contribution and wage report due dates, payment treatment, and employer applicability against the labor source.',
  },
] as const satisfies readonly StateCandidateRuleDomain[]

const LOCAL_CANDIDATE_RULE_DOMAINS = [
  {
    slug: 'local_individual_income',
    title: 'local individual income tax applicability',
    taxType: 'local_individual_income_tax',
    formName: 'Local individual income tax return or state-return overlay',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    entityApplicability: ['individual', 'sole_prop'],
    localFactRequirements: ['local_filing_channel'],
    reviewReason:
      'Confirm local residence, work location, collector, and whether the local obligation is collected through a state return or local return.',
  },
  {
    slug: 'local_business_income',
    title: 'local business income or net profits tax applicability',
    taxType: 'local_business_income_tax',
    formName: 'Local business income or net profits return',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    localFactRequirements: ['principal_office_municipality', 'local_collector'],
    reviewReason:
      'Confirm local business presence, municipality, collector, and net-profits filing requirement before creating obligations.',
  },
  {
    slug: 'local_employer_withholding',
    title: 'local employer withholding applicability',
    taxType: 'local_employer_withholding_tax',
    formName: 'Local employer withholding return',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    localFactRequirements: ['work_municipality', 'worksite_psd_code', 'local_collector'],
    reviewReason:
      'Confirm employee residence/worksite codes and local collector withholding requirements before creating obligations.',
  },
  {
    slug: 'local_services_tax',
    title: 'local services tax applicability',
    taxType: 'local_services_tax',
    formName: 'Local services tax return',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    localFactRequirements: ['work_municipality', 'local_collector', 'lst_exemption_status'],
    reviewReason:
      'Confirm worksite municipality, LST rate, and collector filing cadence before creating obligations.',
  },
] as const satisfies readonly LocalCandidateRuleDomain[]

const STATE_CANDIDATE_SOURCE_EXCERPTS: Partial<
  Record<`${RuleJurisdiction}:${StateCandidateRuleSlug}`, string>
> = {
  'AZ:individual_income_return': [
    'The 2025 Arizona individual income tax return for calendar-year filers is due April 15, 2026.',
    'A valid extension moves the 2025 Arizona individual income tax return filing due date to October 15, 2026.',
  ].join('\n'),
  'AZ:individual_estimated_tax': [
    'Arizona Form 140ES estimated tax payments for the 2025 calendar year are due April 15, June 17, and September 16, 2025, and January 15, 2026.',
    'Arizona estimated income tax payments are required when the taxpayer meets the listed Arizona gross income thresholds and must total either 90% of current-year tax or 100% of prior-year tax when applicable.',
  ].join('\n'),
  'AZ:fiduciary_income_return': [
    'The 2025 Arizona fiduciary income tax return, Form 141AZ, is due April 15, 2026 for calendar-year filers.',
    'A valid Arizona fiduciary extension allows an additional 5 1/2 months to September 30, 2026; a qualified funeral trust using federal Form 7004 follows the 6-month October 15, 2026 calendar-year extension date.',
  ].join('\n'),
  'AZ:business_income_return': [
    'Arizona corporate income tax returns are due on the 15th day of the fourth month following the close of the taxable year.',
    'If the Arizona corporate return due date falls on a Saturday, Sunday, or legal holiday, the return is timely filed if postmarked by the next business day.',
    'The 2025 Arizona corporate return filing extension provides a 7-month extension for Forms 120 and 120A; calendar-year corporate Arizona returns extended for 2025 are due November 15, 2026.',
  ].join('\n'),
  'AZ:business_estimated_tax': [
    'Arizona estimated tax payments for C corporations, exempt organizations with UBTI, and S corporations subject to federal tax are due on the 15th day of the 4th, 6th, 9th, and 12th months of the taxable year.',
    'Corporations and exempt organizations with UBTI must make Arizona estimated payments when anticipated Arizona tax liability is at least $1,000 for the taxable year.',
  ].join('\n'),
  'AZ:pass_through_entity_return':
    'All partnership returns (Form 165) and S Corporation returns (Form 120S) are due on or before the 15th day of the 3rd month following the close of the taxable year. For a calendar-year filer this is March 15; if the due date falls on a Saturday, Sunday, or legal holiday, the return is timely if filed the next business day. The Arizona Pass-Through Entity (PTE) election is made on this same income tax return. A six-month extension is available (Form 120/165EXT).',
  'AZ:sales_use_tax': [
    'Arizona transaction privilege tax returns must be filed even when no sales or tax are due for the filing period.',
    'For monthly Arizona TPT electronic returns and payments in AZTaxes, December 2025 activity is due January 30, 2026; January 2026 activity is due February 27, 2026; February 2026 activity is due March 31, 2026; March 2026 activity is due April 30, 2026.',
    'For monthly Arizona TPT electronic returns and payments in AZTaxes, April 2026 activity is due May 29, 2026; May 2026 activity is due June 30, 2026; June 2026 activity is due July 31, 2026; July 2026 activity is due August 31, 2026.',
    'For monthly Arizona TPT electronic returns and payments in AZTaxes, August 2026 activity is due September 30, 2026; September 2026 activity is due October 30, 2026; October 2026 activity is due November 30, 2026; November 2026 activity is due December 31, 2026.',
  ].join('\n'),
  'AZ:withholding':
    'Form A1-QRT (Arizona Quarterly Withholding Tax Return) due dates: First calendar quarter – April 30; Second calendar quarter – July 31; Third calendar quarter – October 31; Fourth calendar quarter – January 31. If a due date is a non-banking day (Saturday, Sunday, or a legal holiday), the return/payment is timely if filed the next banking day. Employers that made every payment on time during the preceding quarter have ten additional days to file Form A1-QRT.',
  'AZ:ui_wage_report':
    'Arizona Unemployment Tax and Wage Reports (Form UC-018), filed with the Department of Economic Security (DES), are due quarterly the last day of the month following the end of the calendar quarter: April 30, July 31, October 31, and January 31. Tax payment is due the same date. If the due date falls on a weekend or state holiday, it is extended to the next business day.',
  'AR:individual_income_return': [
    'Arkansas individual income tax returns are due April 15; if April 15 is a weekend or holiday, the return is due the next business day.',
    'Arkansas honors accepted federal extensions and sets the typical extension due date one month after the federal extended due date, usually November 15 for annual individual filers.',
    'Interest and applicable failure-to-pay penalties run from the original due date on tax due returns.',
  ].join('\n'),
  'AR:individual_estimated_tax': [
    'Arkansas AR1000ES is required when the taxpayer can reasonably expect estimated tax to be more than $1,000.',
    'AR1000ES vouchers are generally due April 15, June 15, September 15, and January 15.',
    'If an AR1000ES voucher due date falls on a Saturday, Sunday, or legal holiday, it is timely if postmarked on the next business day.',
  ].join('\n'),
  'AR:fiduciary_income_return': [
    'Arkansas Form AR1002F and AR1002NR fiduciary returns are due April 15 for calendar-year filers.',
    'Fiscal-year fiduciary filers file on or before the 15th day of the fourth month after the close of the fiscal year.',
    'A federal Form 7004 fiduciary extension gives the Arkansas fiduciary return the same extension plus one month; without a federal extension, Form AR1055-FE can request a 210-day Arkansas extension by April 15.',
    'Interest is charged on taxes not paid by the due date even when a filing extension is granted.',
  ].join('\n'),
  'AR:business_income_return': [
    'Arkansas corporation income tax returns are due the 15th day of the fourth month following the end of the tax year.',
    'Arkansas Form AR1100CT extensions extend the filing window, but tax must be paid in full by the original return due date.',
  ].join('\n'),
  'AR:business_estimated_tax': [
    'Arkansas corporations expecting to owe income tax over $1,000 must make a declaration and timely pay estimated tax in equal installments.',
    'Non-farm corporate estimated tax installments are due on the 15th day of the 4th, 6th, 9th, and 12th months of the tax year.',
  ].join('\n'),
  'AR:pass_through_entity_return': [
    'Arkansas elective pass-through entity tax applies to eligible partnerships and LLCs and S-corporations.',
    'The Arkansas PET due date is April 15 for calendar-year filers.',
  ].join('\n'),
  'AR:franchise_or_entity_tax': [
    'Arkansas Secretary of State franchise tax and annual reports apply to corporations, LLCs, banks, and insurance companies registered in Arkansas.',
    'Arkansas franchise tax filing is generally due on or before May 1.',
  ].join('\n'),
  'AR:sales_use_tax':
    "Monthly filers: each return is due on or before the twentieth (20th) day of each month showing the tax due for the preceding calendar month (roll-forward to next business day when the 20th is a weekend/holiday). Per Ark. Code R. 005-GR-77: 'It is the duty of all taxpayers (sellers) to deliver to the Director, on or before the twentieth (20th) day of each month, a return showing the tax due, during the preceding calendar month.'",
  'AR:withholding': [
    'Arkansas employer withholding instructions govern when income tax withheld is returned and reconciled.',
    'Form AR3MAR, Employer Annual Reconciliation of Income Tax Withheld, is used for annual employer filing and payment.',
    'If a withholding due date falls on a Saturday, Sunday, or legal holiday, the return is timely if postmarked on the next business day.',
  ].join('\n'),
  'AR:ui_wage_report': [
    'Arkansas employers report total wages paid to all employees in the quarterly report.',
    'Arkansas unemployment tax payments are remitted with the quarterly report and are delinquent if not postmarked or received by the last day of the month following the close of the calendar quarter.',
  ].join('\n'),
  'DC:individual_income_return': [
    'For DC 2026 Tax Year 2025 individual income tax forms, D-40 Individual Income Tax Return is due on or before April 15, 2026.',
    'The D-40 Booklet states that if the due date for filing a return falls on a Saturday, Sunday, or legal holiday, the return is due the next business day.',
    'The DC FR-127 Extension of Time to File Voucher is filed by April 15, 2026; if Military Combat Zone applies, file by October 15, 2026.',
  ].join('\n'),
  'DC:individual_estimated_tax': [
    'For DC 2026 Tax Year 2025 individual income tax forms, D-40ES Estimated Payment for Individual Income Tax has Voucher #1 due April 15, 2026.',
    'D-40ES Voucher #2 is due June 15, 2026; Voucher #3 is due September 15, 2026; Voucher #4 is due January 15, 2027.',
  ].join('\n'),
  'DC:fiduciary_income_return': [
    'For DC 2026 Tax Year 2025 fiduciary tax forms, D-41 Fiduciary Income Tax Return is due on or before April 15, 2026.',
    'D-41P Payment Voucher and FR-127F Extension of Time to File Fiduciary Return are due on or before April 15, 2026.',
    'D-41ES Estimated Payment for Fiduciary Tax is due on or before April 15, 2026.',
  ].join('\n'),
  'DC:business_income_return': [
    'For DC 2026 Tax Year 2025 corporate business franchise tax forms, D-20 Corporation Franchise Tax Return is due on or before April 15, 2026 for calendar-year filers and on or before the 15th day of the fourth month following the close of taxable year for fiscal-year filers.',
    'For DC 2026 Tax Year 2025 unincorporated business franchise tax forms, D-30 Unincorporated Business Franchise Tax Return is due on or before April 15, 2026 for calendar-year filers and on or before the 15th day of the fourth month following the close of taxable year for fiscal-year filers.',
  ].join('\n'),
  'DC:business_estimated_tax': [
    'For DC 2026 Tax Year 2025 corporate franchise estimated tax, D-20ES calendar-year vouchers are due April 15, June 15, September 15, and December 15.',
    'For DC 2026 Tax Year 2025 unincorporated business estimated tax, D-30ES calendar-year vouchers are due April 15, June 15, September 15, and December 15.',
    'For fiscal-year filers, the DC D-20ES and D-30ES vouchers are due on the 15th day of the 4th, 6th, 9th, and 12th months.',
  ].join('\n'),
  'DC:pass_through_entity_return': [
    'For DC 2026 Tax Year 2025 partnership tax forms, D-65 Partnership Return of Income is due on or before April 15, 2026 for calendar-year filers.',
    'For fiscal-year filers, D-65 is due on or before the 15th day of the fourth month following the close of the taxable year.',
    'FR-165 Extension of Time to File Partnership Return is due on or before April 15, 2026 for calendar-year filers and on or before the 15th day of the fourth month following the close of the taxable year for fiscal-year filers.',
  ].join('\n'),
  'DC:sales_use_tax': [
    'DC Form FR-800M, the monthly sales and use tax return, is due on or before the 20th day of the month following the month being reported.',
    'DC Form FR-800Q, the quarterly sales and use tax return, is due on or before the 20th day of the month following the quarter being reported.',
    'DC Form FR-800A, the annual sales and use tax return, is due on or before October 20.',
  ].join('\n'),
  'DC:withholding': [
    'DC Form FR-900M, the monthly employer withholding return, is due on or before the 20th day of the month following the month being reported.',
    'DC Form FR-900Q, the quarterly employer withholding return, is due on or before the 20th day of the month following the quarter being reported.',
    'DC Form FR-900A, the annual employer withholding return, is due on or before January 20 of the subsequent year.',
  ].join('\n'),
  'DC:ui_wage_report': [
    "DC employers are required to file an Employer's Quarterly Contribution and Wage Report, Form UC-30, each quarter.",
    'DC unemployment quarterly reports are due on April 30, July 31, October 31, and January 31.',
    'As long as the employer is still in business, a Contribution and Wage Report must be filed when due; if no wages are paid during a quarter, the employer must file a timely zero wage report.',
  ].join('\n'),
  'KS:individual_income_return': [
    'Kansas Pub. KS-1515 states that all other Kansas income tax returns are due the same date as the federal filing due date.',
    'Kansas Pub. KS-1515 lists Individual Income Tax / Food Sales Tax Return (Form K-40) under April 15 for calendar-year returns.',
    'Kansas Pub. KS-1515 states that if any due date falls on a Saturday, Sunday, or legal holiday, substitute the next regular workday.',
  ].join('\n'),
  'KS:individual_estimated_tax': [
    'Kansas Pub. KS-1515 states that estimated tax payments for all calendar year taxpayers except farmers and fishers are due on the 15th of April, June, September and January of the following tax year.',
    'Kansas Pub. KS-1515 lists Individual Estimated Income Tax (Form K-40ES) Voucher 1 under April 15 for calendar-year taxpayers.',
    'Kansas Pub. KS-1515 states that if any due date falls on a Saturday, Sunday, or legal holiday, substitute the next regular workday.',
  ].join('\n'),
  'KS:ui_wage_report': [
    'Kansas Department of Labor states that quarterly wage reports, tax reports, and tax payments are due April 30 for the January 1 through March 31 filing period.',
    'Kansas Department of Labor states that quarterly wage reports, tax reports, and tax payments are due July 31 for April 1 through June 30, October 31 for July 1 through September 30, and January 31 for October 1 through December 31.',
    'Kansas Department of Labor states that Quarterly Wage Reports are no longer mailed and that wage reporting details and online payments can be completed via KansasLabor.gov.',
  ].join('\n'),
  'KY:franchise_or_entity_tax': [
    'Kentucky DOR April 2026 Tax Calendar states that if a return due date falls on a scheduled holiday or weekend, returns are due the next working day.',
    'Kentucky DOR April 2026 Tax Calendar lists April 15 for Corporation Income Tax/LLET and Pass-through Entity Return and Payment Due (FY ending 12/31).',
    'Kentucky DOR May 2026 Tax Calendar lists May 15 for Corporation Income Tax/LLET and Pass-through Entity Return and Payment Due (FY ending 1/31).',
  ].join('\n'),
  'KY:sales_use_tax': [
    'Kentucky DOR January 2026 Tax Calendar lists January 20 for Sales Tax (Monthly, Quarterly, Annual).',
    'Kentucky DOR April 2026 Tax Calendar lists April 20 for Sales Tax (Monthly, Quarterly).',
    'Kentucky DOR May 2026 Tax Calendar lists May 20 for Sales Tax (Monthly) and May 26 for Sales Tax Accelerated Filers.',
  ].join('\n'),
  'KY:withholding': [
    'Kentucky DOR April 2026 Tax Calendar lists April 10 for Twice-Monthly Income Tax Withholding Return (March 16-March 31 payment).',
    'Kentucky DOR April 2026 Tax Calendar lists April 15 for Monthly Income Tax Withholding Return (March payment).',
    'Kentucky DOR April 2026 Tax Calendar lists April 30 for Quarterly Income Tax Withholding Return (January 1-March 31 payment).',
    'Kentucky DOR May 2026 Tax Calendar lists May 15 for Monthly Income Tax Withholding Return (April payment) and May 26 for Twice-Monthly Income Tax Withholding Return (May 1-May 15 payment).',
  ].join('\n'),
  'LA:fiduciary_income_return': [
    'Louisiana DOR 2026 May filing dates list Fiduciary Income Tax for Estates and Trusts under 05 / 15.',
    'The Louisiana DOR Fiduciary Income Tax for Estates and Trusts event states Friday, May 15, 2026, and says fiduciaries managing estates and trusts are required to file their income tax returns by this date.',
  ].join('\n'),
  'LA:business_income_return': [
    'Louisiana DOR 2026 May filing dates list Annual Corporation and Franchise Return under 05 / 15.',
    'The Louisiana DOR Annual Corporation and Franchise Return event states Friday, May 15, 2026, and says corporations are required to file their annual income and franchise tax returns by this date.',
  ].join('\n'),
  'LA:business_estimated_tax': [
    'The Louisiana DOR Declaration of Estimated Corporation Income - 1st Payment event states Wednesday, April 15, 2026, and says corporations are required to make their first estimated income tax payment by this date.',
    'Louisiana DOR 2026 filing dates list Declaration of Estimated Corporation Income - 2nd Payment in June 2026 and the June page lists it under 06 / 15.',
    'Louisiana DOR 2026 filing dates list Declaration of Estimated Corporation Income - 3rd Payment in September 2026 and Declaration of Estimated Corporation Income - 4th Payment in December 2026.',
    'The Louisiana DOR Declaration of Estimated Corporation Income - 4th Payment event states Tuesday, December 15, 2026, and says the fourth quarter payment is due on the 15th day of the 12th month of the taxable year.',
  ].join('\n'),
  'LA:pass_through_entity_return': [
    'Louisiana DOR Partnership Tax guidance states that returns and payments are due on or before May 15th of the following year.',
    'For fiscal-year partnership taxpayers, Louisiana DOR states that returns and payments are due on the 15th day of the fifth month after the close of the fiscal year.',
    'Louisiana DOR states that if the partnership due date falls on a weekend or legal holiday, the return is due on the next business day.',
  ].join('\n'),
  'LA:franchise_or_entity_tax': [
    'Louisiana DOR 2026 May filing dates list Annual Corporation and Franchise Return under 05 / 15.',
    'The Louisiana DOR Annual Corporation and Franchise Return event states Friday, May 15, 2026, and says corporations are required to file their annual income and franchise tax returns by this date.',
  ].join('\n'),
  'LA:sales_use_tax':
    'The tax return is due on or before the 20th day of the month following the close of the calendar month or quarter reporting period. If the due date falls on a weekend or holiday, the return is due the next business day and becomes delinquent the first day thereafter.',
  'LA:withholding':
    'Each Form L-1 covers one quarterly period and must be filed by the last day of the month following the close of the calendar quarter except for semi-monthly payers. Semi-monthly payers must file Form L-1 by the fifteenth of the month following the close of the quarter. A quarterly return must be filed even if no taxes are withheld during the quarter.',
  'MD:pass_through_entity_return': [
    'Maryland 2025 Form 510 Pass-Through Entity Income Tax Return Instructions state that every Maryland PTE must file a return, even if it has no income or the entity is inactive.',
    'Maryland Form 510 instructions state to file Form 510 by the 15th day of the 4th month following the close of the tax year or period.',
    'Maryland Form 510/511E extension application must be properly filed and submitted by the 15th day of the 4th month following close of the tax year or period.',
  ].join('\n'),
  'MD:sales_use_tax':
    'Your sales and use tax return is due on the 20th day of the month following the month in which the period ends and is indicated on each return. If a due date falls on a Saturday, Sunday, or legal holiday, the return is due on the next business day.',
  'MD:withholding': [
    'Comptroller of Maryland Withholding Tax Due Dates state that income tax withholding report due dates vary for monthly, quarterly, accelerated, and annual filers.',
    'Maryland monthly income tax withholding reports are due on the 15th day of the month following the month in which the income tax was withheld.',
    'Maryland quarterly income tax withholding returns are due on the 15th day of the month that follows a calendar quarter in which income tax was withheld.',
    'Maryland annual withholding reports are due on or before January 31 in the year that follows the year in which the income tax was withheld.',
  ].join('\n'),
  'ME:individual_income_return': [
    'Maine Revenue Services lists Form 1040ME and Form 1040EXT-ME as due April 15 for calendar-year filers.',
    'Maine Revenue Services states that if the due date falls on a holiday or weekend, the due date is the next business day.',
  ].join('\n'),
  'ME:individual_estimated_tax':
    '3) WHEN AND WHERE TO MAKE PAYMENTS. The first installment payment is due on April 15, 2026. You may either pay all of your estimated tax at that time or pay in four equal installments on April 15, 2026, June 15, 2026, September 15, 2026, and January 15, 2027.',
  'ME:ui_wage_report': [
    'For the 2026 reporting year, the quarterly ME UC-1 due dates are April 30, 2026; July 31, 2026; October 31, 2026; and January 31, 2027.',
    'The same due-date page lists ME UC-1 under Income Tax Withholding for Employers and states that weekend or holiday due dates move to the next business day.',
  ].join('\n'),
  'MI:individual_income_return':
    'All state of Michigan individual income tax returns and payment of any taxes owed must be received by April 15, 2026.',
  'MI:individual_estimated_tax': [
    'Michigan quarterly individual estimated tax payments are due April 15, June 15, and September 15 of the tax year, and January 15 of the next year.',
    'Michigan estimated tax payments may be made using Michigan Treasury eServices or mailed with a Michigan Estimated Tax voucher (MI-1040ES).',
  ].join('\n'),
  'MI:fiduciary_income_return': [
    'Michigan Fiduciary Income Tax returns are due on or before April 15 or on the 15th day of the fourth month after the close of the tax year.',
    'A fiduciary must file a Michigan Fiduciary Income Tax Return (Form MI-1041) and pay the tax due if the estate or trust is required to file under the Michigan guidance.',
  ].join('\n'),
  'MI:business_income_return': [
    'Michigan Corporate Income Tax Due Dates for Tax Year 2025 lists the December year-end calendar-year return due date as April 30, 2026.',
    'Michigan Corporate Income Tax Due Dates for Tax Year 2025 lists the December year-end calendar-year return with extension due date as December 31, 2026.',
  ].join('\n'),
  'MI:business_estimated_tax': [
    'Michigan Corporate Income Tax Due Dates for Tax Year 2025 lists the December year-end calendar-year Q1 estimated payment due date as April 15, 2025.',
    'Michigan Corporate Income Tax Due Dates for Tax Year 2025 lists Q2 estimated payment due July 15, 2025, Q3 estimated payment due October 15, 2025, and Q4 estimated payment due January 15, 2026.',
  ].join('\n'),
  'MI:pass_through_entity_return':
    "The annual flow-through entity tax return is required to be filed by the last day of the third month after the end of the taxpayer's tax year (March 31 for calendar year filers).",
  'MI:sales_use_tax': 'This return is due on the 20th of the month following the return period.',
  'MI:withholding': [
    'Businesses liable for Michigan sales, use, and/or withholding tax are required to send returns according to the filing frequency determined by Treasury.',
    'Michigan withholding monthly returns are due on or before the 20th day of the following month.',
    'Michigan withholding quarterly returns are due on or before the 20th day of the month following the quarter.',
    'Michigan withholding annual returns are due February 28.',
  ].join('\n'),
  'MI:ui_wage_report':
    'Quarterly reports and payments are due: First Quarter - April 25, Second Quarter - July 25, Third Quarter - October 25 and Fourth Quarter - January 25. If the 25th is a weekend day or holiday, the report must be received on the next business day at the latest.',
  'OH:individual_income_return': [
    'Most taxpayers must file their Ohio IT 1040 and SD 100, if applicable, by April 15, 2026.',
    'Ohio honors an IRS extension; if an IRS extension is filed, the due date for filing the Ohio IT 1040 and SD 100 is October 15, 2026.',
    'An extension of time to file does not extend the time for payment of Ohio tax due, and extension payments must be made by April 15, 2026.',
  ].join('\n'),
  'OH:individual_estimated_tax': [
    'Ohio taxpayers should make estimated payments for tax year 2026 if estimated Ohio tax liability less Ohio withholding is more than $500.',
    'Ohio estimated payments for tax year 2026 are due April 15, 2026; June 15, 2026; September 15, 2026; and January 15, 2027.',
  ].join('\n'),
  'OH:ui_wage_report':
    'Both reports must be filed no later than the last day of the first month following the close of the calendar quarter for which the report is being filed. If the due date falls on a weekend, then the reports are due the next business day. The following is the filing schedule for the quarterly reports: Jan., Feb., March - April 30; April, May, June - July 31; July, Aug., Sept. - Oct 31; Oct., Nov., Dec. - Jan 31.',
  'PA:individual_income_return': [
    'A Pennsylvania taxpayer must report taxable income received or accrued during the calendar year from January 1 through December 31.',
    'The Pennsylvania Department of Revenue follows the IRS due date for filing returns.',
    'Pennsylvania PA-40 returns must be filed before midnight on April 15 or the next business day if April 15 falls on a Saturday, Sunday, or IRS recognized holiday.',
  ].join('\n'),
  'PA:individual_estimated_tax': [
    'Pennsylvania estimated personal income tax payments for individual taxpayers are generally due April 15, June 15, September 15, and January 15.',
    'The Pennsylvania estimated tax table adjusts due dates to the next business day when a due date falls on a weekend or legal holiday.',
  ].join('\n'),
  'RI:individual_income_return': [
    'Rhode Island income tax returns will be considered timely filed if postmarked by Wednesday, April 15, 2026.',
    'Filing for an extension of time to file Form RI-1040 does not extend the time to pay Rhode Island tax liability due.',
  ].join('\n'),
  'RI:individual_estimated_tax': [
    'Rhode Island 2026 Form RI-1040ES resident and nonresident estimated payment coupons list the first estimate due April 15, 2026.',
    'Rhode Island estimated payment coupons list the 2026 estimated tax installment schedule as April 15, 2026; June 15, 2026; September 15, 2026; and January 15, 2027.',
  ].join('\n'),
  'RI:fiduciary_income_return': [
    'Rhode Island fiduciary tax returns must be filed and paid by the 15th day of the fourth month following the close of the taxable year.',
    'Rhode Island fiduciary tax is subject to the same estimated payment rules as the RI-1040 return.',
  ].join('\n'),
  'RI:business_income_return': [
    'Rhode Island business corporation tax returns for calendar-year filers are due on or before the fifteenth day of the fourth month following the close of the taxable year.',
    'Rhode Island Form RI-1120C is used for the business corporation tax return and is listed in the 2025 corporate tax forms.',
  ].join('\n'),
  'RI:business_estimated_tax': [
    'Rhode Island business corporation estimated tax payments are made quarterly.',
    'Rhode Island calendar-year estimated payment timing follows April 15, June 15, September 15, and January 15 of the following year.',
  ].join('\n'),
  'RI:pass_through_entity_return': [
    'Rhode Island Forms RI-1065 and RI-1120S are due on or before the fifteenth day of the third month following the close of the taxable year for all filers except single-member LLC filers.',
    'Rhode Island corporate tax forms list RI-1065 Partnership Income Return and RI-1120S Subchapter S Business Corporation Tax Return for tax year 2025.',
  ].join('\n'),
  'RI:franchise_or_entity_tax':
    'Form RI-1120C shall be filed on or before the fifteenth (15th) day of the fourth (4th) month following the close of the fiscal year.',
  'RI:sales_use_tax': [
    'Rhode Island retailers generally must file a Sales and Use Tax return on or before the 20th day of each month for the previous calendar month and pay the tax due.',
    'Rhode Island sales tax permits expire every June 30 and renewal applications are due annually by February 1.',
  ].join('\n'),
  'RI:withholding':
    'A reconciliation form, Form RI-941, is due on or before the last day of the month following the close of the quarter.',
  'RI:ui_wage_report': [
    'The Rhode Island Employer Tax Unit processes quarterly tax and wage reports, Form TX-17, and accompanying tax payments submitted by Rhode Island employers.',
    'Rhode Island fourth quarter employer taxes are due on or before January 31.',
  ].join('\n'),
  'MN:ui_wage_report': [
    'Minnesota wage detail reports for Joint UI/Paid Leave and Paid Leave-only accounts are due the last day of the month following the end of the calendar quarter.',
    'Minnesota lists quarterly due dates as April 30 for 1st quarter, July 31 for 2nd quarter, October 31 for 3rd quarter, and January 31 for 4th quarter.',
    'If the Minnesota due date falls on a weekend or legal holiday, the due date is the following business day.',
  ].join('\n'),
  'MO:ui_wage_report':
    'The report should be filed and contributions paid by the last day of the month following the end of each calendar quarter to be considered timely. When the date falls on a Saturday, Sunday, or holiday, the first working date following is considered timely.',
  'TN:ui_wage_report': [
    "Tennessee states that at the end of each quarter, the employer's quarterly unemployment report becomes due at the end of the next month.",
    'Tennessee gives the example that the 1st quarter ends March 31 and employers have until April 30 to file their quarterly report.',
    'If no Tennessee quarterly unemployment report is received by the due date, the delinquent cycle begins.',
  ].join('\n'),
  'NE:ui_wage_report': [
    'Nebraska Employer Tax Services User Guide states that any employer with active liable quarters must submit a quarterly Combined Tax Report.',
    'The Combined Tax Report and Wage Report are due the last day of the month following the end of each calendar quarter; for calendar-year 2026 the due dates are April 30, 2026, July 31, 2026, October 31, 2026, and January 31, 2027.',
    'Nebraska tax and wage reports must both be submitted before the deadline to be considered timely.',
    'Nebraska reports and payment are due by the end of the month following each quarter end date.',
  ].join('\n'),
  'NV:ui_wage_report': [
    'Nevada DETR states that every quarter, all registered employers must file quarterly contribution and wage reports and pay any taxes due on or before the delinquent date for the quarter.',
    'Nevada quarterly reports and payment are generally due by the last day of the first month following the close of the calendar quarter covered by the report.',
    'Nevada lists 2026 quarterly due dates as April 30, 2026; July 31, 2026; November 2, 2026; and February 1, 2027 because weekends shift the Q3 and Q4 dates.',
  ].join('\n'),
  'NC:sales_use_tax': [
    'North Carolina DOR Filing Frequency and Due Dates states that taxpayers assigned a monthly filing frequency must file on or before the 20th day of each month for all taxes due for the preceding calendar month.',
    'North Carolina quarterly sales and use tax filers must file on or before the last day of January, April, July, and October for the preceding three-month period.',
    'North Carolina monthly filing with prepayment taxpayers must file on or before the 20th day of each month for the preceding calendar month and make a prepayment of the next month liabilities.',
    'For 2026 monthly North Carolina sales and use tax filings, January activity is due February 20, 2026; February activity is due March 20, 2026; March activity is due April 20, 2026; April activity is due May 20, 2026.',
    'For 2026 quarterly North Carolina sales and use tax filings, the January-March quarter is due April 30, 2026; April-June is due July 31, 2026; July-September is due October 31, 2026; October-December is due January 31, 2027.',
    'North Carolina lists due-date rollover guidance for due dates that fall on a Saturday, Sunday, or legal holiday.',
  ].join('\n'),
  'IA:individual_income_return': [
    'Iowa current-year income tax returns are due on April 30 of the following year.',
    'If the due date falls on a Saturday, Sunday, or holiday as defined in Iowa code 421.9A, then the due date is the following day that is not a Saturday, Sunday, or holiday.',
  ].join('\n'),
  'IA:individual_estimated_tax': [
    'For fiscal year filers, the dates for paying the estimated tax are the last day of the fourth, sixth, and ninth months of the fiscal year, and the last day of the first month of the next fiscal year.',
    'Installment 1 - 04/30/2026',
    'Installment 2 - 06/30/2026',
    'Installment 3 - 09/30/2026',
    'Installment 4 - 01/31/2027',
  ].join('\n'),
  'IL:business_income_return': [
    'Corporate income tax due dates are generally the 15th day of the 3rd or 4th month depending on the tax year end date of the corporation filing the return.',
    'While extensions are automatically granted, any anticipated tax due must be paid by the original due date of the return.',
  ].join('\n'),
  'IL:pass_through_entity_return': [
    'Tax returns for partnerships and trusts generally have a due date of the 15th day of the 4th month following the end of their tax year.',
    'Tax returns for S-corporations generally have a due date of the 15th day of the 3rd month following the end of their tax year.',
    'While extensions are automatically granted, any anticipated tax due must be paid by the original due date of the return.',
  ].join('\n'),
  'IL:franchise_or_entity_tax': [
    'Corporations (Form IL-1120, Corporation Income and Replacement Tax Return, filers), partnerships (Form IL-1065, Partnership Replacement Tax Return, filers), trusts (Form IL-1041, Fiduciary Income and Replacement Tax Return, filers), and S corporations (Form IL-1120-ST, Small Business Corporation Replacement Tax Return, filers) pay these taxes.',
    'Corporate income tax due dates are generally the 15th day of the 3rd or 4th month depending on the tax year end date of the corporation filing the return.',
    'Tax returns for partnerships and trusts generally have a due date of the 15th day of the 4th month following the end of their tax year.',
    'Tax returns for S-corporations generally have a due date of the 15th day of the 3rd month following the end of their tax year.',
  ].join('\n'),
  'MS:fiduciary_income_return': [
    'Mississippi fiduciary income tax instructions state that calendar-year estates and trusts must file a fiduciary income tax return on or before April 15.',
    'Fiscal-year Mississippi estates and trusts must file on or before the 15th day of the fourth month following the close of the tax period.',
    'An extension of time to file may be requested, but the extension does not extend the time for payment of income tax due.',
  ].join('\n'),
  'MS:pass_through_entity_return': [
    'Mississippi DOR states that pass-through entity returns are due on or before the 15th day of the 3rd month following the close of the taxable year.',
    'Mississippi follows federal return filing and extended filing due dates for pass-through tax returns.',
  ].join('\n'),
  'MS:withholding': [
    'Mississippi DOR Withholding Tax Due Dates state that withholding returns are due the 15th day of the month following the period.',
    'If a Mississippi withholding due date falls on a Saturday, Sunday, or legal holiday, the due date becomes the next business day.',
    'Mississippi W-2s are due to employees by January 31 and paper and electronic W-2s are due to DOR by January 31.',
    'Mississippi paper 1099s and electronic 1099s are due to DOR by February 28.',
  ].join('\n'),
  'MS:ui_wage_report': [
    'Quarterly wage reports and taxes are due by the last day of the month following the close of each calendar quarter.',
    '1st Quarter Due April 30th',
    '2nd Quarter Due July 31st',
    '3rd Quarter Due October 31st',
    '4th Quarter Due January 31st',
    'Please note: If the any of the above dates fall on a weekend, the due date will be on the next business day.',
  ].join('\n'),
  'NM:individual_income_return': [
    'State and federal income tax returns are due next month, on Wednesday, April 15.',
    'The New Mexico Taxation and Revenue Department allows most taxpayers to securely file state returns for free using the online Taxpayer Access Point (TAP).',
  ].join('\n'),
  'NC:individual_income_return': [
    'If you file your return on a calendar year basis, the 2025 return is due on or before April 15, 2026.',
    'A fiscal year return is due on the 15th day of the 4th month following the end of the taxable year.',
    'When the due date falls on a Saturday, Sunday, or legal holiday, your return will be considered timely filed so long as you file the return on the next succeeding day which is not a Saturday, Sunday, or a legal holiday.',
  ].join('\n'),
  'NC:individual_estimated_tax': [
    'For most calendar year filers, estimated payments are due April 15, June 15, and September 15 of the taxable year and January 15 of the following year.',
    'If you file your income tax return by January 31 of the following year and pay your entire balance, you do not have to make the January 15 payment.',
  ].join('\n'),
  'NC:pass_through_entity_return': [
    'A partnership income tax return must be filed on or before the 15th day of the 4th month following the end date of the partnership’s tax year.',
    'For example, for calendar year partnerships, the due date is April 15th.',
    'When the due date of the partnership income tax return falls on a Saturday, Sunday, or a legal holiday in North Carolina or in the District of Columbia, a return filed by the next business day after the Saturday, Sunday, or legal holiday will be considered timely filed.',
    'An extension of time to file does not extend the time to pay.',
  ].join('\n'),
  'SC:individual_income_return':
    'A return for calendar year 2025 is due by April 15, 2026 (15th day of the 4th month). For TY2025 SCDOR is automatically extending the FILING deadline for all 2025 SC Individual Income Tax returns to October 15, 2026 (no action required), but taxpayers must still pay at least 90% of 2025 tax liability by April 15, 2026 to avoid penalties.',
  'SC:individual_estimated_tax':
    'If you file using a calendar year end of December 31, your Estimated Tax payments are due in four equal installments: 1st quarter: due April 15, 2026; 2nd quarter: due June 15, 2026; 3rd quarter: due September 15, 2026; 4th quarter: due January 15, 2027.',
  'WI:individual_income_return': [
    'Your 2025 return must be filed by April 15, 2026, unless you have an extension of time to file.',
    'If your 2025 individual income tax return is not filed by April 15, 2026, you may be subject to the following charges:',
  ].join('\n'),
  'WI:individual_estimated_tax':
    'You may pay all your estimated tax at that time or in four equal installments on or before April 15, 2026, June 15, 2026, September 15, 2026, and January 15, 2027.',
  'WY:sales_use_tax': [
    "Each vendor shall on or before the last day of each month file a true return showing the preceding month's gross sales and remit all taxes to the department.",
    'If the total tax to be remitted by a vendor during any month is less than one hundred fifty dollars ($150.00), a quarterly or annual return as authorized by the department, and remittance in lieu of the monthly return may be made on or before the last day of the month following the end of the quarter or year for which the tax is collected.',
    'The taxes are due and payable on the last day of the month following the month in which they were collected or as required by the department as specified in this article.',
    'For 2026 monthly Wyoming sales and use tax filings, January activity is due February 28, 2026; February activity is due March 31, 2026; March activity is due April 30, 2026; April activity is due May 31, 2026.',
    'For 2026 monthly Wyoming sales and use tax filings, May activity is due June 30, 2026; June activity is due July 31, 2026; July activity is due August 31, 2026; August activity is due September 30, 2026.',
    'For 2026 monthly Wyoming sales and use tax filings, September activity is due October 31, 2026; October activity is due November 30, 2026; November activity is due December 31, 2026; December activity is due January 31, 2027.',
    'For 2026 quarterly Wyoming sales and use tax filings, Q1 is due April 30, 2026; Q2 is due July 31, 2026; Q3 is due October 31, 2026; Q4 is due January 31, 2027.',
  ].join('\n'),
  'KY:ui_wage_report': [
    'Kentucky employers file quarterly unemployment wage and tax reports using Form UI-3.',
    'The quarterly report is due on the last day of the month following the close of the calendar quarter.',
    'For 2026 Kentucky unemployment wage reports, Q1 is due April 30, 2026; Q2 is due July 31, 2026; Q3 is due October 31, 2026; Q4 is due January 31, 2027.',
  ].join('\n'),
  'LA:ui_wage_report':
    'Unemployment insurance quarterly wage and tax reports (Form LWC ES-4) are due by the last day of the month following the close of each calendar quarter: April 30 (Q1), July 31 (Q2), October 31 (Q3), and January 31 (Q4), rolling to the next business day if that date falls on a weekend or holiday.',
  'ND:ui_wage_report': [
    "Liable employers must electronically file Employer's Contribution and Wage Reports quarterly.",
    'Reports must be electronically completed with the tax due at the end of each calendar quarter.',
    'North Dakota unemployment contribution and wage reports follow the standard last-day-of-the-month schedule after each calendar quarter: Q1 is due April 30; Q2 is due July 31; Q3 is due October 31; Q4 is due January 31.',
  ].join('\n'),
  'OK:ui_wage_report': [
    'All employers and third-party administrators must file a quarterly wage report online that reports the wages paid to all employees during the quarter.',
    'These quarterly reports must be submitted on any active tax accounts regardless of whether or not any wages or taxable wages were paid during the quarter.',
    'Oklahoma quarterly state unemployment taxes are due on or before the last day of the month following the calendar quarter to which the taxes relate.',
    'For 2026 Oklahoma unemployment wage reports, Q1 is due April 30, 2026; Q2 is due July 31, 2026; Q3 is due October 31, 2026; Q4 is due January 31, 2027.',
  ].join('\n'),
  'TN:business_income_return': [
    'Annual  | 15th day of the fourth month following the close of your books and records.',
    'For businesses with a January 1 - December 31 calendar year, this tax is due on April 15 of the following year.',
    'Extension  | Seven months extension',
  ].join('\n'),
  'TN:business_estimated_tax':
    'Taxpayers with a combined Franchise and Excise tax liability of $5,000 or greater must make quarterly estimated payments by the 15th day of the fourth, sixth, and ninth months of the current tax year and the 15th day of the first month of the next succeeding tax year.',
  'TN:franchise_or_entity_tax': [
    'Annual  | 15th day of the fourth month following the close of your books and records.',
    'For businesses with a January 1 - December 31 calendar year, this tax is due on April 15 of the following year.',
    'Franchise tax  | 0.25% of Tennessee net worth.',
    'Excise tax  | 6.5% of Tennessee taxable income.',
  ].join('\n'),
  'WV:ui_wage_report': [
    'Filing Deadlines: Quarterly unemployment tax filings are typically due one month after the end of each calendar quarter:',
    'Quarter ending March 31 is due April 30.',
    'Quarter ending June 30 is due July 31.',
    'Quarter ending September 30 is due October 31.',
    'Quarter ending December 31 is due January 31.',
    'File wage reports and pay unemployment compensation contributions online with ACH debit.',
  ].join('\n'),
  'MT:individual_income_return': [
    'Montana Department of Revenue lists individual income tax returns as due April 15.',
    'Montana Department of Revenue lists the individual income tax extension date as October 15.',
  ].join('\n'),
  'MT:individual_estimated_tax': [
    'Montana estimated tax payments for calendar-year filers are due April 15, June 15, September 15, and January 15 of the following year.',
    'Fiscal-year Montana estimated tax payments are due on the 15th day of the 4th, 6th, and 9th months of the fiscal year and the 15th day of the 1st month after year-end.',
  ].join('\n'),
  'MT:fiduciary_income_return': [
    'Montana estate and trust income tax returns are due April 15 for calendar-year filers.',
    'Fiscal-year Montana estate and trust returns are due on the 15th day of the 4th month following the tax year end.',
    'Montana grants estates and trusts an automatic six-month filing extension; calendar-year extension returns are due October 15, but payment is still due by the original due date.',
  ].join('\n'),
  'MT:business_income_return': [
    'Montana C corporation income tax returns are due May 15 for calendar-year filers and on the 15th day of the 5th month after year-end for fiscal-year filers.',
    'Montana grants C corporations an automatic six-month filing extension; calendar-year extension returns are due November 15, but tax liability must be paid by the original due date.',
    'Montana S corporations use the Montana Pass-Through Entity Tax Return, Form PTE, to report activity.',
  ].join('\n'),
  'MT:business_estimated_tax':
    'A corporation must make estimated tax payments if its annual estimated tax is $5,000 or more. The four required installments are due on the 15th day of the 4th, 6th, 9th, and 12th months of the tax year = April 15, June 15, September 15, and December 15 for a calendar-year corporation.',
  'MT:pass_through_entity_return': [
    'Montana pass-through entities include partnerships, S corporations, LLCs taxed as partnerships or S corporations, and disregarded entities.',
    'Montana pass-through entity returns are due March 15 for calendar-year filers.',
    'Montana pass-through entity extension returns are due September 15 for calendar-year filers.',
  ].join('\n'),
  'MT:withholding': [
    'Montana employers with an open withholding account must file the Montana Annual W-2 1099 Withholding Tax Reconciliation, Form MW-3, every year.',
    'Montana Form MW-3, Forms W-2, and Forms 1099 with withholding are due January 31.',
    'Montana wage withholding payment due dates depend on the employer withholding payment schedule.',
  ].join('\n'),
  'NH:business_income_return': [
    'New Hampshire BT-SUMMARY instructions state that calendar-year BET and BPT returns are due March 15 for partnerships and April 15 for proprietorships, corporations, combined groups, and fiduciaries.',
    'For fiscal-year filers, New Hampshire partnership BET and BPT returns are due on the 15th day of the third month after the close of the fiscal period.',
    'For fiscal-year proprietorship, corporation, and fiduciary filers, New Hampshire BET and BPT returns are due on the 15th day of the fourth month after the close of the taxable period.',
    'New Hampshire grants an automatic 7-month extension to file when 100% of the BET and BPT due by the original due date has been paid; the extension does not extend time to pay.',
  ].join('\n'),
  'NH:business_estimated_tax': [
    'New Hampshire BT-SUMMARY instructions state that every entity required to file a BPT return or BET return must also make quarterly estimated tax payments unless the annual estimated tax is less than $200 for BPT and $260 for BET.',
    'New Hampshire quarterly estimates are 25% of the estimated tax liability.',
    'For calendar-year New Hampshire business tax filers, estimated business tax payments are due April 15, June 15, September 15, and December 15.',
    'For fiscal-year New Hampshire business tax filers, estimated payments are due on the 15th day of the 4th, 6th, 9th, and 12th months of the taxable period.',
  ].join('\n'),
  'NH:pass_through_entity_return': [
    'New Hampshire BT-SUMMARY instructions state that calendar-year partnership BET and BPT returns are due March 15.',
    'For fiscal-year partnerships, New Hampshire BET and BPT returns are due on the 15th day of the third month after the close of the fiscal period.',
    'New Hampshire treats S corporations as corporations for business tax return purposes and requires Form DP-120 with the business tax return.',
    'New Hampshire grants an automatic 7-month extension to file when 100% of the BET and BPT due by the original due date has been paid; the extension does not extend time to pay.',
  ].join('\n'),
  'NH:franchise_or_entity_tax':
    'RSA 77-A:6, I: every business organization having gross business income shall file a return on or before the fifteenth day of the third month in the case of organizations required to file a United States partnership tax return, and the fifteenth day of the fourth month in the case of all other business organizations, following expiration of its taxable period. For a calendar-year 2026 filer: corporate/proprietorship/combined/fiduciary BPT/BET returns are due 2027-04-15 (15th day of 4th month); partnership returns are due 2027-03-15 (15th day of 3rd month).',
  'NH:ui_wage_report': [
    'New Hampshire Employment Security states that the 1st quarter employer quarterly tax and wage report, for the quarter ending March 31, is due April 30.',
    'The 2nd quarter New Hampshire employer quarterly tax and wage report, for the quarter ending June 30, is due July 31.',
    'The 3rd quarter New Hampshire employer quarterly tax and wage report, for the quarter ending September 30, is due October 31.',
    'The 4th quarter New Hampshire employer quarterly tax and wage report, for the quarter ending December 31, is due January 31.',
    'Reports are considered timely filed if filed no later than midnight Eastern time within 2 business days after the due date.',
  ].join('\n'),
  'ND:individual_income_return': [
    'North Dakota 2026 individual income tax deadlines list April 15 as the date when 2025 Form ND-1 or ND-EZ Individual Income Tax Return and tax are due.',
    'North Dakota lists October 15 as the due date for extended 2025 Form ND-1 or ND-EZ Individual Income Tax Return.',
  ].join('\n'),
  'ND:individual_estimated_tax': [
    'North Dakota 2026 individual income tax deadlines list January 15 for the fourth quarter 2025 estimated income tax payment.',
    'North Dakota lists 2026 estimated individual income tax payments as due April 15, June 15, and September 15 for the first three 2026 quarters.',
  ].join('\n'),
  'ND:fiduciary_income_return': [
    'North Dakota fiduciary tax guidance states that the North Dakota fiduciary income tax return is due on April 15.',
    'If an extension of time to file federal Form 1041 is received, the same extension of time to file North Dakota Form 38 is automatically applied.',
  ].join('\n'),
  'ND:business_income_return':
    'Form 40, Corporation Income Tax Return, is due on or before the 15th day of the 4th month following the close of the tax year. For a calendar-year filer that is April 15.',
  'ND:business_estimated_tax':
    'Corporate estimated income tax (Form 40-ES) is paid in four installments due the 15th day of the 4th, 6th, and 9th months of the tax year and the 15th day of the 1st month following the close of the tax year.',
  'ND:pass_through_entity_return': [
    'North Dakota S Corp and Partnership Tax Deadlines list April 15 for 2025 calendar year-end S corporation Form 60 and partnership Form 58 returns and tax.',
    'North Dakota lists September 15 for extended 2025 calendar year-end S corporation Form 60 and partnership Form 58 returns.',
  ].join('\n'),
  'ND:sales_use_tax':
    'The Sales, Use and Gross Receipts Tax Return is due the last day of the month following the period end date. If that day falls on a weekend or holiday, the return is not due until the next business day.',
  'ND:withholding':
    'Form 306 (Income Tax Withholding Return) must be filed for each calendar quarter on or before: Jan.-March by April 30; April-June by July 31; July-Sept. by October 31; and Oct.-Dec. by January 31.',
  'CA:withholding': [
    'California EDD 2026 Payroll Tax Due Dates list DE 88 (Monthly) payroll tax deposits for January due February 17, 2026; February due March 16, 2026; March due April 15, 2026; April due May 15, 2026; and May due June 15, 2026.',
    'California EDD 2026 Payroll Tax Due Dates list DE 88 (Quarterly) deposits for the 1st Quarter of 2026 due April 30, 2026; 2nd Quarter due July 31, 2026; 3rd Quarter due November 2, 2026; and 4th Quarter due February 1, 2027.',
    'California EDD states that if a due date is on a Saturday, Sunday, or legal holiday, the next business day is the last day you can submit the report or deposit.',
  ].join('\n'),
  'CA:ui_wage_report': [
    'California EDD 2026 Payroll Tax Due Dates list DE 9 - Quarterly Contribution Return and Report of Wages and DE 9C - Quarterly Contribution Return and Report of Wages (Continuation).',
    'California EDD lists the 1st Quarter of 2026 (January, February, March) DE 9 and DE 9C due April 30, 2026; 2nd Quarter due July 31, 2026; 3rd Quarter due November 2, 2026; and 4th Quarter due February 1, 2027.',
    'California EDD states that if a due date is on a Saturday, Sunday, or legal holiday, the next business day is the last day you can submit the report.',
  ].join('\n'),
  'UT:sales_use_tax':
    'Sales and related tax returns are due the last day of the month after the filing period. For example, fourth quarter return filings are due January 31. If the due date is a Saturday, Sunday, or legal holiday, the due date is the next business day. Quarterly filers: Apr 30, Jul 31, Oct 31, Jan 31.',
  'UT:withholding':
    "Quarterly returns (TC-941E) are due: 1st Qtr Apr 30, 2nd Qtr Jul 31, 3rd Qtr Oct 31, 4th Qtr Jan 31. The annual return is combined with the 4th quarter return. Employers must also file all required W-2's and 1099R's electronically by January 31.",
  'VT:individual_income_return': [
    'Vermont statute requires a Vermont personal income tax return for individuals, trusts, and estates that meet the listed filing thresholds.',
    'The Vermont return required by 32 V.S.A. section 5861 must be filed on or before the date a United States income tax return is originally required to be filed for the taxable year.',
    'For calendar-year 2025 individual income tax returns due in 2026, the Vermont individual income tax return is due April 15, 2026.',
  ].join('\n'),
  'VT:individual_estimated_tax':
    'Payment Due Dates (Form IN-114): 1st Quarter APR 15, 2026; 2nd Quarter JUN 15, 2026; 3rd Quarter SEP 15, 2026; 4th Quarter JAN 15, 2027.',
  'VT:fiduciary_income_return': [
    'Vermont statute applies the return filing rule to individuals, trusts, and estates that meet the Vermont filing thresholds.',
    'The Vermont return required by 32 V.S.A. section 5861 must be filed on or before the date a United States income tax return is originally required to be filed for the taxable year.',
    'For calendar-year 2025 fiduciary income tax returns due in 2026, the Vermont fiduciary income tax return is due April 15, 2026.',
  ].join('\n'),
  'VT:business_income_return':
    'Form CO-411, Corporate Income Tax Return, is due on the date prescribed for filing the federal corporate return under the IRC — the 15th day of the 4th month after the close of the taxable year (April 15 for calendar-year C corporations). For a TY2025 calendar-year filer, the return is due April 15, 2026.',
  'VT:business_estimated_tax':
    "Corporate estimated tax payments (Form CO-414) are due on the 15th day of the 4th, 6th, 9th, and 12th months of the corporation's taxable year — April 15, June 15, September 15, and December 15 for calendar-year filers. If the 15th falls on a weekend or holiday, the due date is the next business day. Required when expected annual VT tax liability exceeds $500.",
  'VT:pass_through_entity_return': [
    'Vermont partnerships, S corporations, and LLC returns are due on the date prescribed for filing under the Internal Revenue Code.',
    'For calendar-year 2025 partnerships and S corporations due in 2026, Vermont Form BI-471 is due March 16, 2026 because March 15, 2026 falls on a Sunday.',
    'Vermont Form BI-471 instructions state that the extension of time to file does not extend the time to pay tax due, including the Vermont minimum tax.',
  ].join('\n'),
  'VT:sales_use_tax': [
    'Vermont businesses must register for a Vermont Business Tax Account and license prior to collecting sales and use tax.',
    'Vermont businesses are responsible for collecting and paying applicable sales and use tax to the Department of Taxes.',
    'Vermont sales and use tax returns are filed monthly, quarterly, or annually on Form SUT-451 according to the taxpayer filing frequency.',
    'Vermont sales and use tax statute requires quarterly sales and use tax installments on or before the 25th day of the calendar month succeeding the quarter ending March, June, September, and December.',
  ].join('\n'),
  'VT:withholding': [
    'Vermont Form WHT-436 quarterly withholding reconciliation due dates are April 25 for January through March, July 25 for April through June, October 25 for July through September, and January 25 for October through December.',
    'If a Vermont Form WHT-436 due date falls on a weekend or holiday, the return is due the next business day.',
    'Vermont monthly withholding payments must be remitted every month by the 25th, with the final payment for the quarter submitted with Form WHT-436.',
  ].join('\n'),
  'VT:ui_wage_report': [
    'Vermont employers must file quarterly wage and contribution reports for State Unemployment Insurance reporting.',
    'Vermont quarterly unemployment insurance wage and contribution reports are due April 30, July 31, October 31, and January 31.',
    'If the Vermont unemployment report due date falls on a weekend, the due date is the next business day.',
  ].join('\n'),
  'AL:business_estimated_tax': [
    'Alabama corporate and business income estimated tax is paid in quarterly installments due the 15th day of the 4th, 6th, 9th, and 12th months of the tax year (Ala. Code 40-18-80.1).',
    'For a calendar-year 2026 filer the quarterly estimated tax installments are due April 15, 2026, June 15, 2026, September 15, 2026, and December 15, 2026.',
    'These quarterly estimated installments are the 15th-of-the-month estimate dates, separate from the annual Form 20C corporate income tax return (due May 15) and from any last-day-of-month employment or withholding deadlines.',
  ].join('\n'),
  'AL:franchise_or_entity_tax': [
    "Business Privilege Tax C-Corporation Due no later than 15th day of the 4th month after the beginning of a taxpayer's taxable year.",
    'For a calendar-year 2026 filer the Business Privilege Tax return is due April 15, 2026 for C-corporations (Form CPT) and March 15, 2026 for S-corporations and pass-through entities (Form PPT). This is the entity privilege tax and is separate from the May 15 corporate income tax (Form 20C) return.',
    "S-Corporation Due no later than 15th day of the 3rd month after the beginning of a taxpayer's taxable year.",
    "Limited Liability Entities Due no later than 15th day of the 3rd month after the beginning of a taxpayer's taxable year.",
    'If the due date falls on a weekend or Alabama state holiday, it moves to the next business day.',
  ].join('\n'),
  'AL:individual_estimated_tax':
    'Your estimated tax may be paid in full or in equal installments on or before April 15, 2026, June 15, 2026, September 15, 2026 and January 15, 2027. If the 15th falls on a Saturday, Sunday, or State holiday, the due date will then be considered the following business day.',
  'AL:sales_use_tax':
    'The returns and remittances are due on or before the 20th day of the month following the month during which the tax is accrued. If the due date falls on a weekend or holiday, the return must be electronically submitted or postmarked on or before the next working day to be timely filed.',
  'AL:withholding':
    "FORM A-6 ... DUE DATE: The 15th of the month following the month being filed. FORM A-1 ... DUE DATE: The last day of the month following the end of the quarter. FORM A-3 AND W-2's ... The last day of January following. ... If any due date falls on a Saturday, Sunday, or legal holiday, the payment and return are due by the next business day.",
  'AK:business_income_return':
    'The due dates for filing Alaska corporate income tax returns (months after the end of the tax year) are as follows: • C Corporations, generally — Filing due date: 15th of the fifth month; Extended due date: 15th of the eleventh month.',
  'AK:business_estimated_tax':
    'Enter in columns A through D the installment due dates (the 15th day of the 4th, 6th, 9th and 12th months of the tax year).',
  'AK:ui_wage_report':
    'The report must be filed on or before the last day of the month following each calendar quarter (8 AAC 85.020). Per 8 AAC 85.030, where the due date falls on a Saturday, Sunday, or state holiday, timely receipt is satisfied on the next state working day.',
  'CO:individual_income_return':
    'Due Date: Your Colorado income tax return and payment for any tax owed are due April 15. Revenue Online will accept returns as timely filed until midnight. Mailed returns and payments must be postmarked by April 15. An automatic extension to file is granted until October 15, but there is no extension to pay. ... If a due date falls on a weekend or legal holiday, the return or payment will be due the next business day.',
  'CT:individual_income_return':
    'April 15 — Individual: CT-1040, Connecticut Resident Income Tax Return. (DRS-166, 2026 Tax Filing Due Dates Calendar, April page lists CT-1040 under April 15.)',
  'CT:individual_estimated_tax':
    'When to File: Estimated payments for the 2026 taxable year are due on or before April 15, June 15, September 15, 2026, and January 15, 2027.',
  'CT:business_income_return':
    "May 15 — Business: CT-1120, Corporation Business Tax Return. Due 'on or before the fifteenth day of the month following the due date of the corporation's corresponding federal income tax return for the income year (May 15 for calendar year filers).'",
  'CT:business_estimated_tax':
    'Due date: 15th day of the 3rd/6th/9th/12th month of the income year. If the due date falls on a Saturday, Sunday, or legal holiday, this return will be considered timely if filed by the next business day. (Calendar-year 2026: statutory 3/15, 6/15, 9/15, 12/15; the 3/15/2026 first installment falls on a Sunday and is therefore timely if filed by Monday, March 16, 2026.)',
  'DE:individual_income_return':
    'Individual income tax returns are due on or before April 30, 2026 for all taxpayers filing on a calendar year basis.',
  'DE:individual_estimated_tax':
    'For the Period: 1/1/2026 through 3/31/2026 — April 30, 2026; 4/1/2026 through 5/31/2026 — June 15, 2026; 6/1/2026 through 8/31/2026 — September 15, 2026; 9/1/2026 through 12/31/2026 — January 15, 2027.',
  'DE:fiduciary_income_return':
    'Fiduciary Income Tax Returns are due on or before April 30th following the close of the taxable year for all taxpayers filing on a calendar year basis.',
  'DE:business_income_return':
    'File Form CIT-TAX on or before the fifteenth day of the fourth month following the close of the taxable year.',
  'DE:business_estimated_tax':
    'Corporate tentative returns (CIT-EST), period ending 12/31/2026: Q01 04/15/2026, Q02 06/15/2026, Q03 09/15/2026, Q04 12/15/2026 — 15th day of the 4th, 6th, 9th, and 12th month of the taxable year (50%/20%/20%/10%).',
  'DE:pass_through_entity_return':
    'Partnerships must file by the 15th day of the third month following the expiration of the taxable period (March 15 for calendar year taxpayers).',
  'DE:withholding':
    'Quarterly filers: quarter end 03/31/2026 due 04/30/2026; 06/30/2026 due 07/31/2026; 09/30/2026 due 11/02/2026; 12/31/2026 due 02/01/2027.',
  'FL:business_income_return':
    'For all other tax year endings, the due date is on or before the first day of the fifth month following the close of the tax year. For example, for a taxpayer with a tax year that ends December 31, 2025, the Florida Form F-1120 is due on or before May 1, 2026.',
  'FL:business_estimated_tax':
    'Make your estimated tax payments in four equal installments. For calendar year filers payments are due on May 31, June 30, September 30, and December 31.',
  'FL:ui_wage_report':
    "An Employer's Quarterly Report (Form RT-6) is due the 1st day of the month following the end of each calendar quarter and is late if not postmarked by the last day of the month. However, if the last day of the month is a Saturday, Sunday, or legal holiday, the timely filing period is extended until the end of the next working day.",
  'GA:individual_estimated_tax':
    'Payment in full of your estimated tax may be made with the first required installment or in equal installments during this year on or before April 15, June 15, September 15, and the following January 15. ... If the due date falls on a weekend or holiday, the tax shall be due on the next day that is not a weekend or holiday.',
  'GA:fiduciary_income_return':
    'Georgia Form 501 (Fiduciary Income Tax Return) is due on or before the 15th day of the 4th month following the close of the taxable year (April 15 for a calendar-year estate or trust). If the due date falls on a weekend or holiday, the tax shall be due on the next day that is not a weekend or holiday.',
  'GA:business_income_return':
    'When and Where to File. The return is due on or before the 15th day of the 4th month following the close of the taxable year. This would be April 15, 2026 if filing on a calendar-year basis. If the due date falls on a weekend or holiday, the return shall be due on the next day that is not a weekend or holiday.',
  'GA:business_estimated_tax':
    'The following percentages of estimated tax shall be paid on or before the fifteenth day of the 4th, 6th, 9th, and 12th month of the taxable year ... so as to effect payment in full of the estimated tax by the 15th day of the twelfth month of the taxable year. Corporations are required to file if net income for the taxable year can reasonably be expected to exceed $25,000.',
  'GA:franchise_or_entity_tax':
    "Thereafter, an annual [net worth tax] return must be filed on or before the fifteenth day of the fourth month following the beginning of the corporation's taxable period.",
  'GA:sales_use_tax':
    'Returns and payments are considered timely if postmarked by the due date of the return (the 20th day following the close of the reporting period). Due dates falling on a weekend or holiday are adjusted to the following business day.',
  'GA:withholding':
    'Submit Form G-7 on or before the last day of the month following the quarter. If the due date falls on a weekend or holiday, the tax shall be due on the next day that is not a weekend or holiday.',
  'GA:ui_wage_report':
    'Reports and any payment due must be filed on or before April 30th, July 31st, October 31st, and January 31st (if the due date falls on a weekend or a legal holiday, reports are due by the next business day).',
  'HI:individual_estimated_tax':
    'Due Dates for Estimated Tax Payments. You can pay all of your estimated tax by April 20, 2026, or in four equal amounts by April 20, 2026, June 20, 2026, September 20, 2026, and January 20, 2027.',
  'HI:fiduciary_income_return':
    'Returns must be filed on or before the 20th day of the fourth month following the close of the taxable year of the estate or trust. If the due date falls on a Saturday, Sunday, or holiday, the due date for the return is extended to the next business day.',
  'HI:business_income_return':
    'Returns must be filed on or before the 20th day of the fourth month following the close of the taxable year (if the due date falls on a Saturday, Sunday, or legal holiday, file by the next regular workday).',
  'HI:business_estimated_tax':
    'A corporation on a calendar year basis must pay the first installment, 1/4 of the estimated tax due, on or before April 20, the second installment on or before June 20, the third installment on or before September 20 of the tax year, and the fourth installment on or before January 20 of the year following the close of the calendar year.',
  'HI:pass_through_entity_return':
    "Returns must be filed on or before the 20th day of the fourth month following the close of the taxable year. [Form N-20 Partnership: 'When and Where to File'. Form N-35 S Corporation: 'When to File and Where to File' — both state the same rule; N-35 adds 'If this date falls on a Saturday, Sunday, or holiday, the due date for the return is extended to the next business day.']",
  'HI:withholding':
    'This return must be filed on or before the 15th day of the month following the close of the calendar quarter. [Quarter Ending Mar / Jun / Sep / Dec]',
  'IN:individual_income_return':
    "Indiana DOR Filing Deadlines page lists 'Individual Tax Returns' (IT-40, IT-40PNR, IT-40RNR) due April 15. The 2025 IT-40 booklet confirms the return for tax year 2025 is due April 15, 2026.",
  'IN:individual_estimated_tax':
    "The four quarterly estimated tax payment due dates for Indiana (Form IT-40ES / ES-40) are April 15, June 15, September 15, and January 15 of the following year. 'If the due date falls on a national or state holiday, Saturday, or Sunday, then payment should be made online or postmarked by the next business day.'",
  'IN:business_income_return':
    'April 15: IT-20S (S-corps) and IT-65 (partnerships) for calendar-year filers; May 15: IT-20 (Corporate), FIT-20, IT-20NP. The IT-20 corporate return is due the 15th day of the 5th month following the close of the taxable year (the later of the 15th day of the 4th month or one month after the federal due date).',
  'IN:sales_use_tax':
    'Monthly Trust Tax Returns (ST-103) for Early Filers ($1,000+ average monthly liability) are due the 20th of the month following the tax period; for standard Monthly Filers (< $1,000) they are due the 30th of the month following. If the due date falls on a weekend or holiday, it moves to the next legal business day.',
  'IN:withholding':
    'Withholding (WH-1) Monthly Trust Tax Returns for Early Filers are due the 20th of the month following the tax period; standard Monthly Filers are due the 30th. The WH-3 annual withholding reconciliation is due January 31. If the due date falls on a weekend or holiday, it moves to the next business day.',
  'IN:ui_wage_report':
    'Q1 (Jan-Mar) due April 30; Q2 (Apr-Jun) due July 31; Q3 (Jul-Sep) due October 31; Q4 (Oct-Dec) due January 31. All covered employers must file a quarterly report no later than the report due date as shown in the chart above.',
  'LA:individual_income_return':
    'Individual income tax returns are due by May 15th for calendar year filers. Fiscal year returns are due on the 15th day of the 5th month after the close of the fiscal year. State law provides an automatic six-month filing extension; the extended due date for tax year 2025 is Nov. 16, 2026 (payment still due May 15).',
  'LA:individual_estimated_tax':
    'Calendar year taxpayers can pay the estimated tax in full with the declaration, or in equal installments, on or before April 15th, June 15th, September 15th, and January 15th. If a due date falls on a weekend or legal holiday, the payment is due on the next business day.',
  'MD:individual_income_return':
    'Your return is due by April 15, 2026. If you are a fiscal year taxpayer, see Instruction 25. If any due date falls on a Saturday, Sunday, or legal holiday, the return must be filed by the next business day.',
  'MD:individual_estimated_tax':
    'You must pay at least one-fourth of the total estimated tax on Line 15 of this form on or before April 15, 2026. The remaining quarterly payments are due June 15, 2026, September 15, 2026 and January 15, 2027. ... If you are filing on a fiscal year basis, each payment is due by the 15th day of the 4th, 6th, 9th and 13th months following the beginning of the fiscal year.',
  'MD:fiduciary_income_return':
    'Due Date. Your return is due by April 15, 2026. If you are a fiscal year taxpayer, see Instruction 24. If the due date falls on a Saturday, Sunday or legal holiday, the return must be filed by the next business day.',
  'MD:business_income_return':
    'File the original Form 500 by the 15th day of the 4th month following the close of the tax year or period, or by the original due date required for filing the federal return.',
  'MD:business_estimated_tax':
    'Declaration of estimated income tax payments are due by the 15th day of the 4th, 6th, 9th and 12th months following the beginning of the tax year or period. ... At least 25% of the total estimated tax must be remitted by each of the four installment due dates.',
  'MA:individual_income_return':
    '2025 Form 1: Massachusetts Resident Income Tax Return — due on or before April 15, 2026. If you qualify for an extension, your return is due on or before October 15, 2026.',
  'MA:individual_estimated_tax':
    'First installment is due on or before April 15, 2026. Second installment is due on or before June 16, 2026. Third installment is due on or before September 15, 2026. Fourth installment is due on or before January 15, 2027.',
  'MA:fiduciary_income_return':
    '2025 Form 2: Fiduciary Income Tax Return — due on or before April 15, 2026; with a valid extension, on or before October 15, 2026.',
  'MA:business_estimated_tax':
    'First installment is due on or before March 16, 2026. Second installment is due on or before June 15, 2026. Third installment is due on or before September 15, 2026. Fourth installment is due on or before December 15, 2026.',
  'MA:pass_through_entity_return':
    '2025 Form 3 (Partnership) — due on or before March 16, 2026 for calendar-year filers; automatic 6-month extension to September 15, 2026. S corporation Form 355S likewise due on or before March 16, 2026 (automatic extension to September 15, 2026).',
  'MA:withholding':
    'Quarterly filers: Form M-941 returns due on or before the last day of the month following the close of the calendar quarter — i.e., on or before April 30, July 31, October 31 and January 31. Annual filers ($100 or less): due by January 31 of the following year.',
  'MA:ui_wage_report':
    'Quarter 1 is due by 3 p.m. on April 30. Quarter 2 is due by 3 p.m. on July 31. Quarter 3 is due by 3 p.m. on October 31. Quarter 4 is due by 3 p.m. on January 31.',
  'MO:individual_income_return':
    'The due date for the 2025 Missouri Individual Income Tax Return is April 15, 2026. Fiscal year filers must file no later than the 15th day of the fourth month following the close of the taxable year.',
  'MO:fiduciary_income_return':
    'A fiduciary return is due on the 15th day of the fourth month following the close of the calendar or fiscal year.',
  'MO:business_income_return':
    'Your Missouri corporation return is due the 15th day of the 4th month following the year end. When the due date falls on a Saturday, Sunday, or a legal holiday, the return and payment will be considered timely if made on the next business day.',
  'MO:business_estimated_tax':
    'You must file the estimated tax payments along with Form MO-1120ES, on or before the 15th day of the 4th, 6th, 9th, and 12th months of the tax year. A corporation must make estimated tax payments if its Missouri estimated tax can reasonably be expected to be at least $250.',
  'MO:pass_through_entity_return':
    "The S-corporation (MO-1120S) and partnership (MO-1065) returns are due on the 15th day of the fourth month following the close of the taxable year. The MO-PTE (pass-through entity tax) return is due by the fifteenth day of the fourth month following the end of the S corporation's or partnership's tax year. Pass-through entities are not required to make estimated tax payments.",
  'MO:sales_use_tax':
    'Monthly returns are due on or before the last day of the following month. Quarterly returns are due on or before the last day of the month following the end of the quarter (e.g., January through March is due on or before April 30). Annual returns are due on or before January 31 of the following year. When the due date falls on a Saturday, Sunday or a holiday, your return will be considered timely filed if it is postmarked by the next business day.',
  'MO:withholding':
    'The withholding tax return (Form MO-941) is due by the 15th day of the following month, except for the third month of a quarter, which is due the last day of the following month. If the due date falls on a weekend or holiday, the due date becomes the next business day.',
  'MT:ui_wage_report':
    'Quarterly wage report and payment due dates: 1st Qtr (Jan-Mar) April 30, 2nd Qtr (Apr-Jun) July 31, 3rd Qtr (Jul-Sep) October 31, 4th Qtr (Oct-Dec) January 31. If the due date is on a weekend or holiday, the next business day becomes the date the quarterly reports and payment must be submitted.',
  'NE:individual_income_return':
    "Nebraska Tax Calendar — Individual Income Tax (1040N): 04/15/2026 is the 'last date for filing and paying remaining tax in full (calendar-year basis).'",
  'NE:individual_estimated_tax':
    "NE Tax Calendar — Individual Estimated Tax (1040N-ES), calendar-year basis: 04/15/2026 first installment; 06/15/2026 second; 09/15/2026 third; 01/15/2026 listed as the 'final installment for 2025' (i.e., the 4th installment for the 2026 tax year falls 01/15/2027).",
  'NE:fiduciary_income_return':
    "NE Tax Calendar shows 04/15/2026 as the 'last date for filing for a decedent's estate or for a trust' (Form 1041N). Form 1041N is due the 15th day of the 4th month following the close of the taxable year.",
  'NE:business_income_return':
    "Business Income Tax FAQs: Form 1120N is due 'the 15th day of the fourth month following the close of the taxable year'; NE Tax Calendar shows 04/15/2026 for calendar-year corporations.",
  'NE:business_estimated_tax':
    "NE Tax Calendar — Corporate Estimated Tax (1120N-ES), calendar-year filers: 04/15/2026 first installment; 06/15/2026 second; 09/15/2026 third; 12/15/2026 'last date for paying fourth installment.'",
  'NE:pass_through_entity_return':
    'NE Tax Calendar lists 03/16/2026 (calendar-year basis) for Partnership (1065N) and S Corporation (1120-SN) returns. Returns are due the 15th day of the 3rd month after close of the taxable year; March 15, 2026 is a Sunday so the deadline rolls to Monday March 16, 2026.',
  'NE:sales_use_tax':
    "Form 10 is due 'on or before the 20th day of the month following the tax period.' NE 2026 monthly schedule: returns due the 20th of each following month, with weekend rollovers — the May-2026 period rolls to 06/22, the Aug-2026 period to 09/21, and the Nov-2026 period to 12/21.",
  'NE:withholding':
    'Form 941N is filed quarterly, due the last day of the month following quarter close. NE Tax Calendar shows Q1 due 04/30/2026, Q3 due 11/02/2026 (Oct 31 is a Saturday), and Q4-2025 due 02/02/2026 — confirming the same Saturday/Sunday rollover pattern for the 2026 quarters.',
  'NM:fiduciary_income_return':
    'DUE DATE OF FIDUCIARY INCOME TAX: The FID-1 and accompanying schedules are due on the same day as the required federal return. ... If the due date falls on a Saturday, Sunday, state or national legal holiday, the return is timely if the postmark bears the date of the next business day.',
  'NM:sales_use_tax':
    'Each Form TRD-41413 is due on or before the 25th of the month following the end of the tax period being reported. [If the due date falls on a weekend or a legal, state or national holiday, the due date is extended to the next business day.]',
  'NM:withholding':
    'Each Form TRD-41414 is due on or before the 25th of the month following the end of the tax period being reported. ... If the date falls on a weekend, a legal, state or national holiday, your Form TRD-41414 and payment due date will be extended to the next business day.',
  'NM:ui_wage_report':
    "An employer's wage and contribution report must be filed electronically on the department's web page on or before the last day of the month immediately following the end of the calendar quarter. If the due date falls on a Saturday, Sunday or legal holiday, the report is due on the next department business day.",
  'OH:fiduciary_income_return':
    "For all trusts and estates, the IT 1041 ... is due April 15 after the year in which the trust or estate's taxable year ends. If any filing due date set forth falls on a weekend or on a holiday, then the due date becomes the first business day thereafter. ... If the trust or estate has a 12/31/2025 calendar year end, the entity can extend the due date for filing the IT 1041 to September 30, 2026, provided it qualifies for an IRS extension of time to file. ... An extension of time to file does not extend the time for payment of the tax due.",
  'OH:franchise_or_entity_tax':
    'Annual filing is eliminated after the 2023 annual return, which is due May 10, 2024. Only quarterly returns may be filed for tax periods beginning on and after January 1, 2024. For calendar year 2025 and thereafter, the exclusion amount is increased to $6 million. [Quarterly CAT returns are due the 10th day of the second month following the end of the calendar quarter: Q1 May 10, Q2 Aug 10, Q3 Nov 10, Q4 Feb 10, rolling forward when the date falls on a weekend or legal holiday.]',
  'OR:business_income_return':
    'Due date of your return. Returns are due by the 15th day of the month following the due date of your federal corporation return. When the 15th day falls on a Saturday, Sunday, or legal holiday, the due date is the next business day.',
  'OR:business_estimated_tax':
    'You must make quarterly estimated tax payments if you expect to owe $500 or more in tax for the year. Calendar year filers: April 15, June 15, September 15, and December 15. If the due date falls on a Saturday, Sunday, or legal holiday, use the next regular business day.',
  'OR:franchise_or_entity_tax':
    'Returns are due by the 15th day of the month following the due date of your federal corporation return. When the 15th day falls on a Saturday, Sunday, or legal holiday, the due date is the next business day.',
  'OR:ui_wage_report':
    'Filing Due Dates for Quarterly Reports — 1st Jan-Feb-Mar (ending March 31, 2026): April 30, 2026; 2nd Apr-May-Jun (ending June 30, 2026): July 31, 2026; 3rd Jul-Aug-Sep (ending September 30, 2026): November 2, 2026; 4th Oct-Nov-Dec (ending December 31, 2026): February 1, 2027. If the due date is on a weekend or holiday, the report is due the next business day.',
  'SC:pass_through_entity_return':
    "SC1065 (partnership) and SC1120S (S corporation): 'Annual returns and your ... Tax payments are due each year by the 15th day of the third month after the end of your business year.' For a calendar-year filer that is March 15, 2026; because March 15, 2026 is a Sunday it is extended to Monday, March 16, 2026 (SC Code Sec. 12-60-50).",
  'SC:sales_use_tax':
    'ST-3 State Sales & Use Tax Return is due by the 20th day of the month following the reporting period (monthly is the default; quarterly/annual require SCDOR approval). When the 20th falls on a Saturday, Sunday, or legal holiday the due date is extended to the next business day (SC Code Sec. 12-60-50).',
  'SC:withholding':
    "Quarterly SC withholding returns (WH-1605 for Q1-Q3, WH-1606 for Q4+annual reconciliation). Due dates: First Quarter (Jan-Mar) April 30; Second Quarter (Apr-Jun) July 31; Third Quarter (Jul-Sep) October 31; Fourth Quarter / annual reconciliation (Oct-Dec) 'Due by January 31'. Because Oct 31, 2026 is a Saturday, Q3 is extended to Monday, Nov 2, 2026; because Jan 31, 2027 is a Sunday, Q4 is extended to Monday, Feb 1, 2027 (SC Code Sec. 12-60-50).",
  'TX:franchise_or_entity_tax':
    'The annual franchise tax report is due May 15. If May 15 falls on a weekend or holiday, the due date will be the next business day.',
  'TX:ui_wage_report':
    'Quarterly wage reports and tax payments are due by the last day of the month following the end of the quarter. If the due date falls on a Saturday, Sunday or legal holiday on which Texas Workforce Commission offices are closed, reports and payments are considered timely if they are received on or before the following business day.',
  'UT:individual_income_return':
    'You must file your return and pay any tax due: 1. by April 15, 2026, if you file on a calendar year basis (tax year ends Dec. 31, 2025); or 2. by the 15th day of the fourth month after the fiscal year ends.',
  'UT:fiduciary_income_return':
    'You must file your return and pay any tax due by April 15, 2026, if you file on a calendar year basis (tax year ends Dec. 31, 2025); or by the 15th day of the fourth month after the fiscal year ends.',
  'UT:business_income_return':
    'You must file your return and pay any tax due by April 15, 2026, if you file on a calendar year basis (tax year ends Dec. 31, 2025); or by the 15th day of the fourth month after the fiscal year ends. (Applies to Corporate TC-20/TC-20S/TC-20MC.)',
  'UT:business_estimated_tax':
    'Quarterly estimated tax payments are due on the 15th day of the 4th, 6th, 9th and 12th months. Calendar-year filing: Apr 15, Jun 15, Sep 15, Dec 15.',
  'UT:pass_through_entity_return':
    'You must file your return and pay any tax due by April 15, 2026, if you file on a calendar year basis; or by the 15th day of the fourth month after the fiscal year ends. (Applies to Partnership TC-65 and S corp TC-20S.)',
  'UT:franchise_or_entity_tax':
    'Every corporation that files form TC-20 must pay a minimum tax (privilege tax) of $100, regardless of whether or not the corporation exercises its right to do business. Return due April 15, 2026 (15th day of the 4th month) for calendar-year filers.',
  'VA:individual_income_return':
    'Typically, most people must file their tax return by May 1. If the due date falls on a Saturday, Sunday, or holiday, you have until the next business day to file with no penalty.',
  'VA:individual_estimated_tax':
    'Make estimated payments online or file Form 760ES Payment Voucher 1 by May 1, 2026. Estimated income tax payments must be made in full on or before May 1, 2026, or in equal installments on or before May 1, 2026, June 15, 2026, September 15, 2026, and January 15, 2027.',
  'VA:business_estimated_tax':
    'For CALENDAR YEAR taxpayers - if first filing is on or before: April 15, 2026 ... June 15, 2026 ... Sept. 15, 2026 ... Dec. 15, 2026. The following percentages of the estimated tax must be paid on or before the 15th day of the 4th, 6th, 9th, 12th month.',
  'WA:franchise_or_entity_tax':
    "Washington, unlike many other states, does not have an income tax. The state's primary business tax is the Business & Occupation (B&O) tax (a gross-receipts tax); there is no corporate income, franchise, or entity-level privilege tax return.",
  'WA:ui_wage_report':
    'Your unemployment tax and wage report is due the last day of the month after the last day of the quarter (Apr 30, Jul 31, Oct 31, Jan 31). When a due date is on a weekend or state holiday, you may send your report the next business day online or by mail.',
  'WI:sales_use_tax':
    'Returns must be filed by the last day of the month following the end of the reporting period... When the regular due date falls on a weekend or legal holiday, the due date is extended to the business day immediately following.',
  'WI:withholding':
    'Monthly or quarterly filers - Due on or before the last day of the month following the monthly or quarterly withholding period. ... If the due date falls on a weekend or legal holiday, the due date is extended to the business day immediately following the weekend or legal holiday. [WT-7 annual reconciliation: January 31 (last day of the month following the calendar year).]',
  'WI:ui_wage_report':
    'The 1st quarter (Jan., Feb., Mar.) is due April 30; 2nd quarter (Apr., May, June) is due July 31; 3rd quarter (July, Aug., Sept.) is due October 31; and the 4th quarter (Oct., Nov., Dec.) is due January 31. Per DWD 110.07(4), if the due date falls on a weekend or holiday, the due date will be the next day that is not a Saturday, Sunday or legal holiday.',
  'WY:ui_wage_report':
    'Q1 due April 30, delinquent May 1; Q2 due July 31, delinquent August 1; Q3 due October 31, delinquent November 1; Q4 due January 31, delinquent February 1. Due Dates may change because the actual due date falls on a weekend or holiday. For example, if the last day of the month following the end of the quarter is a holiday or weekend, the due date will be the next business day.',
}

interface SourceCoverageNotApplicableCell {
  jurisdiction: RuleGenerationState
  domain: StateCandidateRuleSlug
  entityApplicability: readonly RuleSourceCoverageEntity[]
  reason: string
}

const BUSINESS_RETURN_ENTITIES = ['llc', 'partnership', 's_corp', 'c_corp'] as const
const BUSINESS_EMPLOYER_ENTITIES = ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'] as const
const PASS_THROUGH_ENTITIES = ['llc', 'partnership', 's_corp'] as const

const STATE_SOURCE_COVERAGE_NOT_APPLICABLE = [
  {
    jurisdiction: 'TX',
    domain: 'individual_income_return',
    entityApplicability: ['individual'],
    reason: 'Texas does not impose a state individual income tax.',
  },
  {
    jurisdiction: 'TX',
    domain: 'individual_estimated_tax',
    entityApplicability: ['individual', 'sole_prop'],
    reason: 'Texas does not impose state individual estimated income tax payments.',
  },
  {
    jurisdiction: 'TX',
    domain: 'fiduciary_income_return',
    entityApplicability: ['trust'],
    reason: 'Texas does not impose a state fiduciary income tax return.',
  },
  {
    jurisdiction: 'TX',
    domain: 'business_income_return',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Texas business entity tax coverage is tracked through franchise tax, not income tax.',
  },
  {
    jurisdiction: 'TX',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp', 'c_corp'],
    reason: 'Texas has no state business income estimated tax payment schedule.',
  },
  {
    jurisdiction: 'TX',
    domain: 'pass_through_entity_return',
    entityApplicability: PASS_THROUGH_ENTITIES,
    reason: 'Texas pass-through entity coverage is tracked through franchise tax when applicable.',
  },
  {
    jurisdiction: 'TX',
    domain: 'withholding',
    entityApplicability: BUSINESS_EMPLOYER_ENTITIES,
    reason: 'Texas has no state income tax withholding regime.',
  },
  {
    jurisdiction: 'FL',
    domain: 'individual_income_return',
    entityApplicability: ['individual'],
    reason: 'Florida does not impose a state individual income tax.',
  },
  {
    jurisdiction: 'FL',
    domain: 'individual_estimated_tax',
    entityApplicability: ['individual', 'sole_prop'],
    reason: 'Florida does not impose state individual estimated income tax payments.',
  },
  {
    jurisdiction: 'FL',
    domain: 'fiduciary_income_return',
    entityApplicability: ['trust'],
    reason: 'Florida does not impose a state fiduciary income tax return.',
  },
  {
    jurisdiction: 'FL',
    domain: 'business_income_return',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason: 'Florida state business income tax coverage is C corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'FL',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp'],
    reason: 'Florida state business estimated tax coverage is C corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'FL',
    domain: 'pass_through_entity_return',
    entityApplicability: PASS_THROUGH_ENTITIES,
    reason: 'Florida has no general state pass-through entity income return in this matrix scope.',
  },
  {
    jurisdiction: 'FL',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Florida has no separate state franchise or entity tax source in this matrix scope.',
  },
  {
    jurisdiction: 'FL',
    domain: 'withholding',
    entityApplicability: BUSINESS_EMPLOYER_ENTITIES,
    reason: 'Florida has no state income tax withholding regime.',
  },
  {
    jurisdiction: 'WA',
    domain: 'individual_income_return',
    entityApplicability: ['individual'],
    reason: 'Washington does not impose a state individual income tax.',
  },
  {
    jurisdiction: 'WA',
    domain: 'individual_estimated_tax',
    entityApplicability: ['individual', 'sole_prop'],
    reason: 'Washington does not impose state individual estimated income tax payments.',
  },
  {
    jurisdiction: 'WA',
    domain: 'fiduciary_income_return',
    entityApplicability: ['trust'],
    reason: 'Washington does not impose a state fiduciary income tax return.',
  },
  {
    jurisdiction: 'WA',
    domain: 'business_income_return',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Washington business tax coverage is tracked through excise/B&O tax, not income tax.',
  },
  {
    jurisdiction: 'WA',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp', 'c_corp'],
    reason: 'Washington has no state business income estimated tax payment schedule.',
  },
  {
    jurisdiction: 'WA',
    domain: 'pass_through_entity_return',
    entityApplicability: PASS_THROUGH_ENTITIES,
    reason: 'Washington pass-through business tax coverage is tracked through excise/B&O tax.',
  },
  {
    jurisdiction: 'WA',
    domain: 'withholding',
    entityApplicability: BUSINESS_EMPLOYER_ENTITIES,
    reason: 'Washington has no state income tax withholding regime.',
  },
  {
    jurisdiction: 'GA',
    domain: 'franchise_or_entity_tax',
    entityApplicability: ['llc', 'partnership'],
    reason: 'Georgia net worth tax source coverage is corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'MA',
    domain: 'franchise_or_entity_tax',
    entityApplicability: ['llc', 'partnership'],
    reason: 'Massachusetts corporate excise source coverage is corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'PA',
    domain: 'business_income_return',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason:
      'Pennsylvania pass-through business coverage is tracked through the pass-through entity return domain.',
  },
  {
    jurisdiction: 'PA',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp'],
    reason: 'Pennsylvania corporate estimated tax coverage is C corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'PA',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Pennsylvania has no separate franchise or entity tax source in this matrix scope.',
  },
  {
    jurisdiction: 'NC',
    domain: 'business_income_return',
    entityApplicability: ['llc', 'partnership'],
    reason:
      'North Carolina partnership and LLC coverage is tracked through the pass-through entity return domain.',
  },
  {
    jurisdiction: 'NC',
    domain: 'franchise_or_entity_tax',
    entityApplicability: ['llc', 'partnership'],
    reason: 'North Carolina franchise tax source coverage is corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'VA',
    domain: 'business_income_return',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason:
      'Virginia pass-through business coverage is tracked through the pass-through entity return domain.',
  },
  {
    jurisdiction: 'VA',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp'],
    reason: 'Virginia corporate estimated tax coverage is C corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'VA',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Virginia has no separate state franchise or entity tax source in this matrix scope.',
  },
  {
    jurisdiction: 'AZ',
    domain: 'business_income_return',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason:
      'Arizona pass-through business coverage is tracked through the pass-through entity return domain.',
  },
  {
    jurisdiction: 'AZ',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp'],
    reason: 'Arizona corporate estimated tax coverage is C corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'AZ',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Arizona has no separate state franchise or entity tax source in this matrix scope.',
  },
  {
    jurisdiction: 'CO',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Colorado has no separate state franchise or entity tax source in this matrix scope.',
  },
  {
    jurisdiction: 'MI',
    domain: 'business_income_return',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason:
      'Michigan pass-through business coverage is tracked through the pass-through entity return domain.',
  },
  {
    jurisdiction: 'MI',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp'],
    reason: 'Michigan corporate estimated tax coverage is C corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'MI',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Michigan has no separate state franchise or entity tax source in this matrix scope.',
  },
  {
    jurisdiction: 'OH',
    domain: 'business_income_return',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Ohio business entity tax coverage is tracked through commercial activity tax.',
  },
  {
    jurisdiction: 'OH',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp', 'c_corp'],
    reason: 'Ohio has no state business income estimated tax payment schedule.',
  },
  {
    jurisdiction: 'OR',
    domain: 'business_income_return',
    entityApplicability: ['llc', 'partnership'],
    reason:
      'Oregon partnership and LLC coverage is tracked through the pass-through entity return domain.',
  },
  {
    jurisdiction: 'OR',
    domain: 'sales_use_tax',
    entityApplicability: BUSINESS_EMPLOYER_ENTITIES,
    reason: 'Oregon has no state sales and use tax return in this matrix scope.',
  },
  {
    jurisdiction: 'SC',
    domain: 'business_income_return',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason:
      'South Carolina pass-through business coverage is tracked through the pass-through entity return domain.',
  },
  {
    jurisdiction: 'SC',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp'],
    reason:
      'South Carolina corporate estimated tax coverage is C corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'SC',
    domain: 'franchise_or_entity_tax',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason: 'South Carolina corporate license fee source coverage is C corporation scoped.',
  },
  {
    jurisdiction: 'TN',
    domain: 'individual_income_return',
    entityApplicability: ['individual'],
    reason: 'Tennessee no longer imposes a state individual income tax.',
  },
  {
    jurisdiction: 'TN',
    domain: 'individual_estimated_tax',
    entityApplicability: ['individual', 'sole_prop'],
    reason: 'Tennessee no longer imposes state individual estimated income tax payments.',
  },
  {
    jurisdiction: 'TN',
    domain: 'fiduciary_income_return',
    entityApplicability: ['trust'],
    reason: 'Tennessee has no current state fiduciary income tax return in this matrix scope.',
  },
  {
    jurisdiction: 'TN',
    domain: 'pass_through_entity_return',
    entityApplicability: PASS_THROUGH_ENTITIES,
    reason: 'Tennessee pass-through business coverage is tracked through franchise and excise tax.',
  },
  {
    jurisdiction: 'TN',
    domain: 'withholding',
    entityApplicability: BUSINESS_EMPLOYER_ENTITIES,
    reason: 'Tennessee has no state income tax withholding regime.',
  },
  {
    jurisdiction: 'UT',
    domain: 'individual_estimated_tax',
    entityApplicability: ['individual', 'sole_prop'],
    reason:
      'Utah individual income tax prepayments are allowed but not required on a quarterly schedule.',
  },
  {
    jurisdiction: 'UT',
    domain: 'business_income_return',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason:
      'Utah pass-through business coverage is tracked through the pass-through entity return domain.',
  },
  {
    jurisdiction: 'UT',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp'],
    reason: 'Utah corporate estimated tax coverage is C corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'UT',
    domain: 'franchise_or_entity_tax',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason: 'Utah franchise tax source coverage is C corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'WI',
    domain: 'business_income_return',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason:
      'Wisconsin pass-through business coverage is tracked through the pass-through entity return domain.',
  },
  {
    jurisdiction: 'WI',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp'],
    reason: 'Wisconsin corporate estimated tax coverage is C corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'WI',
    domain: 'franchise_or_entity_tax',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason: 'Wisconsin franchise tax source coverage is C corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'AK',
    domain: 'individual_income_return',
    entityApplicability: ['individual'],
    reason: 'Alaska does not impose a state individual income tax.',
  },
  {
    jurisdiction: 'AK',
    domain: 'individual_estimated_tax',
    entityApplicability: ['individual', 'sole_prop'],
    reason: 'Alaska does not impose state individual estimated income tax payments.',
  },
  {
    jurisdiction: 'AK',
    domain: 'fiduciary_income_return',
    entityApplicability: ['trust'],
    reason: 'Alaska does not impose a state fiduciary income tax return.',
  },
  {
    jurisdiction: 'AK',
    domain: 'business_income_return',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason: 'Alaska corporate income tax source coverage is C corporation scoped.',
  },
  {
    jurisdiction: 'AK',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp'],
    reason: 'Alaska corporate estimated tax source coverage is C corporation scoped.',
  },
  {
    jurisdiction: 'AK',
    domain: 'pass_through_entity_return',
    entityApplicability: PASS_THROUGH_ENTITIES,
    reason: 'Alaska has no general state pass-through entity income return in this matrix scope.',
  },
  {
    jurisdiction: 'AK',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Alaska has no separate state franchise or entity tax source in this matrix scope.',
  },
  {
    jurisdiction: 'AK',
    domain: 'sales_use_tax',
    entityApplicability: BUSINESS_EMPLOYER_ENTITIES,
    reason: 'Alaska has no statewide sales and use tax return in this matrix scope.',
  },
  {
    jurisdiction: 'AK',
    domain: 'withholding',
    entityApplicability: BUSINESS_EMPLOYER_ENTITIES,
    reason: 'Alaska has no state income tax withholding regime.',
  },
  {
    jurisdiction: 'AR',
    domain: 'business_income_return',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason:
      'Arkansas pass-through business coverage is tracked through the pass-through entity return domain.',
  },
  {
    jurisdiction: 'AR',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp'],
    reason: 'Arkansas corporate estimated tax coverage is C corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'AR',
    domain: 'franchise_or_entity_tax',
    entityApplicability: ['partnership'],
    reason: 'Arkansas franchise tax source coverage is corporation and LLC scoped in this matrix.',
  },
  {
    jurisdiction: 'CT',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason:
      'Connecticut has no separate state franchise or entity tax source in this matrix scope.',
  },
  {
    jurisdiction: 'DE',
    domain: 'sales_use_tax',
    entityApplicability: BUSINESS_EMPLOYER_ENTITIES,
    reason: 'Delaware does not impose a state or local sales tax.',
  },
  {
    jurisdiction: 'HI',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Hawaii has no separate state franchise or entity tax source in this matrix scope.',
  },
  {
    jurisdiction: 'ID',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Idaho has no separate state franchise or entity tax source in this matrix scope.',
  },
  {
    jurisdiction: 'IN',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Indiana has no separate state franchise or entity tax source in this matrix scope.',
  },
  {
    jurisdiction: 'IA',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Iowa has no general franchise or entity tax source for the matrix entity set.',
  },
  {
    jurisdiction: 'KS',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Kansas has no general franchise or entity tax source for the matrix entity set.',
  },
  {
    jurisdiction: 'ME',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Maine franchise tax is not a general matrix entity tax for this source pack.',
  },
  {
    jurisdiction: 'MD',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Maryland has no separate state franchise or entity tax source in this matrix scope.',
  },
  {
    jurisdiction: 'MN',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Minnesota has no separate state franchise or entity tax source in this matrix scope.',
  },
  {
    jurisdiction: 'MS',
    domain: 'business_income_return',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason:
      'Mississippi pass-through business coverage is tracked through the pass-through entity return domain.',
  },
  {
    jurisdiction: 'MS',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp'],
    reason: 'Mississippi corporate estimated tax coverage is C corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'MS',
    domain: 'franchise_or_entity_tax',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason: 'Mississippi franchise tax source coverage is C corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'MO',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Missouri corporation franchise tax is repealed for current matrix years.',
  },
  {
    jurisdiction: 'MT',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Montana has no separate state franchise or entity tax source in this matrix scope.',
  },
  {
    jurisdiction: 'MT',
    domain: 'sales_use_tax',
    entityApplicability: BUSINESS_EMPLOYER_ENTITIES,
    reason: 'Montana has no statewide sales and use tax return in this matrix scope.',
  },
  {
    jurisdiction: 'NE',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Nebraska has no separate state franchise or entity tax source in this matrix scope.',
  },
  {
    jurisdiction: 'NV',
    domain: 'individual_income_return',
    entityApplicability: ['individual'],
    reason: 'Nevada does not impose a state individual income tax.',
  },
  {
    jurisdiction: 'NV',
    domain: 'individual_estimated_tax',
    entityApplicability: ['individual', 'sole_prop'],
    reason: 'Nevada does not impose state individual estimated income tax payments.',
  },
  {
    jurisdiction: 'NV',
    domain: 'fiduciary_income_return',
    entityApplicability: ['trust'],
    reason: 'Nevada does not impose a state fiduciary income tax return.',
  },
  {
    jurisdiction: 'NV',
    domain: 'business_income_return',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Nevada business entity tax coverage is tracked through commerce tax, not income tax.',
  },
  {
    jurisdiction: 'NV',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp', 'c_corp'],
    reason: 'Nevada has no state business income estimated tax payment schedule.',
  },
  {
    jurisdiction: 'NV',
    domain: 'pass_through_entity_return',
    entityApplicability: PASS_THROUGH_ENTITIES,
    reason: 'Nevada has no general state pass-through entity income return in this matrix scope.',
  },
  {
    jurisdiction: 'NV',
    domain: 'withholding',
    entityApplicability: BUSINESS_EMPLOYER_ENTITIES,
    reason: 'Nevada has no state income tax withholding regime.',
  },
  {
    jurisdiction: 'NH',
    domain: 'individual_income_return',
    entityApplicability: ['individual'],
    reason: 'New Hampshire interest and dividends tax is repealed for current matrix years.',
  },
  {
    jurisdiction: 'NH',
    domain: 'individual_estimated_tax',
    entityApplicability: ['individual', 'sole_prop'],
    reason: 'New Hampshire has no current state individual estimated income tax payment schedule.',
  },
  {
    jurisdiction: 'NH',
    domain: 'fiduciary_income_return',
    entityApplicability: ['trust'],
    reason: 'New Hampshire has no current state fiduciary income tax return in this matrix scope.',
  },
  {
    jurisdiction: 'NH',
    domain: 'sales_use_tax',
    entityApplicability: BUSINESS_EMPLOYER_ENTITIES,
    reason: 'New Hampshire has no statewide sales and use tax return in this matrix scope.',
  },
  {
    jurisdiction: 'NH',
    domain: 'withholding',
    entityApplicability: BUSINESS_EMPLOYER_ENTITIES,
    reason: 'New Hampshire has no state income tax withholding regime.',
  },
  {
    jurisdiction: 'NM',
    domain: 'business_income_return',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason:
      'New Mexico pass-through business coverage is tracked through the pass-through entity return domain.',
  },
  {
    jurisdiction: 'NM',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp'],
    reason: 'New Mexico corporate estimated tax coverage is C corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'NM',
    domain: 'franchise_or_entity_tax',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason: 'New Mexico franchise tax source coverage is C corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'ND',
    domain: 'business_income_return',
    entityApplicability: ['llc', 'partnership', 's_corp'],
    reason:
      'North Dakota pass-through business coverage is tracked through the pass-through entity return domain.',
  },
  {
    jurisdiction: 'ND',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp'],
    reason: 'North Dakota corporate estimated tax coverage is C corporation scoped in this matrix.',
  },
  {
    jurisdiction: 'ND',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason:
      'North Dakota has no separate state franchise or entity tax source in this matrix scope.',
  },
  {
    jurisdiction: 'OK',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Oklahoma franchise tax filing is ended for current matrix years.',
  },
  {
    jurisdiction: 'SD',
    domain: 'individual_income_return',
    entityApplicability: ['individual'],
    reason: 'South Dakota does not impose a state individual income tax.',
  },
  {
    jurisdiction: 'SD',
    domain: 'individual_estimated_tax',
    entityApplicability: ['individual', 'sole_prop'],
    reason: 'South Dakota does not impose state individual estimated income tax payments.',
  },
  {
    jurisdiction: 'SD',
    domain: 'fiduciary_income_return',
    entityApplicability: ['trust'],
    reason: 'South Dakota does not impose a state fiduciary income tax return.',
  },
  {
    jurisdiction: 'SD',
    domain: 'business_income_return',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'South Dakota has no general state business income tax return in this matrix scope.',
  },
  {
    jurisdiction: 'SD',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp', 'c_corp'],
    reason: 'South Dakota has no state business income estimated tax payment schedule.',
  },
  {
    jurisdiction: 'SD',
    domain: 'pass_through_entity_return',
    entityApplicability: PASS_THROUGH_ENTITIES,
    reason: 'South Dakota has no general state pass-through entity income return in this scope.',
  },
  {
    jurisdiction: 'SD',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'South Dakota has no general state franchise or entity tax source in this scope.',
  },
  {
    jurisdiction: 'SD',
    domain: 'withholding',
    entityApplicability: BUSINESS_EMPLOYER_ENTITIES,
    reason: 'South Dakota has no state income tax withholding regime.',
  },
  {
    jurisdiction: 'VT',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Vermont has no separate state franchise or entity tax source in this matrix scope.',
  },
  {
    jurisdiction: 'WV',
    domain: 'franchise_or_entity_tax',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'West Virginia business franchise tax is repealed for current matrix years.',
  },
  {
    jurisdiction: 'WY',
    domain: 'individual_income_return',
    entityApplicability: ['individual'],
    reason: 'Wyoming does not impose a state individual income tax.',
  },
  {
    jurisdiction: 'WY',
    domain: 'individual_estimated_tax',
    entityApplicability: ['individual', 'sole_prop'],
    reason: 'Wyoming does not impose state individual estimated income tax payments.',
  },
  {
    jurisdiction: 'WY',
    domain: 'fiduciary_income_return',
    entityApplicability: ['trust'],
    reason: 'Wyoming does not impose a state fiduciary income tax return.',
  },
  {
    jurisdiction: 'WY',
    domain: 'business_income_return',
    entityApplicability: BUSINESS_RETURN_ENTITIES,
    reason: 'Wyoming has no general state business income tax return in this matrix scope.',
  },
  {
    jurisdiction: 'WY',
    domain: 'business_estimated_tax',
    entityApplicability: ['s_corp', 'c_corp'],
    reason: 'Wyoming has no state business income estimated tax payment schedule.',
  },
  {
    jurisdiction: 'WY',
    domain: 'pass_through_entity_return',
    entityApplicability: PASS_THROUGH_ENTITIES,
    reason: 'Wyoming has no general state pass-through entity income return in this scope.',
  },
  {
    jurisdiction: 'WY',
    domain: 'withholding',
    entityApplicability: BUSINESS_EMPLOYER_ENTITIES,
    reason: 'Wyoming has no state income tax withholding regime.',
  },
] as const satisfies readonly SourceCoverageNotApplicableCell[]

function sourceCoverageNotApplicable(
  jurisdiction: RuleJurisdiction,
  domain: StateCandidateRuleSlug,
  entity: RuleSourceCoverageEntity,
): boolean {
  return STATE_SOURCE_COVERAGE_NOT_APPLICABLE.some(
    (cell) =>
      cell.jurisdiction === jurisdiction &&
      cell.domain === domain &&
      (cell.entityApplicability as readonly RuleSourceCoverageEntity[]).includes(entity),
  )
}

function requiredEntitiesForCandidateDomain(
  jurisdiction: RuleJurisdiction,
  domain: StateCandidateRuleDomain,
): readonly RuleSourceCoverageEntity[] {
  return domain.entityApplicability.filter(
    (entity): entity is RuleSourceCoverageEntity =>
      entity !== 'any_business' && !sourceCoverageNotApplicable(jurisdiction, domain.slug, entity),
  )
}

function sourceCoversEntity(
  source: Pick<RuleSource, 'entityApplicability'>,
  entity: EntityApplicability,
): boolean {
  if (source.entityApplicability.includes(entity)) return true
  if (!source.entityApplicability.includes('any_business')) return false
  return entity !== 'individual' && entity !== 'trust'
}

function sourceCoversCandidateDomain(
  source: RuleSource,
  jurisdiction: RuleJurisdiction,
  domain: StateCandidateRuleDomain,
): boolean {
  if (!source.domains.includes(domain.slug)) return false
  const requiredEntities = requiredEntitiesForCandidateDomain(jurisdiction, domain)
  if (requiredEntities.length === 0) return false
  return requiredEntities.every((entity) => sourceCoversEntity(source, entity))
}

function sourceBasisRank(source: RuleSource): number {
  if (source.sourceType === 'due_dates' || source.sourceType === 'calendar') return 3
  if (source.authorityRole === 'basis') return 2
  if (source.priority === 'critical' || source.priority === 'high') return 1
  return 0
}

function sourceIdForStateCandidateRule(
  seed: (typeof STATE_RULE_SOURCE_SEEDS)[number],
  domain: StateCandidateRuleDomain,
): string | null {
  const matches = RULE_SOURCES.filter(
    (source) =>
      source.jurisdiction === seed.jurisdiction &&
      sourceCoversCandidateDomain(source, seed.jurisdiction, domain),
  )
  return (
    matches.toSorted((left, right) => sourceBasisRank(right) - sourceBasisRank(left))[0]?.id ?? null
  )
}

function buildStateCandidateRule(
  seed: (typeof STATE_RULE_SOURCE_SEEDS)[number],
  domain: StateCandidateRuleDomain,
): ObligationRule | null {
  const entityApplicability = requiredEntitiesForCandidateDomain(seed.jurisdiction, domain)
  if (entityApplicability.length === 0) return null
  const sourceId = sourceIdForStateCandidateRule(seed, domain)
  if (!sourceId) return null
  const sourceExcerpt =
    STATE_CANDIDATE_SOURCE_EXCERPTS[`${seed.jurisdiction}:${domain.slug}`] ??
    SOURCE_EXCERPTS[sourceId] ??
    `${seed.name} official source registered for ${domain.title}; templates require practice owner or manager acceptance before customer reminders.`

  return {
    id: `${seed.jurisdiction.toLowerCase()}.${domain.slug}.candidate.2026`,
    title: `${seed.name} ${domain.title}`,
    jurisdiction: seed.jurisdiction,
    entityApplicability,
    taxType: `${seed.jurisdiction.toLowerCase()}_${domain.taxType}`,
    formName: domain.formName,
    eventType: domain.eventType,
    isFiling: domain.isFiling,
    isPayment: domain.isPayment,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'applicability_review',
    status: 'candidate',
    coverageStatus: 'manual',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'source_defined_calendar',
      description: `${seed.name} ${domain.title} requires official-source review before a concrete deadline can be accepted.`,
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'Pending official-source review; do not assume filing or payment extension behavior.',
    },
    sourceIds: [sourceId],
    evidence: [
      sourceEvidence(sourceId, domain.formName, domain.reviewReason, {
        authorityRole: 'watch',
        sourceExcerpt,
      }),
    ],
    defaultTip: domain.reviewReason,
    quality: PENDING_REVIEW_QUALITY,
    verifiedBy: 'practice.owner_or_manager_required',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  }
}

const LOCAL_CANDIDATE_RULE_PACKS = [
  { jurisdiction: 'MD', sourceId: 'md.local_income_tax', name: 'Maryland local income tax' },
  { jurisdiction: 'IN', sourceId: 'in.local_county_income_tax', name: 'Indiana county LIT' },
  { jurisdiction: 'NY', sourceId: 'ny.nyc_yonkers_income_tax', name: 'NYC and Yonkers income tax' },
  {
    jurisdiction: 'PA',
    sourceId: 'pa.local_eit_lit_psd',
    name: 'Pennsylvania local earned income tax',
  },
  {
    jurisdiction: 'PA',
    sourceId: 'pa.local_eit_act32_employer_withholding',
    name: 'Pennsylvania Act 32 local EIT withholding',
  },
  {
    jurisdiction: 'PA',
    sourceId: 'pa.local_services_tax',
    name: 'Pennsylvania local services tax',
  },
  {
    jurisdiction: 'OH',
    sourceId: 'oh.municipal_income_tax_annual_return',
    name: 'Ohio municipal income tax',
  },
  {
    jurisdiction: 'OH',
    sourceId: 'oh.municipal_net_profit_filing',
    name: 'Ohio municipal net profit tax',
  },
] as const satisfies readonly {
  jurisdiction: RuleGenerationState
  sourceId: string
  name: string
}[]

function buildLocalCandidateRule(
  pack: (typeof LOCAL_CANDIDATE_RULE_PACKS)[number],
  domain: LocalCandidateRuleDomain,
): ObligationRule | null {
  const source = RULE_SOURCES.find((item) => item.id === pack.sourceId)
  if (!source?.localJurisdiction) return null
  if (!source.domains.includes(domain.slug)) return null

  const entityApplicability = domain.entityApplicability.filter((entity) =>
    sourceCoversEntity(source, entity),
  )
  if (entityApplicability.length === 0) return null

  const sourceExcerpt =
    SOURCE_EXCERPTS[source.id] ??
    `${source.title} is registered as an official local-income source; practice review is required before any obligation can be generated.`
  const localFactRequirements = Array.from(
    new Set([...(source.localFactRequirements ?? []), ...domain.localFactRequirements]),
  )

  return {
    id: `${pack.jurisdiction.toLowerCase()}.${domain.slug}.candidate.2026`,
    title: `${pack.name} ${domain.title}`,
    jurisdiction: pack.jurisdiction,
    localJurisdiction: source.localJurisdiction,
    localFactRequirements,
    entityApplicability,
    taxType: `${pack.jurisdiction.toLowerCase()}_${domain.taxType}`,
    formName: domain.formName,
    eventType: domain.eventType,
    isFiling: domain.isFiling,
    isPayment: domain.isPayment,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'applicability_review',
    status: 'candidate',
    coverageStatus: 'manual',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'source_defined_calendar',
      description: `${pack.name} requires local fact and collector review before a concrete due date can be accepted.`,
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes:
        'Pending local applicability review; do not assume state-return or local-return extension behavior.',
    },
    sourceIds: [source.id],
    evidence: [
      sourceEvidence(source.id, domain.formName, domain.reviewReason, {
        authorityRole: 'basis',
        sourceExcerpt,
      }),
    ],
    defaultTip: domain.reviewReason,
    quality: PENDING_REVIEW_QUALITY,
    verifiedBy: 'practice.owner_or_manager_required',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  }
}

export const STATE_CANDIDATE_RULES = STATE_RULE_SOURCE_SEEDS.flatMap((seed) =>
  STATE_CANDIDATE_RULE_DOMAINS.flatMap((domain) => {
    const rule = buildStateCandidateRule(seed, domain)
    return rule ? [rule] : []
  }),
)

export const LOCAL_CANDIDATE_RULES = LOCAL_CANDIDATE_RULE_PACKS.flatMap((pack) =>
  LOCAL_CANDIDATE_RULE_DOMAINS.flatMap((domain) => {
    const rule = buildLocalCandidateRule(pack, domain)
    return rule ? [rule] : []
  }),
)

export const OBLIGATION_RULES: readonly ObligationRule[] = [
  ...STATE_CANDIDATE_RULES,
  ...LOCAL_CANDIDATE_RULES,
  {
    id: 'fed.1040.return.2025',
    title: 'Federal Form 1040 individual income tax return',
    jurisdiction: 'FED',
    entityApplicability: ['individual', 'sole_prop'],
    taxType: 'federal_1040',
    formName: 'Form 1040',
    eventType: 'filing',
    obligationType: 'filing',
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
      kind: 'fixed_date',
      date: '2026-04-15',
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      formName: 'Form 4868',
      durationMonths: 6,
      paymentExtended: false,
      notes:
        'Form 4868 extends filing time only; tax payment remains due by the original due date.',
    },
    sourceIds: ['fed.irs_when_to_file_individuals_2026', 'fed.irs_pub_509_2026'],
    evidence: [
      sourceEvidence(
        'fed.irs_when_to_file_individuals_2026',
        'File on',
        'IRS lists the 2026 individual filing date and extension/payment distinction.',
      ),
      sourceEvidence(
        'fed.irs_pub_509_2026',
        'Individuals',
        'Publication 509 is the IRS tax calendar source for filing and paying actions.',
      ),
    ],
    defaultTip: 'Track Form 1040 filing separately from payment and Form 4868 extension work.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.1040.extension.2025',
    title: 'Federal Form 4868 individual extension request',
    jurisdiction: 'FED',
    entityApplicability: ['individual', 'sole_prop'],
    taxType: 'federal_1040_extension',
    formName: 'Form 4868',
    eventType: 'extension',
    obligationType: 'client_action',
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
      kind: 'fixed_date',
      date: '2026-04-15',
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      formName: 'Form 4868',
      durationMonths: 6,
      paymentExtended: false,
      notes: 'Extension request due by the original return date; payment is still due April 15.',
    },
    sourceIds: ['fed.irs_when_to_file_individuals_2026'],
    evidence: [
      sourceEvidence(
        'fed.irs_when_to_file_individuals_2026',
        'Extension of time to file',
        'IRS states that Form 4868 is due by the original due date and does not extend payment.',
      ),
    ],
    defaultTip: 'Use this as the client-action control for filing Form 4868.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.1040.estimated_tax.2026',
    title: 'Federal individual estimated tax payments',
    jurisdiction: 'FED',
    entityApplicability: ['individual', 'sole_prop'],
    taxType: 'federal_1040_estimated_tax',
    formName: 'Form 1040-ES',
    eventType: 'payment',
    obligationType: 'payment',
    isFiling: false,
    isPayment: true,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'annual_rolling',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'period_table',
      frequency: 'quarterly',
      periods: [
        { period: 'Q1', dueDate: '2026-04-15' },
        { period: 'Q2', dueDate: '2026-06-15' },
        { period: 'Q3', dueDate: '2026-09-15' },
        { period: 'Q4', dueDate: '2027-01-15' },
      ],
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes:
        'Estimated tax installments are payment obligations and are not extended by Form 4868.',
    },
    sourceIds: ['fed.irs_pub_509_2026'],
    evidence: [
      sourceEvidence(
        'fed.irs_pub_509_2026',
        'Individuals / estimated tax',
        'Publication 509 provides the individual estimated tax calendar.',
      ),
    ],
    defaultTip:
      'Estimated tax is a payment workflow; require preparer review before amount reminders.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.1041.return.2025',
    title: 'Federal Form 1041 fiduciary income tax return',
    jurisdiction: 'FED',
    entityApplicability: ['trust'],
    taxType: 'federal_1041',
    formName: 'Form 1041',
    eventType: 'filing',
    obligationType: 'filing',
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
      monthOffset: 4,
      day: 15,
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      formName: 'Form 7004',
      durationMonths: 5.5,
      paymentExtended: false,
      notes:
        'Form 1041 has a 5.5-month filing extension; interest applies to tax not paid by the due date.',
    },
    sourceIds: ['fed.irs_i1041_2025', 'fed.irs_i7004_2025'],
    evidence: [
      sourceEvidence(
        'fed.irs_i1041_2025',
        'When To File',
        'Instructions specify calendar-year and fiscal-year due dates for Form 1041 and K-1s.',
      ),
      sourceEvidence(
        'fed.irs_i7004_2025',
        'Extension Period',
        'Form 7004 instructions identify the 5.5-month extension for Form 1041.',
      ),
    ],
    defaultTip: 'Do not reuse the 1040 or 1120 extension length for Form 1041.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.7004.extension.1041.2025',
    title: 'Federal Form 7004 extension for Form 1041',
    jurisdiction: 'FED',
    entityApplicability: ['trust'],
    taxType: 'federal_7004',
    formName: 'Form 7004',
    eventType: 'extension',
    obligationType: 'client_action',
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
      monthOffset: 4,
      day: 15,
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      formName: 'Form 7004',
      durationMonths: 5.5,
      paymentExtended: false,
      notes: 'Form 7004 must be filed by the Form 1041 due date; tax payment is not extended.',
    },
    sourceIds: ['fed.irs_i1041_2025', 'fed.irs_i7004_2025'],
    evidence: [
      sourceEvidence(
        'fed.irs_i1041_2025',
        'When To File',
        'Form 1041 instructions provide the trust and estate filing deadline.',
      ),
      sourceEvidence(
        'fed.irs_i7004_2025',
        'When To File / Extension Period',
        'Form 7004 instructions require filing by the return due date and identify the 5.5-month Form 1041 extension.',
      ),
    ],
    defaultTip: 'File Form 7004 by the Form 1041 due date; payment remains due on time.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.7004.extension.1065.2025',
    title: 'Federal Form 7004 extension for Form 1065',
    jurisdiction: 'FED',
    entityApplicability: ['partnership', 'llc'],
    taxType: 'federal_7004',
    formName: 'Form 7004',
    eventType: 'extension',
    obligationType: 'client_action',
    isFiling: true,
    isPayment: false,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'applicability_review',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
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
      notes:
        'Form 7004 must be filed by the Form 1065 due date; payment obligations, if any, are not extended.',
    },
    sourceIds: ['fed.irs_i1065_2025', 'fed.irs_i7004_2025'],
    evidence: [
      sourceEvidence(
        'fed.irs_i1065_2025',
        'When To File',
        'Form 1065 instructions provide the partnership filing deadline.',
      ),
      sourceEvidence(
        'fed.irs_i7004_2025',
        'When To File',
        'Form 7004 must be filed by the applicable return due date.',
      ),
    ],
    defaultTip: 'Confirm LLC federal classification before using the Form 1065 extension rule.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.7004.extension.1120s.2025',
    title: 'Federal Form 7004 extension for Form 1120-S',
    jurisdiction: 'FED',
    entityApplicability: ['s_corp'],
    taxType: 'federal_7004',
    formName: 'Form 7004',
    eventType: 'extension',
    obligationType: 'client_action',
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
      notes: 'Form 7004 must be filed by the Form 1120-S due date; tax payment is not extended.',
    },
    sourceIds: ['fed.irs_i1120s_2025', 'fed.irs_i7004_2025'],
    evidence: [
      sourceEvidence(
        'fed.irs_i1120s_2025',
        'When To File',
        'Form 1120-S instructions provide the S corporation filing deadline.',
      ),
      sourceEvidence(
        'fed.irs_i7004_2025',
        'When To File / Extension Period',
        'Form 7004 instructions require filing by the return due date and generally provide a 6-month automatic extension.',
      ),
    ],
    defaultTip: 'File Form 7004 by the Form 1120-S due date; payment remains due on time.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.7004.extension.1120.2025',
    title: 'Federal Form 7004 extension for Form 1120',
    jurisdiction: 'FED',
    entityApplicability: ['c_corp'],
    taxType: 'federal_7004',
    formName: 'Form 7004',
    eventType: 'extension',
    obligationType: 'client_action',
    isFiling: true,
    isPayment: false,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'applicability_review',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'nth_day_after_tax_year_end',
      monthOffset: 4,
      day: 15,
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      formName: 'Form 7004',
      durationMonths: 6,
      paymentExtended: false,
      notes:
        'Form 7004 must be filed by the Form 1120 due date; June-year-end corporation exceptions require review.',
    },
    sourceIds: ['fed.irs_i1120_2025', 'fed.irs_i7004_2025'],
    evidence: [
      sourceEvidence(
        'fed.irs_i1120_2025',
        'When To File',
        'Form 1120 instructions provide the corporation filing deadline.',
      ),
      sourceEvidence(
        'fed.irs_i7004_2025',
        'When To File / Extension Period',
        'Form 7004 instructions require filing by the return due date and call out June-year-end corporation exceptions.',
      ),
    ],
    defaultTip:
      'Review June-year-end corporation exceptions before relying on the standard Form 7004 extension.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.941.return.2026',
    title: 'Federal Form 941 quarterly payroll tax return',
    jurisdiction: 'FED',
    entityApplicability: ['any_business'],
    taxType: 'federal_941',
    formName: 'Form 941',
    eventType: 'filing',
    obligationType: 'filing',
    isFiling: true,
    isPayment: false,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'annual_rolling',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'high',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'period_table',
      frequency: 'quarterly',
      periods: [
        { period: 'Q1', dueDate: '2026-04-30' },
        { period: 'Q2', dueDate: '2026-07-31' },
        { period: 'Q3', dueDate: '2026-11-02' },
        { period: 'Q4', dueDate: '2027-02-01' },
      ],
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'Form 941 is a return filing obligation; payroll deposits follow separate schedules.',
    },
    sourceIds: ['fed.irs_i941_2026', 'fed.irs_pub_509_2026'],
    evidence: [
      sourceEvidence(
        'fed.irs_i941_2026',
        'When To File',
        'Form 941 instructions list the quarter-end and return due-date table.',
      ),
    ],
    defaultTip: 'Keep Form 941 return filing separate from monthly or semiweekly payroll deposits.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.payroll_deposit.monthly.2026',
    title: 'Federal payroll tax monthly deposit schedule',
    jurisdiction: 'FED',
    entityApplicability: ['any_business'],
    taxType: 'federal_payroll_deposit_monthly',
    formName: 'Payroll tax deposit',
    eventType: 'deposit',
    obligationType: 'deposit',
    isFiling: false,
    isPayment: true,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'applicability_review',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'high',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'source_defined_calendar',
      description: 'Monthly and semiweekly payroll deposit schedules depend on employer facts.',
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'Deposit schedules are not return filing deadlines.',
    },
    sourceIds: ['fed.irs_pub_15_2026', 'fed.irs_pub_509_2026'],
    evidence: [
      sourceEvidence(
        'fed.irs_pub_15_2026',
        'Monthly Deposit Schedule',
        'Publication 15 defines monthly employment tax deposit timing and business-day rollover.',
        {
          sourceExcerpt: [
            'Under the monthly deposit schedule, deposit employment taxes on payments made during a month by the 15th day of the following month.',
            'If a deposit is required to be made on a day that is not a business day, the deposit is considered timely if it is made by the close of the next business day.',
            'For 2026 monthly payroll deposits: January wages are due February 17, February wages are due March 16, March wages are due April 15, April wages are due May 15, May wages are due June 15, June wages are due July 15, July wages are due August 17, August wages are due September 15, September wages are due October 15, October wages are due November 16, November wages are due December 15, and December wages are due January 15, 2027.',
          ].join('\n'),
        },
      ),
      sourceEvidence(
        'fed.irs_pub_509_2026',
        'Employer tax calendar',
        'Publication 509 says the employer calendar is used with Pub. 15, which gives the deposit rules.',
      ),
    ],
    defaultTip: 'Configure monthly or semiweekly deposits separately from Form 941.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.1099_nec.2025',
    title: 'Federal Form 1099-NEC information return',
    jurisdiction: 'FED',
    entityApplicability: ['any_business'],
    taxType: 'federal_1099_nec',
    formName: 'Form 1099-NEC',
    eventType: 'information_report',
    obligationType: 'information',
    isFiling: true,
    isPayment: false,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'annual_rolling',
    status: 'verified',
    coverageStatus: 'full',
    riskLevel: 'high',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'fixed_date',
      date: '2026-02-02',
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: true,
      formName: 'Form 8809',
      paymentExtended: false,
      notes:
        '1099-NEC filing is an information reporting workflow; recipient and IRS filing are tracked together for the basic workflow.',
    },
    sourceIds: ['fed.irs_information_return_reporting', 'fed.irs_p1099_2026'],
    evidence: [
      sourceEvidence(
        'fed.irs_information_return_reporting',
        'Form 1099-NEC',
        'IRS guidance sets the Form 1099-NEC deadline for nonemployee compensation.',
      ),
    ],
    defaultTip: 'Collect W-9s, validate TIN/name, furnish recipients, and file with IRS.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.1099_misc.2025',
    title: 'Federal Form 1099-MISC information return',
    jurisdiction: 'FED',
    entityApplicability: ['any_business'],
    taxType: 'federal_1099_misc',
    formName: 'Form 1099-MISC',
    eventType: 'information_report',
    obligationType: 'information',
    isFiling: true,
    isPayment: false,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'annual_rolling',
    status: 'verified',
    coverageStatus: 'full',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'fixed_date',
      date: '2026-03-31',
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: true,
      formName: 'Form 8809',
      paymentExtended: false,
      notes:
        'March 31 is the electronic IRS filing date; paper filers are due March 2, 2026, and most recipient statements are due February 2, 2026.',
    },
    sourceIds: ['fed.irs_information_return_reporting', 'fed.irs_p1099_2026'],
    evidence: [
      sourceEvidence(
        'fed.irs_information_return_reporting',
        'Form 1099-MISC',
        'IRS guidance sets the Form 1099-MISC IRS filing deadline for miscellaneous information reporting.',
        {
          sourceExcerpt:
            'File Form 1099-MISC with the IRS by February 28 if filing on paper, or March 31 if filing electronically; furnish most recipient statements by January 31.',
        },
      ),
    ],
    defaultTip:
      'Recipient copies ship with the January 1099-NEC batch; the IRS e-file deadline is March 31.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.940.return.2025',
    title: 'Federal Form 940 annual FUTA return',
    jurisdiction: 'FED',
    entityApplicability: ['any_business'],
    taxType: 'federal_940',
    formName: 'Form 940',
    eventType: 'filing',
    obligationType: 'filing',
    isFiling: true,
    isPayment: false,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'annual_rolling',
    status: 'verified',
    coverageStatus: 'full',
    riskLevel: 'high',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'fixed_date',
      date: '2026-02-02',
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes:
        'No extension form exists for Form 940; employers that deposited all FUTA tax when due may file by February 10.',
    },
    sourceIds: ['fed.irs_i940_2026', 'fed.irs_pub_509_2026'],
    evidence: [
      sourceEvidence(
        'fed.irs_i940_2026',
        'When Must You File Form 940?',
        'Form 940 instructions set the January 31 due date with the February 10 timely-deposit exception.',
      ),
    ],
    defaultTip:
      'Track the annual FUTA return separately from quarterly Form 941 filings; February 10 applies only when every deposit was timely.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.w2.filing.2025',
    title: 'Federal Forms W-2 and W-3 wage statement filing',
    jurisdiction: 'FED',
    entityApplicability: ['any_business'],
    taxType: 'federal_w2_w3',
    formName: 'Form W-2 / W-3',
    eventType: 'information_report',
    obligationType: 'information',
    isFiling: true,
    isPayment: false,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'annual_rolling',
    status: 'verified',
    coverageStatus: 'full',
    riskLevel: 'high',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'fixed_date',
      date: '2026-02-02',
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes:
        'Form 8809 extensions for Forms W-2 are not automatic and are granted only in extraordinary circumstances; treat January 31 as firm.',
    },
    sourceIds: ['fed.irs_iw2w3_2026', 'fed.irs_pub_509_2026'],
    evidence: [
      sourceEvidence(
        'fed.irs_iw2w3_2026',
        'When to file',
        'W-2/W-3 instructions set the January 31 SSA filing and employee furnishing deadline.',
      ),
    ],
    defaultTip:
      'SSA filing and employee copies share the January 31 deadline; reconcile Form W-3 totals against the four 941 returns.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.709.gift.2025',
    title: 'Federal Form 709 gift tax return',
    jurisdiction: 'FED',
    entityApplicability: ['individual'],
    taxType: 'federal_709',
    formName: 'Form 709',
    eventType: 'filing',
    obligationType: 'filing',
    isFiling: true,
    isPayment: false,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'applicability_review',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'fixed_date',
      date: '2026-04-15',
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      formName: 'Form 8892',
      durationMonths: 6,
      paymentExtended: false,
      notes:
        'A Form 4868 income tax extension also extends Form 709; Form 8892 extends Form 709 when no income tax extension is filed.',
    },
    sourceIds: ['fed.irs_i709_2025'],
    evidence: [
      sourceEvidence(
        'fed.irs_i709_2025',
        'When To File',
        'Form 709 instructions set the April 15 due date and the extension interaction with the donor income tax return.',
      ),
    ],
    defaultTip:
      'Confirm a Form 709 is actually required (gifts above the annual exclusion or split gifts) before relying on this deadline.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.5500.return.2025',
    title: 'Federal Form 5500 employee benefit plan return',
    jurisdiction: 'FED',
    entityApplicability: ['any_business'],
    taxType: 'federal_5500',
    formName: 'Form 5500',
    eventType: 'filing',
    obligationType: 'information',
    isFiling: true,
    isPayment: false,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'applicability_review',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'nth_day_after_tax_year_end',
      monthOffset: 7,
      day: 31,
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      formName: 'Form 5558',
      paymentExtended: false,
      notes:
        'Form 5558 extends the Form 5500 series by 2 1/2 months; this rule assumes the plan year matches the client tax year.',
    },
    sourceIds: ['fed.irs_5500_corner'],
    evidence: [
      sourceEvidence(
        'fed.irs_5500_corner',
        'Form 5500 filing deadline',
        'IRS Form 5500 Corner states the last-day-of-7th-month deadline and the Form 5558 extension.',
      ),
    ],
    defaultTip:
      'Calendar-year plans are due July 31; confirm the plan year and which 5500 variant (5500, 5500-SF, 5500-EZ) applies.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.fbar.automatic_extension.2025',
    title: 'FBAR automatic extended filing control',
    jurisdiction: 'FED',
    entityApplicability: ['individual', 'any_business'],
    taxType: 'federal_fbar',
    formName: 'FinCEN Form 114',
    eventType: 'filing',
    obligationType: 'information',
    isFiling: true,
    isPayment: false,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'basic',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'high',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'fixed_date',
      date: '2026-10-15',
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: true,
      durationMonths: 6,
      paymentExtended: false,
      notes:
        'FBAR receives an automatic extension to October 15; no separate extension filing is required.',
    },
    sourceIds: ['fed.fincen_fbar_due_date'],
    evidence: [
      sourceEvidence(
        'fed.fincen_fbar_due_date',
        'Due Date for FBARs',
        'FinCEN grants automatic extension from April 15 to October 15.',
      ),
    ],
    defaultTip:
      'Mark as high-risk information reporting and track the automatic October 15 deadline.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.990.return.2025',
    title: 'Federal exempt organization annual return',
    jurisdiction: 'FED',
    entityApplicability: ['any_business'],
    taxType: 'federal_990',
    formName: 'Form 990 / 990-EZ / 990-N / 990-PF',
    eventType: 'filing',
    obligationType: 'filing',
    isFiling: true,
    isPayment: false,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'applicability_review',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'nth_day_after_tax_year_end',
      monthOffset: 5,
      day: 15,
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      formName: 'Form 8868',
      durationMonths: 6,
      paymentExtended: false,
      notes: 'Form 8868 can extend most 990-series returns, but not Form 990-N.',
    },
    sourceIds: ['fed.irs_990_due_date', 'fed.irs_i8868_2026'],
    evidence: [
      sourceEvidence(
        'fed.irs_990_due_date',
        'Annual exempt organization return',
        'IRS states the annual exempt organization return due-date rule.',
      ),
      sourceEvidence(
        'fed.irs_i8868_2026',
        'Form 990-N',
        'Instructions state Form 8868 cannot extend Form 990-N.',
      ),
    ],
    defaultTip: 'Confirm the exact 990-series form before relying on extension behavior.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
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
    ruleTier: 'applicability_review',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
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
      notes: 'Form 7004 extends filing time only; payment obligations must be reviewed separately.',
    },
    sourceIds: ['fed.irs_pub_509_2026', 'fed.irs_i1065_2025', 'fed.irs_i7004_2025'],
    evidence: [
      sourceEvidence(
        'fed.irs_i1065_2025',
        'When To File',
        'Form 1065 instructions provide the form-specific partnership filing deadline.',
      ),
      sourceEvidence(
        'fed.irs_pub_509_2026',
        'Partnerships / Form 1065',
        'Due on the 15th day of the 3rd month after tax year end.',
      ),
      sourceEvidence(
        'fed.irs_i7004_2025',
        'Purpose and When To File',
        'Form 7004 must be filed by the applicable return due date.',
      ),
    ],
    defaultTip: 'Calendar-year partnership returns for tax year 2025 roll to March 16, 2026.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    // Tax-year-2026 partnership return. Seeded at version 2 — it models a
    // 2026 return that has already had one library revision, so a firm that
    // adopted v1 trails the catalog and surfaces a `source_changed`
    // re-verify task. This is what drives the rule-change Alert → Re-verify
    // → Accept flow (the Accept action is template-driven; an adopted rule
    // with no backing template, or one not behind its template, has nothing
    // to accept).
    id: 'fed.1065.return.2026',
    title: 'Federal Form 1065 return for partnerships',
    jurisdiction: 'FED',
    entityApplicability: ['partnership', 'llc'],
    taxType: 'federal_1065',
    formName: 'Form 1065',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    taxYear: 2026,
    applicableYear: 2027,
    ruleTier: 'applicability_review',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
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
      notes: 'Form 7004 extends filing time only; payment obligations must be reviewed separately.',
    },
    sourceIds: ['fed.irs_pub_509_2026', 'fed.irs_i1065_2025', 'fed.irs_i7004_2025'],
    evidence: [
      sourceEvidence(
        'fed.irs_i1065_2025',
        'When To File',
        'Form 1065 instructions provide the form-specific partnership filing deadline.',
      ),
      sourceEvidence(
        'fed.irs_pub_509_2026',
        'Partnerships / Form 1065',
        'Due on the 15th day of the 3rd month after tax year end.',
      ),
      sourceEvidence(
        'fed.irs_i7004_2025',
        'Purpose and When To File',
        'Form 7004 must be filed by the applicable return due date.',
      ),
    ],
    defaultTip:
      'Calendar-year partnership returns for tax year 2026 are due the 15th day of the 3rd month after year end (mid-March 2027).',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 2,
  },
  {
    id: 'fed.1120s.return.2025',
    title: 'Federal Form 1120-S return for S corporations',
    jurisdiction: 'FED',
    entityApplicability: ['s_corp'],
    taxType: 'federal_1120s',
    formName: 'Form 1120-S',
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
      notes:
        'Extension applies to filing; any tax due should be paid by the original return due date.',
    },
    sourceIds: ['fed.irs_pub_509_2026', 'fed.irs_i1120s_2025', 'fed.irs_i7004_2025'],
    evidence: [
      sourceEvidence(
        'fed.irs_i1120s_2025',
        'When To File',
        'Form 1120-S instructions provide the form-specific S corporation filing deadline.',
      ),
      sourceEvidence(
        'fed.irs_pub_509_2026',
        'Corporations and S Corporations / Form 1120-S',
        'Due on the 15th day of the 3rd month after tax year end.',
      ),
      sourceEvidence(
        'fed.irs_i7004_2025',
        'Extension Period',
        'Automatic extension period is generally 6 months.',
      ),
    ],
    defaultTip: 'Calendar-year 2025 S corporation returns roll to March 16, 2026.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.1120.return.2025',
    title: 'Federal Form 1120 return for C corporations',
    jurisdiction: 'FED',
    entityApplicability: ['c_corp'],
    taxType: 'federal_1120',
    formName: 'Form 1120',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'basic',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'nth_day_after_tax_year_end',
      monthOffset: 4,
      day: 15,
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      formName: 'Form 7004',
      durationMonths: 6,
      paymentExtended: false,
      notes: 'June year-end C corporation exceptions remain applicability-review cases.',
    },
    sourceIds: ['fed.irs_pub_509_2026', 'fed.irs_i1120_2025', 'fed.irs_i7004_2025'],
    evidence: [
      sourceEvidence(
        'fed.irs_i1120_2025',
        'When To File',
        'Form 1120 instructions provide the form-specific C corporation filing deadline.',
      ),
      sourceEvidence(
        'fed.irs_pub_509_2026',
        'Corporations and S Corporations / Form 1120',
        'Due on the 15th day of the 4th month after tax year end.',
      ),
      sourceEvidence(
        'fed.irs_i7004_2025',
        'Extension Period',
        'C corporation June year-end exceptions are called out separately.',
      ),
    ],
    defaultTip: 'Calendar-year C corporation returns for tax year 2025 are due April 15, 2026.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.1120.estimated_tax.2026',
    title: 'Federal corporation estimated tax payments',
    jurisdiction: 'FED',
    entityApplicability: ['c_corp'],
    taxType: 'federal_1120_estimated_tax',
    formName: 'Estimated tax payments',
    eventType: 'payment',
    isFiling: false,
    isPayment: true,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'annual_rolling',
    status: 'verified',
    coverageStatus: 'full',
    riskLevel: 'med',
    requiresApplicabilityReview: false,
    dueDateLogic: {
      kind: 'source_defined_calendar',
      description: '15th day of the 4th, 6th, 9th, and 12th months of the corporation tax year.',
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'Estimated tax payments are payment obligations, not filing extensions.',
    },
    sourceIds: ['fed.irs_pub_509_2026', 'fed.irs_i1120_2025'],
    evidence: [
      sourceEvidence(
        'fed.irs_i1120_2025',
        'Estimated Tax Payments',
        'Form 1120 instructions identify estimated tax as a corporation payment obligation.',
      ),
      sourceEvidence(
        'fed.irs_pub_509_2026',
        'Corporations and S Corporations / Estimated tax payments',
        'Payments follow the 4th, 6th, 9th, and 12th month schedule.',
      ),
    ],
    defaultTip:
      'Treat estimated tax as payment-only; do not suppress it when a filing extension exists.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fed.disaster_relief.watch',
    title: 'Federal disaster tax relief candidate watch',
    jurisdiction: 'FED',
    entityApplicability: ['any_business', 'individual'],
    taxType: 'federal_disaster_relief',
    formName: 'IRS disaster relief notice',
    eventType: 'extension',
    isFiling: true,
    isPayment: true,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'exception',
    status: 'candidate',
    coverageStatus: 'manual',
    riskLevel: 'high',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'source_defined_calendar',
      description: 'Specific notices define affected localities, acts, and postponed due dates.',
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'Disaster relief is notice-specific and must be reviewed before publication.',
    },
    sourceIds: ['fed.irs_disaster_relief', 'fed.fema_disaster_declarations'],
    evidence: [
      sourceEvidence(
        'fed.irs_disaster_relief',
        'Tax relief by date',
        'IRS publishes notice-specific disaster relief entries.',
      ),
      sourceEvidence(
        'fed.fema_disaster_declarations',
        'OpenFEMA declarations',
        'FEMA declarations are early-warning signals only.',
      ),
    ],
    defaultTip:
      'Route disaster relief changes to practice review before any client reminder changes.',
    quality: { ...VERIFIED_QUALITY, crossVerified: false },
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: '2026-05-04',
    version: 1,
  },
  {
    id: 'ca.llc.568.return.2025',
    title: 'California LLC Form 568 return',
    jurisdiction: 'CA',
    entityApplicability: ['llc'],
    taxType: 'ca_llc_568',
    formName: 'Form 568',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'applicability_review',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'source_defined_calendar',
      description:
        'California LLC Form 568 due date depends on federal classification and owner type.',
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      durationMonths: 7,
      paymentExtended: false,
      notes: 'California LLC extension timing differs by classification; review entity facts.',
    },
    sourceIds: ['ca.ftb_business_due_dates', 'ca.ftb_568_booklet_2025', 'ca.ftb_llc'],
    evidence: [
      sourceEvidence(
        'ca.ftb_568_booklet_2025',
        'When and Where to File',
        'FTB distinguishes partnership-classified LLCs from SMLLCs for original return due dates.',
      ),
      sourceEvidence(
        'ca.ftb_568_booklet_2025',
        'Weekend or holiday note',
        'FTB rolls weekend or holiday due dates to the next business day.',
      ),
      sourceEvidence(
        'ca.ftb_llc',
        'LLC overview',
        'FTB LLC overview cross-checks Form 568 filing path against LLC classification and ownership type.',
        { authorityRole: 'cross_check' },
      ),
    ],
    defaultTip:
      'Confirm LLC federal classification and owner type before applying Form 568 timing.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'ca.llc.annual_tax.2026',
    title: 'California LLC annual tax payment',
    jurisdiction: 'CA',
    entityApplicability: ['llc'],
    taxType: 'ca_llc_annual_tax',
    formName: 'FTB 3522',
    eventType: 'payment',
    isFiling: false,
    isPayment: true,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'basic',
    status: 'verified',
    coverageStatus: 'full',
    riskLevel: 'med',
    requiresApplicabilityReview: false,
    dueDateLogic: {
      kind: 'nth_day_after_tax_year_begin',
      monthOffset: 4,
      day: 15,
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'Payment obligation is not extended by filing extension.',
    },
    sourceIds: ['ca.ftb_business_due_dates', 'ca.ftb_568_booklet_2025', 'ca.ftb_llc'],
    evidence: [
      sourceEvidence(
        'ca.ftb_568_booklet_2025',
        'Annual Limited Liability Company Tax',
        'The annual tax is due on or before the 15th day of the 4th month after the beginning of the taxable year.',
      ),
      sourceEvidence(
        'ca.ftb_llc',
        'Annual tax',
        'FTB LLC overview confirms the $800 annual tax via Form 3522 due 15th day of the 4th month after tax year begin.',
        { authorityRole: 'cross_check' },
      ),
    ],
    defaultTip: 'Separate the LLC annual tax payment from the Form 568 filing deadline.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'ca.llc.estimated_fee.2026',
    title: 'California LLC estimated fee payment',
    jurisdiction: 'CA',
    entityApplicability: ['llc'],
    taxType: 'ca_llc_estimated_fee',
    formName: 'FTB 3536',
    eventType: 'payment',
    isFiling: false,
    isPayment: true,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'applicability_review',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'high',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'nth_day_after_tax_year_begin',
      monthOffset: 6,
      day: 15,
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'Fee amount depends on California-source total income.',
    },
    sourceIds: ['ca.ftb_business_due_dates', 'ca.ftb_568_booklet_2025', 'ca.ftb_llc'],
    evidence: [
      sourceEvidence(
        'ca.ftb_568_booklet_2025',
        'LLC fee',
        'FTB requires estimating and paying the LLC fee by the 15th day of the 6th month of the current taxable year.',
      ),
      sourceEvidence(
        'ca.ftb_llc',
        'LLC fee chart',
        'FTB LLC overview links to the LLC fee chart, which tiers the fee by California-source total income.',
        { authorityRole: 'cross_check' },
      ),
    ],
    defaultTip: 'Mark for review when California-source total income is unknown.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'ca.100s.return.2025',
    title: 'California S corporation Form 100S return',
    jurisdiction: 'CA',
    entityApplicability: ['s_corp'],
    taxType: 'ca_100s',
    formName: 'Form 100S',
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
      durationMonths: 6,
      paymentExtended: false,
      notes: 'FTB lists separate payment due date at the original return date.',
    },
    sourceIds: ['ca.ftb_business_due_dates'],
    evidence: [
      sourceEvidence(
        'ca.ftb_business_due_dates',
        'Corporation tax return and payments / S corporation',
        'Return and payment are due in the 3rd month after tax year close.',
      ),
    ],
    defaultTip: 'Calendar-year 2025 CA S corporation return rolls to March 16, 2026.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'ca.100.return.2025',
    title: 'California C corporation Form 100 return',
    jurisdiction: 'CA',
    entityApplicability: ['c_corp'],
    taxType: 'ca_100',
    formName: 'Form 100',
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
      monthOffset: 4,
      day: 15,
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      durationMonths: 7,
      paymentExtended: false,
      notes: 'Tax year 2019 and later has the 15th day of the 11th month extended due date.',
    },
    sourceIds: ['ca.ftb_business_due_dates'],
    evidence: [
      sourceEvidence(
        'ca.ftb_business_due_dates',
        'Corporation tax return and payments / C corporation',
        'FTB lists return and payment in the 4th month after close.',
      ),
    ],
    defaultTip: 'Calendar-year CA C corporation return is due April 15, 2026.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'ca.541.return.2025',
    title: 'California Form 541 fiduciary income tax return',
    jurisdiction: 'CA',
    entityApplicability: ['trust'],
    taxType: 'ca_541',
    formName: 'Form 541',
    eventType: 'filing',
    obligationType: 'filing',
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
      monthOffset: 4,
      day: 15,
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      durationMonths: 6,
      paymentExtended: false,
      notes:
        'California grants an automatic filing extension for Form 541; tax payment remains due by the original return date.',
    },
    sourceIds: ['ca.ftb_541_booklet_2025', 'ca.ftb_estates_trusts'],
    evidence: [
      sourceEvidence(
        'ca.ftb_541_booklet_2025',
        'When to File',
        'Form 541 instructions provide the fiduciary return due date and automatic extension treatment.',
      ),
      sourceEvidence(
        'ca.ftb_estates_trusts',
        'Estates and trusts',
        'California FTB estates and trusts guidance cross-checks fiduciary filing applicability.',
        { authorityRole: 'cross_check' },
      ),
    ],
    defaultTip:
      'Track California Form 541 separately from federal Form 1041 and any beneficiary K-1 dependency.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'ny.it204.return.2025',
    title: 'New York partnership return',
    jurisdiction: 'NY',
    entityApplicability: ['partnership', 'llc'],
    taxType: 'ny_it204',
    formName: 'Form IT-204',
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
      formName: 'Form IT-370-PF',
      durationMonths: 6,
      paymentExtended: false,
      notes: 'Extension must be filed by the return due date.',
    },
    sourceIds: ['ny.partnerships', 'ny.tax_calendar.2026'],
    evidence: [
      sourceEvidence(
        'ny.tax_calendar.2026',
        'March 16 entries',
        'NY calendar lists partnership tax return due for calendar-year filers.',
      ),
      sourceEvidence(
        'ny.partnerships',
        'Partnership filing guidance',
        'NY partnership return due dates follow the partnership tax year close.',
      ),
    ],
    defaultTip: 'NY calendar-year partnership returns for 2025 are due March 16, 2026.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'ny.it205.return.2025',
    title: 'New York Form IT-205 fiduciary income tax return',
    jurisdiction: 'NY',
    entityApplicability: ['trust'],
    taxType: 'ny_it205',
    formName: 'Form IT-205',
    eventType: 'filing',
    obligationType: 'filing',
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
      monthOffset: 4,
      day: 15,
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      formName: 'Form IT-370-PF',
      durationMonths: 5.5,
      paymentExtended: false,
      notes:
        'New York extends the time to file Form IT-205 by 5.5 months when extension requirements are met; payment remains due by the original return date.',
    },
    sourceIds: ['ny.it205_instructions_2025', 'ny.personal_fiduciary_filing_due_dates'],
    evidence: [
      sourceEvidence(
        'ny.it205_instructions_2025',
        'When to file Form IT-205',
        'Form IT-205 instructions provide the calendar-year and fiscal-year fiduciary filing deadlines.',
      ),
      sourceEvidence(
        'ny.personal_fiduciary_filing_due_dates',
        'Filing due dates',
        'New York filing due-date guidance cross-checks the calendar-year fiduciary return due date.',
        { authorityRole: 'cross_check' },
      ),
    ],
    defaultTip:
      'Track New York Form IT-205 separately from federal Form 1041 and any beneficiary K-1 dependency.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'ny.it204ll.filing_fee.2025',
    title: 'New York partnership, LLC, and LLP filing fee',
    jurisdiction: 'NY',
    entityApplicability: ['partnership', 'llc'],
    taxType: 'ny_it204ll',
    formName: 'Form IT-204-LL',
    eventType: 'payment',
    isFiling: true,
    isPayment: true,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'applicability_review',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'high',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'nth_day_after_tax_year_end',
      monthOffset: 3,
      day: 15,
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'NY instructions state there is no extension for Form IT-204-LL or the annual fee.',
    },
    sourceIds: ['ny.tax_calendar.2026', 'ny.it204ll'],
    evidence: [
      sourceEvidence(
        'ny.tax_calendar.2026',
        'March 16 entries',
        'NY calendar lists partnership, LLC, and LLP filing fee due.',
      ),
      sourceEvidence(
        'ny.it204ll',
        'General information / When to file',
        'Instructions define the annual fee and no-extension treatment.',
      ),
    ],
    defaultTip: 'Do not treat IT-204-LL as covered by a partnership filing extension.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'ny.ct3.return.2025',
    title: 'New York C corporation tax return',
    jurisdiction: 'NY',
    entityApplicability: ['c_corp'],
    taxType: 'ny_ct3',
    formName: 'Form CT-3',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'annual_rolling',
    status: 'verified',
    coverageStatus: 'full',
    riskLevel: 'med',
    requiresApplicabilityReview: false,
    dueDateLogic: {
      kind: 'nth_day_after_tax_year_end',
      monthOffset: 4,
      day: 15,
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      durationMonths: 6,
      paymentExtended: false,
      notes: 'Calendar-year return due date is from NY calendar and Article 9-A guidance.',
    },
    sourceIds: ['ny.tax_calendar.2026', 'ny.article_9a'],
    evidence: [
      sourceEvidence(
        'ny.tax_calendar.2026',
        'April 15 entries',
        'NY calendar lists C corporation return due for calendar-year filers.',
      ),
      sourceEvidence(
        'ny.article_9a',
        'Filing frequency table',
        'Article 9-A page lists calendar-year due date on April 15.',
      ),
    ],
    defaultTip: 'Calendar-year NY C corporation returns are due April 15, 2026.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'ny.ct3s.return.2025',
    title: 'New York S corporation franchise tax return',
    jurisdiction: 'NY',
    entityApplicability: ['s_corp'],
    taxType: 'ny_ct3s',
    formName: 'Form CT-3-S',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'annual_rolling',
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
      durationMonths: 6,
      paymentExtended: false,
      notes: 'Calendar-year S corporation returns are listed on the NY filing calendar.',
    },
    sourceIds: ['ny.tax_calendar.2026', 'ny.article_9a'],
    evidence: [
      sourceEvidence(
        'ny.tax_calendar.2026',
        'March 16 entries',
        'NY calendar lists S corporation tax return due for calendar-year filers.',
      ),
      sourceEvidence(
        'ny.article_9a',
        'S corporation guidance',
        'NY Article 9-A resources distinguish S corporation return filing from C corporation filing.',
      ),
    ],
    defaultTip: 'Calendar-year NY S corporation returns for 2025 are due March 16, 2026.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'ny.ptet.election.2026',
    title: 'New York PTET election',
    jurisdiction: 'NY',
    entityApplicability: ['partnership', 's_corp'],
    taxType: 'ny_ptet_election',
    formName: 'PTET election',
    eventType: 'election',
    isFiling: true,
    isPayment: false,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'applicability_review',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'high',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'fixed_date',
      date: '2026-03-16',
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'The annual PTET election must be made by an authorized person.',
    },
    sourceIds: ['ny.ptet', 'ny.tax_calendar.2026'],
    evidence: [
      sourceEvidence(
        'ny.ptet',
        'Annual election',
        'NY PTET election requires entity-level authorization and applicability review.',
      ),
      sourceEvidence(
        'ny.tax_calendar.2026',
        'March 16 entries',
        'NY calendar lists the PTET election deadline for the 2026 tax year.',
      ),
    ],
    defaultTip: 'Confirm the client wants to make a PTET election before treating this as work.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'ny.ptet.estimated_payments.2026',
    title: 'New York PTET estimated payments',
    jurisdiction: 'NY',
    entityApplicability: ['partnership', 's_corp'],
    taxType: 'ny_ptet_estimated_tax',
    formName: 'PTET estimated payments',
    eventType: 'payment',
    isFiling: false,
    isPayment: true,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'applicability_review',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'high',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'period_table',
      frequency: 'quarterly',
      periods: [
        { period: '2026-Q1', dueDate: '2026-03-16' },
        { period: '2026-Q2', dueDate: '2026-06-15' },
        { period: '2026-Q3', dueDate: '2026-09-15' },
        { period: '2026-Q4', dueDate: '2026-12-15' },
      ],
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'PTET estimated payments are payment-only and depend on election status.',
    },
    sourceIds: ['ny.ptet', 'ny.tax_calendar.2026'],
    evidence: [
      sourceEvidence(
        'ny.ptet',
        'Estimated payments',
        'NY PTET estimated payments apply only to electing entities.',
      ),
      sourceEvidence(
        'ny.tax_calendar.2026',
        'PTET estimated payments',
        'NY calendar lists 2026 PTET estimated payment dates.',
      ),
    ],
    defaultTip: 'Generate only after confirming the entity elected into PTET.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'ny.ptet.return_extension.2025',
    title: 'New York PTET annual return or extension',
    jurisdiction: 'NY',
    entityApplicability: ['partnership', 's_corp'],
    taxType: 'ny_ptet',
    formName: 'PTET annual return',
    eventType: 'filing',
    isFiling: true,
    isPayment: true,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'applicability_review',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'high',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'fixed_date',
      date: '2026-03-16',
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: true,
      durationMonths: 6,
      paymentExtended: false,
      notes: 'PTET extension is filing-only; tax must be paid by original due date.',
    },
    sourceIds: ['ny.tax_calendar.2026', 'ny.ptet'],
    evidence: [
      sourceEvidence(
        'ny.tax_calendar.2026',
        'March 16 entries',
        'NY calendar lists PTET return or automatic extension request due.',
      ),
      sourceEvidence('ny.ptet', 'Extension', 'PTET extension does not extend time to pay.'),
    ],
    defaultTip: 'Only clients with a PTET election should receive this obligation.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'tx.franchise.annual_report.2026',
    title: 'Texas annual franchise tax report',
    jurisdiction: 'TX',
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    taxType: 'tx_franchise_report',
    formName: 'Texas franchise tax report',
    eventType: 'filing',
    isFiling: true,
    isPayment: true,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'annual_rolling',
    status: 'verified',
    coverageStatus: 'full',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'fixed_date',
      date: '2026-05-15',
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      paymentExtended: false,
      notes: 'Timely extension request must be received or postmarked by the original due date.',
    },
    sourceIds: ['tx.franchise_home', 'tx.franchise_overview'],
    evidence: [
      sourceEvidence(
        'tx.franchise_overview',
        'Due Dates, Extensions and Filing Methods',
        'Texas lists franchise tax reports as due May 15 each year.',
      ),
      sourceEvidence(
        'tx.franchise_home',
        'Franchise Tax 2026 Reports',
        'Texas lists 2026 franchise tax reports as due May 15, 2026.',
      ),
    ],
    defaultTip:
      'Confirm whether the entity is subject to Texas franchise tax before generating reminders.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'tx.franchise.pir_oir.2026',
    title: 'Texas PIR or OIR information report',
    jurisdiction: 'TX',
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    taxType: 'tx_pir_oir',
    formName: 'PIR/OIR',
    eventType: 'information_report',
    isFiling: true,
    isPayment: false,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'annual_rolling',
    status: 'verified',
    coverageStatus: 'full',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'fixed_date',
      date: '2026-05-15',
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      paymentExtended: false,
      notes: 'Information report follows annual franchise tax report due date.',
    },
    sourceIds: ['tx.franchise_annual_report', 'tx.pir_oir'],
    evidence: [
      sourceEvidence(
        'tx.pir_oir',
        'Filing Requirements',
        'PIR is due on the annual franchise tax report due date.',
      ),
      sourceEvidence(
        'tx.franchise_annual_report',
        'Information Report',
        'Instructions distinguish PIR and OIR by entity type.',
      ),
    ],
    defaultTip: 'Use entity type to decide PIR vs OIR before showing client-facing language.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'tx.franchise.extension.2026',
    title: 'Texas franchise tax extension request',
    jurisdiction: 'TX',
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    taxType: 'tx_franchise_extension',
    formName: 'Texas franchise tax extension',
    eventType: 'extension',
    isFiling: true,
    isPayment: true,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'applicability_review',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'high',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'fixed_date',
      date: '2026-05-15',
      holidayRollover: 'next_business_day',
    },
    extensionPolicy: {
      available: true,
      paymentExtended: false,
      notes:
        'Extension payment and request requirements depend on prior-year and current-year tax.',
    },
    sourceIds: ['tx.franchise_extensions', 'tx.franchise_overview'],
    evidence: [
      sourceEvidence(
        'tx.franchise_extensions',
        'Franchise tax extensions',
        'Texas extension request and payment requirements are due by the original report due date.',
      ),
      sourceEvidence(
        'tx.franchise_overview',
        'Due Dates, Extensions and Filing Methods',
        'Texas franchise tax reports are due May 15 each year.',
      ),
    ],
    defaultTip: 'Confirm extension payment requirements before treating the report as extended.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'tx.franchise.no_tax_due_threshold.2026',
    title: 'Texas franchise no-tax-due threshold review',
    jurisdiction: 'TX',
    entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    taxType: 'tx_no_tax_due_threshold',
    formName: 'No tax due review',
    eventType: 'information_report',
    isFiling: false,
    isPayment: false,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'applicability_review',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'source_defined_calendar',
      description: 'No-tax-due treatment depends on report year forms and revenue threshold.',
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'This is a review flag, not a filing conclusion or payment deadline.',
    },
    sourceIds: ['tx.franchise_forms_2026', 'tx.franchise_overview'],
    evidence: [
      sourceEvidence(
        'tx.franchise_forms_2026',
        '2026 franchise forms',
        'Texas report-year forms define no-tax-due availability and reporting changes.',
      ),
      sourceEvidence(
        'tx.franchise_overview',
        'No Tax Due Reporting',
        'Texas no-tax-due rules require threshold review before conclusion.',
      ),
    ],
    defaultTip: 'Use this as a CPA review prompt, not as an automatic deadline.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fl.f1120.return.2025',
    title: 'Florida corporate income/franchise tax return',
    jurisdiction: 'FL',
    entityApplicability: ['c_corp'],
    taxType: 'fl_f1120',
    formName: 'Form F-1120',
    eventType: 'filing',
    isFiling: true,
    isPayment: true,
    taxYear: 2025,
    applicableYear: 2026,
    ruleTier: 'annual_rolling',
    status: 'verified',
    coverageStatus: 'full',
    riskLevel: 'med',
    requiresApplicabilityReview: false,
    dueDateLogic: {
      kind: 'source_defined_calendar',
      description: 'Use Florida DOR corporate income tax due-date table by taxable year end.',
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: true,
      formName: 'Form F-7004',
      durationMonths: 6,
      paymentExtended: false,
      notes: 'Florida F-7004 must include tentative tax payment by original due date.',
    },
    sourceIds: ['fl.cit_due_dates_2026', 'fl.cit'],
    evidence: [
      sourceEvidence(
        'fl.cit_due_dates_2026',
        'Corporate Income Tax Due Dates',
        'Florida publishes a taxable-year-end due-date table for Form F-1120 and F-7004.',
        {
          pdfPage: 1,
          tableLabel: 'Florida Corporate Income Tax Return Filing Dates',
          rowLabel: 'Taxable year end 12/31/25',
          sourceExcerpt: 'Return (F-1120) or Extension (F-7004)\n12/31/25 05/01/26',
        },
      ),
      sourceEvidence(
        'fl.cit',
        'Extension of Time and Payment of Tentative Tax',
        'F-7004 is filed with tentative payment by the original due date.',
      ),
    ],
    defaultTip: 'Use the Florida taxable-year-end table before assigning a concrete due date.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'fl.cit.estimated_tax.2026',
    title: 'Florida corporate estimated income/franchise tax',
    jurisdiction: 'FL',
    entityApplicability: ['c_corp'],
    taxType: 'fl_cit_estimated_tax',
    formName: 'Form F-1120ES',
    eventType: 'payment',
    isFiling: false,
    isPayment: true,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'annual_rolling',
    status: 'verified',
    coverageStatus: 'manual',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'source_defined_calendar',
      description:
        'Estimated tax schedule depends on taxable year begin/end and Florida threshold.',
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'Estimated tax is payment-only and threshold-dependent.',
    },
    sourceIds: ['fl.cit_due_dates_2026', 'fl.cit'],
    evidence: [
      sourceEvidence(
        'fl.cit_due_dates_2026',
        'Estimated tax due dates table',
        'Florida publishes installment due dates by taxable year end.',
        {
          pdfPage: 1,
          tableLabel: 'Florida Corporate Income Tax Due Dates for Declaration of Estimated Tax',
          rowLabel: 'Taxable year end 12/31/26',
          sourceExcerpt: [
            'Florida Corporate Income Tax Due Dates for Declaration of Estimated Tax',
            'Taxable Year End Installment #1 Installment #2 Installment #3 Installment #4',
            '12/31/26 06/01/26 06/30/26 09/30/26 12/31/26',
          ].join('\n'),
        },
      ),
      sourceEvidence(
        'fl.cit',
        'Estimated Tax',
        'Florida estimated tax applies when annual corporate income tax exceeds the threshold.',
      ),
    ],
    defaultTip: 'Only generate when estimated Florida corporate income tax exceeds the threshold.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'wa.excise.monthly.2026',
    title: 'Washington combined excise tax monthly return',
    jurisdiction: 'WA',
    entityApplicability: ['any_business'],
    taxType: 'wa_combined_excise_monthly',
    formName: 'Combined Excise Tax Return',
    eventType: 'filing',
    isFiling: true,
    isPayment: true,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'annual_rolling',
    status: 'verified',
    coverageStatus: 'full',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'period_table',
      frequency: 'monthly',
      periods: [
        { period: '2026-01', dueDate: '2026-02-25' },
        { period: '2026-02', dueDate: '2026-03-25' },
        { period: '2026-03', dueDate: '2026-04-27' },
        { period: '2026-04', dueDate: '2026-05-26' },
        { period: '2026-05', dueDate: '2026-06-25' },
        { period: '2026-06', dueDate: '2026-07-27' },
        { period: '2026-07', dueDate: '2026-08-25' },
        { period: '2026-08', dueDate: '2026-09-25' },
        { period: '2026-09', dueDate: '2026-10-26' },
        { period: '2026-10', dueDate: '2026-11-25' },
        { period: '2026-11', dueDate: '2026-12-28' },
        { period: '2026-12', dueDate: '2027-01-25' },
      ],
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes:
        'Washington DOR source table already reflects penalty start dates and rollover context.',
    },
    sourceIds: ['wa.excise_due_dates_2026', 'wa.bo'],
    evidence: [
      sourceEvidence(
        'wa.excise_due_dates_2026',
        'Monthly due dates',
        'Washington publishes each monthly return due date for 2026.',
      ),
      sourceEvidence(
        'wa.bo',
        'B&O tax',
        'B&O applicability depends on business activity and filing frequency.',
      ),
    ],
    defaultTip: 'Confirm the client filing frequency before generating monthly excise reminders.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'wa.excise.quarterly.2026',
    title: 'Washington combined excise tax quarterly return',
    jurisdiction: 'WA',
    entityApplicability: ['any_business'],
    taxType: 'wa_combined_excise_quarterly',
    formName: 'Combined Excise Tax Return',
    eventType: 'filing',
    isFiling: true,
    isPayment: true,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'annual_rolling',
    status: 'verified',
    coverageStatus: 'full',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'period_table',
      frequency: 'quarterly',
      periods: [
        { period: '2026-Q1', dueDate: '2026-04-30' },
        { period: '2026-Q2', dueDate: '2026-07-31' },
        { period: '2026-Q3', dueDate: '2026-11-02' },
        { period: '2026-Q4', dueDate: '2027-02-01' },
      ],
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'Quarterly due dates are source-defined by Washington DOR.',
    },
    sourceIds: ['wa.excise_due_dates_2026', 'wa.bo'],
    evidence: [
      sourceEvidence(
        'wa.excise_due_dates_2026',
        'Quarterly due dates',
        'Washington publishes quarterly return due dates for 2026.',
      ),
    ],
    defaultTip: 'Use the quarterly schedule only after confirming filing frequency.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
  {
    id: 'wa.excise.annual.2026',
    title: 'Washington combined excise tax annual return',
    jurisdiction: 'WA',
    entityApplicability: ['any_business'],
    taxType: 'wa_combined_excise_annual',
    formName: 'Combined Excise Tax Return',
    eventType: 'filing',
    isFiling: true,
    isPayment: true,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'annual_rolling',
    status: 'verified',
    coverageStatus: 'full',
    riskLevel: 'med',
    requiresApplicabilityReview: true,
    dueDateLogic: {
      kind: 'period_table',
      frequency: 'annual',
      periods: [{ period: '2026', dueDate: '2027-04-15' }],
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'Annual due date is source-defined by Washington DOR.',
    },
    sourceIds: ['wa.excise_due_dates_2026', 'wa.bo'],
    evidence: [
      sourceEvidence(
        'wa.excise_due_dates_2026',
        'Annual 2026 due date',
        'Washington lists the annual 2026 due date for the Combined Excise Tax Return.',
      ),
    ],
    defaultTip: 'Annual Washington excise return for 2026 is due April 15, 2027.',
    quality: VERIFIED_QUALITY,
    verifiedBy: 'practice.template_seed',
    verifiedAt: VERIFIED_AT,
    nextReviewOn: NEXT_PRE_SEASON_REVIEW,
    version: 1,
  },
] as const

export function listRuleSources(jurisdiction?: RuleJurisdiction): readonly RuleSource[] {
  if (!jurisdiction) return RULE_SOURCES
  return RULE_SOURCES.filter((source) => source.jurisdiction === jurisdiction)
}

export function sourceDomainsForRule(
  rule: Pick<ObligationRule, 'taxType'>,
): readonly RuleSourceDomain[] {
  return [
    ...STATE_CANDIDATE_RULE_DOMAINS.filter((domain) => rule.taxType.endsWith(domain.taxType)).map(
      (domain) => domain.slug,
    ),
    ...LOCAL_CANDIDATE_RULE_DOMAINS.filter((domain) => rule.taxType.endsWith(domain.taxType)).map(
      (domain) => domain.slug,
    ),
  ]
}

export function sourceCoversRuleDomain(
  source: Pick<RuleSource, 'domains' | 'entityApplicability'>,
  rule: Pick<ObligationRule, 'taxType' | 'entityApplicability'>,
): boolean {
  const domains = sourceDomainsForRule(rule)
  if (domains.length === 0) return false
  const coversDomain = domains.some((domain) => source.domains.includes(domain))
  if (!coversDomain) return false
  return rule.entityApplicability.every((entity) => sourceCoversEntity(source, entity))
}

export interface RequiredSourceCoverageCell {
  jurisdiction: RuleJurisdiction
  domain: RuleSourceDomain
  entity: (typeof RULE_SOURCE_COVERAGE_ENTITIES)[number]
  status: SourceCoverageStatus
  sourceIds: readonly string[]
}

export type TemporaryAnnouncementCoverageStatus = 'covered' | 'missing_source'

export interface TemporaryAnnouncementSourceCoverage {
  jurisdiction: RuleJurisdiction
  status: TemporaryAnnouncementCoverageStatus
  sourceIds: readonly string[]
  missingReason: string | null
}

export type PolicyWatchFamily = 'baseline_rule' | 'tax_news' | 'disaster_relief'

export type PolicyWatchCoverageStatus = 'covered' | 'manual_review' | 'blocked' | 'missing_source'

export type PolicyWatchAutomationStatus = 'automated' | 'signal_only' | 'manual_review' | 'blocked'

export type PolicyWatchCoverageQuality = 'strong' | 'partial' | 'manual' | 'blocked'

export type PolicyWatchSourceReliabilityQuality =
  | 'parser_ready'
  | 'reachable_but_generic'
  | 'stale_or_redirected'
  | 'stale_pdf_root'
  | 'transient_fetch_blocked'
  | 'needs_replacement'

export interface PolicyWatchSource {
  id: string
  jurisdiction: RuleJurisdiction
  title: string
  url: string
  sourceType: RuleSourceType
  acquisitionMethod: AcquisitionMethod
  cadence: SourceCadence
  priority: SourcePriority
  healthStatus: SourceHealthStatus
  families: readonly PolicyWatchFamily[]
  visibleInSourcesPage: boolean
  alertPurpose: AlertSourcePurpose
  adapterKind?: SourceAdapterKind
  feedUrl?: string
  derivedFromSourceIds?: readonly string[]
}

export interface PolicyWatchFamilyCoverage {
  family: PolicyWatchFamily
  status: PolicyWatchCoverageStatus
  automationStatus: PolicyWatchAutomationStatus
  quality: PolicyWatchCoverageQuality
  sourceIds: readonly string[]
  hiddenSourceIds: readonly string[]
  missingReason: string | null
  riskReason: string | null
}

export interface PolicyWatchCoverage {
  jurisdiction: RuleJurisdiction
  families: readonly PolicyWatchFamilyCoverage[]
}

export interface PolicyWatchCoverageAuditRow extends PolicyWatchCoverage {
  riskReasons: readonly string[]
}

export interface SourceAutomationRemediationSource {
  sourceId: string
  title: string
  url: string
  acquisitionMethod: AcquisitionMethod
  adapterKind: SourceAdapterKind | null
  suggestedAdapterKind: SourceAdapterKind | null
  healthStatus: SourceHealthStatus
  parserBacked: boolean
}

export interface SourceAutomationRemediationFamilyAudit extends PolicyWatchFamilyCoverage {
  sources: readonly SourceAutomationRemediationSource[]
  needsRemediation: boolean
}

export interface SourceAutomationRemediationAuditRow {
  jurisdiction: RuleJurisdiction
  families: readonly SourceAutomationRemediationFamilyAudit[]
}

export interface PolicyWatchSourceReliabilityAuditRow {
  jurisdiction: RuleJurisdiction
  family: PolicyWatchFamily
  sourceId: string
  title: string
  url: string
  finalUrl: string | null
  httpStatus: number | null
  contentType: string | null
  acquisitionMethod: AcquisitionMethod
  adapterKind: SourceAdapterKind | null
  quality: PolicyWatchSourceReliabilityQuality
  failureReason: string | null
  recommendedAction: string | null
}

const TEMPORARY_ANNOUNCEMENT_SOURCE_TYPES = new Set<RuleSourceType>(['emergency_relief', 'news'])
const TEMPORARY_ANNOUNCEMENT_ACQUISITION_METHODS = new Set<AcquisitionMethod>([
  'html_watch',
  'pdf_watch',
  'api_watch',
  'email_subscription',
])

function sourceVerificationStatus(source: RuleSource): SourceCoverageStatus {
  return source.healthStatus === 'healthy' && source.acquisitionMethod !== 'manual_review'
    ? 'source_verified'
    : 'source_registered'
}

export function isTemporaryAnnouncementSource(source: RuleSource): boolean {
  return (
    source.authorityRole === 'watch' &&
    TEMPORARY_ANNOUNCEMENT_SOURCE_TYPES.has(source.sourceType) &&
    source.notificationChannels.includes('practice_rule_review')
  )
}

export function isCoveredTemporaryAnnouncementSource(source: RuleSource): boolean {
  return (
    isTemporaryAnnouncementSource(source) &&
    source.healthStatus === 'healthy' &&
    TEMPORARY_ANNOUNCEMENT_ACQUISITION_METHODS.has(source.acquisitionMethod) &&
    (source.acquisitionMethod !== 'api_watch' ||
      source.adapterKind === 'rss_or_announcement_list') &&
    (source.acquisitionMethod !== 'email_subscription' || source.adapterKind === 'email_inbound')
  )
}

function urlLooksPdf(url: string): boolean {
  return /\.pdf(?:[?#]|$)/i.test(url)
}

/**
 * Some official announcement indexes are paginated by year with no stable
 * non-year page (e.g. WV Administrative Notices: …Notices{year}.aspx). Such
 * sources register a `{year}` token in their URL; it resolves to the current
 * calendar year at fetch time so the watcher follows the live year instead of
 * silently stalling on a past year's page after the new year rolls over.
 * THE canonical implementation — the pulse adapters, the rules-scan and the
 * offline source checker (scripts/check-rule-sources.ts) must all resolve
 * identically or the checker reports a different page than the cron fetches.
 */
export function resolveAnnouncementYearUrl(url: string, now: Date = new Date()): string {
  return url.includes('{year}') ? url.replaceAll('{year}', String(now.getUTCFullYear())) : url
}

/**
 * The URL a source is actually fetched from: `feedUrl` (when present) wins
 * over `url`, with the `{year}` token resolved. `feedUrl` doubles as a
 * fetch-address override for year-paginated index pages — `url` then stays
 * the dated content page rules cite and UIs link to.
 */
export function ruleSourceFetchUrl(
  source: Pick<RuleSource, 'url' | 'feedUrl'>,
  now: Date = new Date(),
): string {
  return resolveAnnouncementYearUrl(source.feedUrl ?? source.url, now)
}

function sourceLooksLikeAnnouncementList(
  source: Pick<PolicyWatchSource, 'sourceType' | 'families'>,
): boolean {
  return (
    source.sourceType === 'news' ||
    source.sourceType === 'emergency_relief' ||
    source.families.includes('tax_news') ||
    source.families.includes('disaster_relief')
  )
}

function sourceAdapterKindForParserBackedSource(
  source: Pick<
    PolicyWatchSource,
    'acquisitionMethod' | 'adapterKind' | 'families' | 'healthStatus' | 'sourceType' | 'url'
  >,
): SourceAdapterKind | null {
  if (source.healthStatus === 'failing' || source.healthStatus === 'paused') return null
  if (source.adapterKind) return source.adapterKind
  if (source.acquisitionMethod === 'api_watch') return 'rss_or_announcement_list'
  if (source.acquisitionMethod === 'email_subscription') return null
  if (source.acquisitionMethod === 'pdf_watch' || urlLooksPdf(source.url)) {
    return sourceLooksLikeAnnouncementList(source) ? 'pdf_index' : 'pdf_due_date_document'
  }
  if (source.acquisitionMethod === 'html_watch' || source.acquisitionMethod === 'manual_review') {
    return sourceLooksLikeAnnouncementList(source) ? 'html_announcement_list' : 'html_due_date_page'
  }
  return null
}

export function isParserBackedRuleSource(
  source: Pick<
    RuleSource,
    'acquisitionMethod' | 'adapterKind' | 'healthStatus' | 'sourceType' | 'url'
  >,
): boolean {
  return sourceAdapterKindForParserBackedSource({ ...source, families: ['baseline_rule'] }) !== null
}

export function parserBackedAdapterKindForSource(
  source: Pick<
    PolicyWatchSource,
    'acquisitionMethod' | 'adapterKind' | 'families' | 'healthStatus' | 'sourceType' | 'url'
  >,
): SourceAdapterKind | null {
  return sourceAdapterKindForParserBackedSource(source)
}

function mergeSourceCoverageStatus(
  current: SourceCoverageStatus,
  next: SourceCoverageStatus,
): SourceCoverageStatus {
  const rank: Record<SourceCoverageStatus, number> = {
    not_applicable: 0,
    missing_source: 1,
    source_registered: 2,
    source_verified: 3,
    rule_pending_review: 4,
    rule_active: 5,
  }
  return rank[next] > rank[current] ? next : current
}

export function listRequiredSourceCoverage(
  jurisdiction?: RuleJurisdiction,
): readonly RequiredSourceCoverageCell[] {
  const jurisdictions = jurisdiction ? [jurisdiction] : MVP_RULE_JURISDICTIONS
  const cells: RequiredSourceCoverageCell[] = []

  for (const currentJurisdiction of jurisdictions) {
    if (currentJurisdiction === 'FED') continue
    const sources = listRuleSources(currentJurisdiction).filter(
      (source) => source.authorityRole === 'basis',
    )
    for (const domain of STATE_CANDIDATE_RULE_DOMAINS) {
      for (const entity of domain.entityApplicability) {
        if (sourceCoverageNotApplicable(currentJurisdiction, domain.slug, entity)) {
          cells.push({
            jurisdiction: currentJurisdiction,
            domain: domain.slug,
            entity,
            status: 'not_applicable',
            sourceIds: [],
          })
          continue
        }
        const matchingSources = sources.filter(
          (source) => source.domains.includes(domain.slug) && sourceCoversEntity(source, entity),
        )
        const status = matchingSources.reduce<SourceCoverageStatus>(
          (current, source) => mergeSourceCoverageStatus(current, sourceVerificationStatus(source)),
          'missing_source',
        )
        cells.push({
          jurisdiction: currentJurisdiction,
          domain: domain.slug,
          entity,
          status,
          sourceIds: matchingSources.map((source) => source.id),
        })
      }
    }
  }

  return cells
}

export function listTemporaryAnnouncementSourceCoverage(
  jurisdiction?: RuleJurisdiction,
): readonly TemporaryAnnouncementSourceCoverage[] {
  const jurisdictions = jurisdiction ? [jurisdiction] : MVP_RULE_JURISDICTIONS
  return jurisdictions.map((currentJurisdiction) => {
    const announcementSources = listRuleSources(currentJurisdiction).filter(
      isTemporaryAnnouncementSource,
    )
    const coveredSources = announcementSources.filter(isCoveredTemporaryAnnouncementSource)
    return {
      jurisdiction: currentJurisdiction,
      status: coveredSources.length > 0 ? 'covered' : 'missing_source',
      sourceIds: coveredSources.map((source) => source.id),
      missingReason:
        coveredSources.length > 0
          ? null
          : announcementSources.length === 0
            ? 'No official temporary announcement source is registered.'
            : 'Registered temporary announcement sources are not healthy html_watch/pdf_watch/api_watch sources.',
    }
  })
}

export function policyWatchAutomationStatusForSource(
  source: Pick<
    PolicyWatchSource,
    'acquisitionMethod' | 'adapterKind' | 'families' | 'healthStatus' | 'sourceType' | 'url'
  >,
): PolicyWatchAutomationStatus {
  if (source.healthStatus === 'failing' || source.healthStatus === 'paused') return 'blocked'
  const parserKind = sourceAdapterKindForParserBackedSource(source)
  if (!parserKind) {
    return source.acquisitionMethod === 'manual_review' ? 'manual_review' : 'signal_only'
  }
  if (source.acquisitionMethod === 'manual_review') return 'signal_only'
  if (source.healthStatus !== 'healthy') return 'signal_only'
  if (source.acquisitionMethod === 'html_watch') return 'automated'
  if (
    source.acquisitionMethod === 'api_watch' &&
    source.adapterKind === 'rss_or_announcement_list'
  ) {
    return 'automated'
  }
  return 'signal_only'
}

function policyWatchAutomationStatusForSources(
  sources: readonly Pick<
    PolicyWatchSource,
    'acquisitionMethod' | 'adapterKind' | 'families' | 'healthStatus' | 'sourceType' | 'url'
  >[],
): PolicyWatchAutomationStatus {
  if (sources.length === 0) return 'manual_review'
  const statuses = new Set(sources.map(policyWatchAutomationStatusForSource))
  if (statuses.has('automated')) return 'automated'
  if (statuses.has('signal_only')) return 'signal_only'
  if (statuses.has('manual_review')) return 'manual_review'
  return 'blocked'
}

function policyWatchStatusForSources(
  sources: readonly Pick<
    PolicyWatchSource,
    'acquisitionMethod' | 'adapterKind' | 'families' | 'healthStatus' | 'sourceType' | 'url'
  >[],
): PolicyWatchCoverageStatus {
  if (sources.length === 0) return 'missing_source'
  const automationStatus = policyWatchAutomationStatusForSources(sources)
  if (automationStatus === 'automated' || automationStatus === 'signal_only') return 'covered'
  if (automationStatus === 'blocked') return 'blocked'
  return 'manual_review'
}

function policyWatchQualityForCoverage(input: {
  family: PolicyWatchFamily
  status: PolicyWatchCoverageStatus
  automationStatus: PolicyWatchAutomationStatus
  sources: readonly PolicyWatchSource[]
}): PolicyWatchCoverageQuality {
  if (input.status === 'blocked' || input.automationStatus === 'blocked') return 'blocked'
  if (input.status === 'manual_review' || input.automationStatus === 'manual_review') {
    return 'manual'
  }
  if (input.automationStatus === 'signal_only') return 'partial'
  return input.sources.some((source) => source.families.length === 1) ? 'strong' : 'partial'
}

function policyWatchRiskReason(input: {
  family: PolicyWatchFamily
  status: PolicyWatchCoverageStatus
  automationStatus: PolicyWatchAutomationStatus
  quality: PolicyWatchCoverageQuality
  sources: readonly PolicyWatchSource[]
}): string | null {
  if (input.status === 'missing_source') {
    return `No ${input.family} policy-watch source is registered.`
  }
  if (input.status === 'blocked' || input.automationStatus === 'blocked') {
    return `All registered ${input.family} policy-watch sources are failing or paused.`
  }
  if (input.automationStatus === 'manual_review') {
    return `Only manual-review ${input.family} policy-watch sources are registered.`
  }
  if (input.automationStatus === 'signal_only') {
    return `${input.family} coverage is signal-only until a reliable automated parser is available.`
  }
  if (input.quality === 'partial' && input.sources.some((source) => source.families.length > 1)) {
    return `${input.family} coverage uses a combined announcement source, not a dedicated family source.`
  }
  return null
}

function baselinePolicyWatchSource(source: RuleSource): PolicyWatchSource {
  return {
    id: source.id,
    jurisdiction: source.jurisdiction,
    title: source.title,
    url: source.url,
    sourceType: source.sourceType,
    acquisitionMethod: source.acquisitionMethod,
    cadence: source.cadence,
    priority: source.priority,
    healthStatus: source.healthStatus,
    families: ['baseline_rule'],
    visibleInSourcesPage: true,
    alertPurpose: source.alertPurpose,
    ...(source.adapterKind ? { adapterKind: source.adapterKind } : {}),
    ...(source.feedUrl ? { feedUrl: source.feedUrl } : {}),
  }
}

function hiddenPolicyAnnouncementSource(jurisdiction: RuleJurisdiction): PolicyWatchSource | null {
  const registered = listRuleSources(jurisdiction).filter(isTemporaryAnnouncementSource)
  const preferred =
    registered.find(isCoveredTemporaryAnnouncementSource) ??
    registered.find((source) => source.healthStatus !== 'failing') ??
    registered[0]

  if (!preferred) return null

  return {
    id: `policy-watch.${jurisdiction.toLowerCase()}.announcements`,
    jurisdiction,
    title:
      jurisdiction === 'FED'
        ? 'Federal tax news and disaster relief watch'
        : `${jurisdiction} tax news and disaster relief watch`,
    url: preferred.url,
    sourceType: preferred.sourceType,
    acquisitionMethod: preferred.acquisitionMethod,
    cadence: 'daily',
    priority: preferred.priority === 'critical' ? 'critical' : 'high',
    healthStatus: preferred.healthStatus,
    families: ['tax_news', 'disaster_relief'],
    visibleInSourcesPage: false,
    alertPurpose: 'hidden_policy_watch',
    derivedFromSourceIds: [preferred.id],
    ...(preferred.adapterKind ? { adapterKind: preferred.adapterKind } : {}),
    ...(preferred.feedUrl ? { feedUrl: preferred.feedUrl } : {}),
  }
}

export function listHiddenPolicyWatchSources(
  jurisdiction?: RuleJurisdiction,
): readonly PolicyWatchSource[] {
  const jurisdictions = jurisdiction ? [jurisdiction] : MVP_RULE_JURISDICTIONS
  return jurisdictions
    .map(hiddenPolicyAnnouncementSource)
    .filter((source): source is PolicyWatchSource => Boolean(source))
}

const STALE_OR_REDIRECTED_POLICY_WATCH_URLS = new Set([
  'https://tax.colorado.gov/newsroom',
  'https://www.revenue.nh.gov/',
  'https://tax.vermont.gov/',
  'https://portal.ct.gov/drs/news-releases',
  'https://www.revenue.pa.gov/News-and-Statistics/Pages/default.aspx',
  'https://tax.nv.gov/News/Tax_Notes/',
])

const GENERIC_POLICY_WATCH_URLS = new Set([
  'https://dor.alaska.gov/',
  'https://www.dfa.arkansas.gov/',
  'https://revenue.delaware.gov/',
  'https://dor.sc.gov/index.php/',
  'https://tax.wv.gov/',
  'https://www.revenue.wi.gov/',
  'https://revenue.wyo.gov/',
])

function policyWatchSourceReliability(source: PolicyWatchSource): {
  quality: PolicyWatchSourceReliabilityQuality
  failureReason: string | null
  recommendedAction: string | null
} {
  const url = source.feedUrl ?? source.url
  if (STALE_OR_REDIRECTED_POLICY_WATCH_URLS.has(url)) {
    return {
      quality: 'stale_or_redirected',
      failureReason:
        'The source URL is known to redirect to an error page, stale path, or generic agency page.',
      recommendedAction: 'Replace it with the current official tax-specific news or update source.',
    }
  }
  if (urlLooksPdf(url) && source.adapterKind !== 'pdf_index') {
    return {
      quality: 'stale_pdf_root',
      failureReason: 'A single PDF cannot serve as an ongoing announcement source root.',
      recommendedAction:
        'Replace it with an official PDF index, archive, feed, or announcement list.',
    }
  }
  if (GENERIC_POLICY_WATCH_URLS.has(url)) {
    return {
      quality: 'reachable_but_generic',
      failureReason:
        'The source is an agency homepage or generic landing page rather than a tax update list.',
      recommendedAction:
        'Replace it with an official tax news, alert, update, relief, or notice list.',
    }
  }
  if (
    url.includes('public.govdelivery.com/accounts/OHTAX/subscriber/new') &&
    source.adapterKind !== 'email_inbound'
  ) {
    return {
      quality: 'needs_replacement',
      failureReason:
        'The source is a subscription page, not an archive of individual tax alert items.',
      recommendedAction:
        'Connect the GovDelivery inbox/archive or replace it with a current Ohio Tax Alert index.',
    }
  }
  return {
    quality: 'parser_ready',
    failureReason: null,
    recommendedAction: null,
  }
}

export function listPolicyWatchSourceReliabilityAudit(
  jurisdiction?: RuleJurisdiction,
): readonly PolicyWatchSourceReliabilityAuditRow[] {
  return listHiddenPolicyWatchSources(jurisdiction).flatMap((source) => {
    const reliability = policyWatchSourceReliability(source)
    return source.families.map((family) => ({
      jurisdiction: source.jurisdiction,
      family,
      sourceId: source.id,
      title: source.title,
      url: source.feedUrl ?? source.url,
      finalUrl: null,
      httpStatus: null,
      contentType: null,
      acquisitionMethod: source.acquisitionMethod,
      adapterKind: source.adapterKind ?? null,
      quality: reliability.quality,
      failureReason: reliability.failureReason,
      recommendedAction: reliability.recommendedAction,
    }))
  })
}

export function listPolicyWatchSources(
  jurisdiction?: RuleJurisdiction,
): readonly PolicyWatchSource[] {
  const jurisdictions = jurisdiction ? [jurisdiction] : MVP_RULE_JURISDICTIONS
  const baseline = jurisdictions.flatMap((currentJurisdiction) =>
    listRuleSources(currentJurisdiction)
      .filter((source) => source.authorityRole === 'basis')
      .map(baselinePolicyWatchSource),
  )
  return [...baseline, ...listHiddenPolicyWatchSources(jurisdiction)]
}

function familyCoverage(
  family: PolicyWatchFamily,
  sources: readonly PolicyWatchSource[],
): PolicyWatchFamilyCoverage {
  const matchingSources = sources.filter((source) => source.families.includes(family))
  const hiddenSourceIds = matchingSources
    .filter((source) => !source.visibleInSourcesPage)
    .map((source) => source.id)
  const status = policyWatchStatusForSources(matchingSources)
  const automationStatus = policyWatchAutomationStatusForSources(matchingSources)
  const quality = policyWatchQualityForCoverage({
    family,
    status,
    automationStatus,
    sources: matchingSources,
  })
  const riskReason = policyWatchRiskReason({
    family,
    status,
    automationStatus,
    quality,
    sources: matchingSources,
  })
  return {
    family,
    status,
    automationStatus,
    quality,
    sourceIds: matchingSources.map((source) => source.id),
    hiddenSourceIds,
    missingReason:
      status === 'missing_source' ? `No ${family} policy-watch source is registered.` : null,
    riskReason,
  }
}

export function listNationalPolicyWatchCoverage(
  jurisdiction?: RuleJurisdiction,
): readonly PolicyWatchCoverage[] {
  const jurisdictions = jurisdiction ? [jurisdiction] : MVP_RULE_JURISDICTIONS
  return jurisdictions.map((currentJurisdiction) => {
    const sources = listPolicyWatchSources(currentJurisdiction)
    return {
      jurisdiction: currentJurisdiction,
      families: [
        familyCoverage('baseline_rule', sources),
        familyCoverage('tax_news', sources),
        familyCoverage('disaster_relief', sources),
      ],
    }
  })
}

export function listPolicyWatchCoverageAudit(
  jurisdiction?: RuleJurisdiction,
): readonly PolicyWatchCoverageAuditRow[] {
  return listNationalPolicyWatchCoverage(jurisdiction).map((coverage) => ({
    jurisdiction: coverage.jurisdiction,
    families: coverage.families,
    riskReasons: coverage.families.flatMap((family) =>
      family.riskReason ? [`${family.family}: ${family.riskReason}`] : [],
    ),
  }))
}

function sourceAutomationRemediationSource(
  source: PolicyWatchSource,
): SourceAutomationRemediationSource {
  const suggestedAdapterKind = parserBackedAdapterKindForSource(source)
  return {
    sourceId: source.id,
    title: source.title,
    url: source.feedUrl ?? source.url,
    acquisitionMethod: source.acquisitionMethod,
    adapterKind: source.adapterKind ?? null,
    suggestedAdapterKind,
    healthStatus: source.healthStatus,
    parserBacked: suggestedAdapterKind !== null,
  }
}

export function listSourceAutomationRemediationAudit(
  jurisdiction?: RuleJurisdiction,
): readonly SourceAutomationRemediationAuditRow[] {
  const jurisdictions = jurisdiction ? [jurisdiction] : MVP_RULE_JURISDICTIONS
  return jurisdictions.map((currentJurisdiction) => {
    const sources = listPolicyWatchSources(currentJurisdiction)
    const coverage = listNationalPolicyWatchCoverage(currentJurisdiction)[0]
    if (!coverage) {
      return {
        jurisdiction: currentJurisdiction,
        families: [],
      }
    }

    return {
      jurisdiction: currentJurisdiction,
      families: coverage.families.map((family) => {
        const familySources = sources.filter((source) => source.families.includes(family.family))
        return {
          family: family.family,
          status: family.status,
          automationStatus: family.automationStatus,
          quality: family.quality,
          sourceIds: family.sourceIds,
          hiddenSourceIds: family.hiddenSourceIds,
          missingReason: family.missingReason,
          riskReason: family.riskReason,
          sources: familySources.map(sourceAutomationRemediationSource),
          needsRemediation:
            family.automationStatus !== 'automated' ||
            family.quality !== 'strong' ||
            familySources.some(
              (source) =>
                source.healthStatus === 'failing' ||
                source.healthStatus === 'paused' ||
                !parserBackedAdapterKindForSource(source),
            ),
        }
      }),
    }
  })
}

export function listSourceCoverageGaps(
  jurisdiction?: RuleJurisdiction,
): readonly RequiredSourceCoverageCell[] {
  return listRequiredSourceCoverage(jurisdiction).filter((cell) => cell.status === 'missing_source')
}

export function listObligationRules(
  input: {
    jurisdiction?: RuleJurisdiction
    status?: RuleStatus
    includeCandidates?: boolean
  } = {},
): readonly ObligationRule[] {
  const includeCandidates = input.includeCandidates ?? false

  return OBLIGATION_RULES.filter((rule) => {
    if (input.jurisdiction && rule.jurisdiction !== input.jurisdiction) return false
    if (input.status && rule.status !== input.status) return false
    if (!includeCandidates && rule.status === 'candidate') return false
    return true
  })
}

export function findRuleById(id: string): ObligationRule | undefined {
  return OBLIGATION_RULES.find((rule) => rule.id === id)
}

// Reverse index for drift detection: which rules cite a given official source.
// Defaults to verified rules only — candidates already carry their own
// source_defined_calendar concrete-draft regeneration path.
export function rulesBySourceId(
  sourceId: string,
  options: { status?: RuleStatus } = {},
): readonly ObligationRule[] {
  const status = options.status ?? 'verified'
  return OBLIGATION_RULES.filter(
    (rule) => rule.status === status && rule.sourceIds.includes(sourceId),
  )
}

// When a rule names a source as its `basis` authority, return the excerpt the
// rule was verified against — used to detect "our cited basis text no longer
// appears in the changed source". Returns null when the source is not a basis
// for the rule (or carries no excerpt).
export function ruleCitesSourceAsBasis(
  rule: Pick<ObligationRule, 'evidence'>,
  sourceId: string,
): string | null {
  for (const evidence of rule.evidence) {
    if (evidence.sourceId !== sourceId) continue
    if (evidence.authorityRole !== 'basis') continue
    if (evidence.sourceExcerpt.length === 0) continue
    return evidence.sourceExcerpt
  }
  return null
}

export function isTaxYearDrivenRule(rule: Pick<ObligationRule, 'dueDateLogic'>): boolean {
  return (
    rule.dueDateLogic.kind === 'nth_day_after_tax_year_end' ||
    rule.dueDateLogic.kind === 'nth_day_after_tax_year_begin'
  )
}

export function isLegacyTaxYearProfileTaxType(taxType: string): boolean {
  const normalized = taxType
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return [
    /(^|_)1120_s($|_)/,
    /(^|_)1120s($|_)/,
    /(^|_)1120($|_)/,
    /(^|_)1065($|_)/,
    /(^|_)1041($|_)/,
    /(^|_)990($|_)/,
    /(^|_)990_ez($|_)/,
    /(^|_)990_pf($|_)/,
  ].some((pattern) => pattern.test(normalized))
}

export function canEditTaxYearProfileForObligation(input: {
  rule?: Pick<ObligationRule, 'dueDateLogic'> | null | undefined
  taxType: string
  taxYearType?: 'calendar' | 'fiscal' | null | undefined
  taxPeriodKind?: 'calendar' | 'fiscal' | 'short' | '52_53_week' | 'unknown' | null | undefined
}): boolean {
  if (input.rule && isTaxYearDrivenRule(input.rule)) return true
  if (input.taxYearType === 'fiscal') return true
  if (input.taxPeriodKind === 'fiscal' || input.taxPeriodKind === 'short') return true
  if (input.rule) return false
  return isLegacyTaxYearProfileTaxType(input.taxType)
}

export function normalizeRuleTaxTypeCandidates(taxType: string): readonly RuleTaxTypeCandidate[] {
  const candidates: RuleTaxTypeCandidate[] = [
    {
      inputTaxType: taxType,
      taxType,
      requiresReview: false,
      reviewReason: null,
    },
  ]

  const stateBusinessIncomeFranchise = /^([a-z]{2})_state_business_income_franchise_tax$/.exec(
    taxType,
  )
  if (stateBusinessIncomeFranchise) {
    const prefix = stateBusinessIncomeFranchise[1]
    candidates.push(
      {
        inputTaxType: taxType,
        taxType: `${prefix}_state_business_income_tax`,
        requiresReview: true,
        reviewReason: 'state_business_income_franchise_tax_split_required',
      },
      {
        inputTaxType: taxType,
        taxType: `${prefix}_state_franchise_or_entity_tax`,
        requiresReview: true,
        reviewReason: 'state_business_income_franchise_tax_split_required',
      },
    )
  }

  for (const alias of RULE_TAX_TYPE_ALIASES[taxType] ?? []) {
    if (candidates.some((candidate) => candidate.taxType === alias.taxType)) continue

    candidates.push({
      inputTaxType: taxType,
      taxType: alias.taxType,
      requiresReview: alias.requiresReview ?? false,
      reviewReason: alias.reason ?? null,
    })
  }

  return candidates
}

function ruleMatchesJurisdiction(rule: ObligationRule, client: RuleGenerationClientFacts): boolean {
  return rule.jurisdiction === 'FED' || rule.jurisdiction === client.state
}

function ruleMatchesEntity(rule: ObligationRule, client: RuleGenerationClientFacts): boolean {
  const entityType = client.entityType
  if (
    rule.jurisdiction === 'FED' &&
    client.taxClassification &&
    client.taxClassification !== 'unknown'
  ) {
    if (client.taxClassification === 'disregarded_entity') {
      return (
        rule.entityApplicability.includes('sole_prop') ||
        rule.entityApplicability.includes('individual') ||
        rule.entityApplicability.includes('any_business')
      )
    }
    if (client.taxClassification === 'individual') {
      return rule.entityApplicability.includes('individual')
    }
    if (client.taxClassification === 'partnership') {
      return (
        rule.entityApplicability.includes('partnership') ||
        rule.entityApplicability.includes('any_business')
      )
    }
    if (client.taxClassification === 's_corp') {
      return (
        rule.entityApplicability.includes('s_corp') ||
        rule.entityApplicability.includes('any_business')
      )
    }
    if (client.taxClassification === 'c_corp') {
      return (
        rule.entityApplicability.includes('c_corp') ||
        rule.entityApplicability.includes('any_business')
      )
    }
    if (client.taxClassification === 'trust' || client.taxClassification === 'estate') {
      return rule.entityApplicability.includes('trust')
    }
    if (
      client.taxClassification === 'nonprofit' ||
      client.taxClassification === 'foreign_reporting_company'
    ) {
      return rule.entityApplicability.includes('any_business')
    }
  }
  if (entityType !== 'other' && rule.entityApplicability.includes(entityType)) return true
  if (!rule.entityApplicability.includes('any_business')) return false

  return entityType !== 'individual' && entityType !== 'trust'
}

function getTaxTypeMatches(client: RuleGenerationClientFacts): readonly RuleTaxTypeCandidate[] {
  const matches = new Map<string, RuleTaxTypeCandidate>()

  for (const taxType of client.taxTypes) {
    for (const candidate of normalizeRuleTaxTypeCandidates(taxType)) {
      const existing = matches.get(candidate.taxType)
      if (existing && !existing.requiresReview) continue
      matches.set(candidate.taxType, candidate)
    }
  }

  return [...matches.values()]
}

function reviewReasonsForRule(
  rule: ObligationRule,
  match: RuleTaxTypeCandidate,
  expandedRequiresReview: boolean,
  expandedReason: string | null,
  missingLocalFacts: readonly LocalFactRequirement[],
): string[] {
  const reasons: string[] = []

  if (match.requiresReview && match.reviewReason) reasons.push(match.reviewReason)
  if (rule.requiresApplicabilityReview) reasons.push('rule_requires_applicability_review')
  if (rule.ruleTier === 'applicability_review') reasons.push('rule_tier_applicability_review')
  if (rule.coverageStatus !== 'full') reasons.push(`coverage_${rule.coverageStatus}`)
  if (missingLocalFacts.length > 0) reasons.push('local_fact_requirements_missing')
  if (expandedRequiresReview) reasons.push('due_date_requires_review')
  if (expandedReason) reasons.push(expandedReason)

  return Array.from(new Set(reasons))
}

function missingLocalClientFacts(
  rule: Pick<ObligationRule, 'localFactRequirements'>,
  client: Pick<RuleGenerationClientFacts, 'localFacts'>,
): LocalFactRequirement[] {
  return (rule.localFactRequirements ?? []).filter((fact) => {
    const value = client.localFacts?.[fact]
    return value === undefined || value.trim().length === 0
  })
}

export function previewObligationsFromRules(
  input: RuleGenerationInput,
): readonly ObligationGenerationPreview[] {
  const rules = input.rules ?? OBLIGATION_RULES
  const taxTypeMatches = getTaxTypeMatches(input.client)
  const previews: ObligationGenerationPreview[] = []

  for (const rule of rules) {
    if (rule.status !== 'verified') continue
    if (!ruleMatchesJurisdiction(rule, input.client)) continue
    if (!ruleMatchesEntity(rule, input.client)) continue

    const match = taxTypeMatches.find((candidate) => candidate.taxType === rule.taxType)
    if (!match) continue

    const fallbackTaxYear = rule.taxYear
    const explicitPeriod = resolveTaxPeriodFromExplicitDates(
      Object.assign(
        { source: input.client.taxPeriodSource ?? 'manual_cpa_confirmed' },
        input.client.taxYearStart !== undefined
          ? { taxPeriodStart: input.client.taxYearStart }
          : {},
        input.client.taxYearEnd !== undefined ? { taxPeriodEnd: input.client.taxYearEnd } : {},
      ),
    )
    const hasExplicitPeriod =
      input.client.taxYearStart !== undefined && input.client.taxYearEnd !== undefined
    const taxPeriod =
      hasExplicitPeriod && explicitPeriod.taxPeriodStart && explicitPeriod.taxPeriodEnd
        ? explicitPeriod
        : hasExplicitPeriod
          ? {
              taxPeriodStart: null,
              taxPeriodEnd: null,
              taxPeriodKind: 'unknown' as const,
              taxPeriodSource: input.client.taxPeriodSource ?? ('unknown' as const),
              taxPeriodReviewReason: null,
              missingClientFacts: [],
            }
          : resolveClientReturnTaxPeriod({
              taxYear: fallbackTaxYear,
              client: Object.assign(
                {},
                input.client.taxYearType !== undefined
                  ? { taxYearType: input.client.taxYearType }
                  : {},
                input.client.fiscalYearEndMonth !== undefined
                  ? { fiscalYearEndMonth: input.client.fiscalYearEndMonth }
                  : {},
                input.client.fiscalYearEndDay !== undefined
                  ? { fiscalYearEndDay: input.client.fiscalYearEndDay }
                  : {},
              ),
              source: input.client.taxPeriodSource ?? 'client_default',
            })

    const expandInput: {
      taxYearStart?: string
      taxYearEnd?: string
      holidays?: readonly string[]
    } = {}
    if (input.client.taxYearStart !== undefined) {
      expandInput.taxYearStart = input.client.taxYearStart
    } else if (taxPeriod.taxPeriodStart) {
      expandInput.taxYearStart = taxPeriod.taxPeriodStart
    }
    if (input.client.taxYearEnd !== undefined) {
      expandInput.taxYearEnd = input.client.taxYearEnd
    } else if (taxPeriod.taxPeriodEnd) {
      expandInput.taxYearEnd = taxPeriod.taxPeriodEnd
    }
    if (input.holidays !== undefined) expandInput.holidays = input.holidays

    const expandedDates = expandDueDateLogic(rule.dueDateLogic, expandInput)
    const missingLocalFacts = missingLocalClientFacts(rule, input.client)
    const missingClientFacts: RuleGenerationMissingClientFact[] = [
      ...taxPeriod.missingClientFacts,
      ...missingLocalFacts,
    ]

    for (const expanded of expandedDates) {
      const reviewReasons = reviewReasonsForRule(
        rule,
        match,
        missingClientFacts.length > 0 ? false : expanded.requiresReview,
        missingClientFacts.length > 0 ? null : expanded.reason,
        missingLocalFacts,
      )
      if (taxPeriod.taxPeriodReviewReason && missingClientFacts.length === 0) {
        reviewReasons.push(taxPeriod.taxPeriodReviewReason)
      }
      const requiresReview = reviewReasons.length > 0

      previews.push({
        clientId: input.client.id,
        ruleId: rule.id,
        ruleVersion: rule.version,
        ruleTitle: rule.title,
        jurisdiction: rule.jurisdiction,
        ...(rule.localJurisdiction ? { localJurisdiction: rule.localJurisdiction } : {}),
        ...(rule.localFactRequirements
          ? { localFactRequirements: rule.localFactRequirements }
          : {}),
        taxType: rule.taxType,
        matchedTaxType: match.inputTaxType,
        period: expanded.period,
        dueDate: expanded.dueDate,
        taxPeriodStart: taxPeriod.taxPeriodStart,
        taxPeriodEnd: taxPeriod.taxPeriodEnd,
        taxPeriodKind: taxPeriod.taxPeriodKind,
        taxPeriodSource: taxPeriod.taxPeriodSource,
        taxPeriodReviewReason: taxPeriod.taxPeriodReviewReason,
        eventType: rule.eventType,
        isFiling: rule.isFiling,
        isPayment: rule.isPayment,
        formName: rule.formName,
        sourceIds: rule.sourceIds,
        evidence: rule.evidence,
        requiresReview,
        reminderReady: !requiresReview && expanded.dueDate !== null,
        reviewReasons,
        missingClientFacts,
      })
    }
  }

  return previews
}

export function listSourcesByNotificationChannel(
  channel: RuleNotificationChannel,
): readonly RuleSource[] {
  return RULE_SOURCES.filter((source) => {
    const channels: readonly RuleNotificationChannel[] = source.notificationChannels
    return channels.includes(channel)
  })
}

export function getMvpRuleCoverage(): readonly {
  jurisdiction: RuleJurisdiction
  sourceCount: number
  verifiedRuleCount: number
  candidateCount: number
  highPrioritySourceCount: number
}[] {
  return MVP_RULE_JURISDICTIONS.map((jurisdiction) => {
    const sources = listRuleSources(jurisdiction)
    const rules = OBLIGATION_RULES.filter((rule) => rule.jurisdiction === jurisdiction)
    return {
      jurisdiction,
      sourceCount: sources.length,
      verifiedRuleCount: rules.filter((rule) => rule.status === 'verified').length,
      candidateCount: rules.filter((rule) => rule.status === 'candidate').length,
      highPrioritySourceCount: sources.filter(
        (source) => source.priority === 'critical' || source.priority === 'high',
      ).length,
    }
  })
}
