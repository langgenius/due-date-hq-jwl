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

export interface RuleSource {
  id: string
  jurisdiction: RuleJurisdiction
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
  notificationChannels: readonly RuleNotificationChannel[]
  lastReviewedOn: string
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
  entityApplicability: readonly EntityApplicability[]
  taxType: string
  formName: string
  eventType: ObligationEventType
  obligationType?: ObligationType
  isFiling: boolean
  isPayment: boolean
  taxYear: number
  applicableYear: number
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
  nextReviewOn: string
  version: number
}

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
  missingClientFacts: readonly TaxPeriodMissingClientFact[]
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
const NEXT_PRE_SEASON_REVIEW = '2026-11-15'

const RULE_TAX_TYPE_ALIASES: Record<
  string,
  readonly { taxType: string; requiresReview?: boolean; reason?: string }[]
> = {
  federal_1040_sch_c: [{ taxType: 'federal_1040' }],
  federal_4868: [{ taxType: 'federal_1040_extension' }],
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
  sourceType?: RuleSourceType
  acquisitionMethod?: AcquisitionMethod
  candidateDomainSlugs?: readonly StateCandidateRuleSlug[]
}

interface StateAdditionalRuleSourceSeed {
  jurisdiction: RuleGenerationState
  id: string
  title: string
  url: string
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
    url: 'https://otr.cfo.dc.gov/page/individual-income-tax',
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
    title: 'Hawaii Department of Taxation Individual Income Tax',
    url: 'https://tax.hawaii.gov/forms/a1_b1_1indinc/',
  },
  {
    jurisdiction: 'ID',
    title: 'Idaho State Tax Commission Individual Income Tax',
    url: 'https://tax.idaho.gov/taxes/income-tax/individual-income/',
  },
  {
    jurisdiction: 'IL',
    title: 'Illinois DOR Due Dates for Filing Returns',
    url: 'https://tax.illinois.gov/individuals/filingrequirements/duedate.html',
  },
  {
    jurisdiction: 'IN',
    title: 'Indiana DOR Individual Income Taxes',
    url: 'https://www.in.gov/dor/individual-income-taxes/',
  },
  {
    jurisdiction: 'IA',
    title: 'Iowa Department of Revenue Individual Income Tax',
    url: 'https://tax.iowa.gov/individual-income-tax',
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
    url: 'https://revenue.louisiana.gov/IndividualIncomeTax',
  },
  {
    jurisdiction: 'ME',
    title: 'Maine Revenue Services Individual Income Tax',
    url: 'https://www.maine.gov/revenue/taxes/individual-income-tax',
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
    url: 'https://www.mass.gov/info-details/dor-due-dates',
  },
  {
    jurisdiction: 'MI',
    title: 'Michigan Department of Treasury Individual Income Tax',
    url: 'https://www.michigan.gov/taxes/iit',
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
    url: 'https://mtrevenue.gov/taxes/individual-income-tax/',
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
    url: 'https://www.revenue.nh.gov/resource-center/frequently-asked-questions/interest-dividends-tax-faqs',
  },
  {
    jurisdiction: 'NJ',
    title: 'New Jersey Division of Taxation Individual Income Tax',
    url: 'https://www.nj.gov/treasury/taxation/njit1.shtml',
  },
  {
    jurisdiction: 'NM',
    title: 'New Mexico Taxation and Revenue Personal Income Tax Information Overview',
    url: 'https://www.tax.newmexico.gov/individuals/personal-income-tax-information-overview/',
    candidateDomainSlugs: ['individual_income_return'],
  },
  {
    jurisdiction: 'NY',
    title: 'New York Tax Department 2026 Tax Filing Dates',
    url: 'https://www.tax.ny.gov/help/calendar/2026.htm',
  },
  {
    jurisdiction: 'NC',
    title: 'North Carolina DOR Individual Income Tax',
    url: 'https://www.ncdor.gov/taxes-forms/individual-income-tax',
  },
  {
    jurisdiction: 'ND',
    title: 'North Dakota Office of State Tax Commissioner Individual Income Tax Deadlines',
    url: 'https://www.tax.nd.gov/individual-income-tax-deadlines',
  },
  {
    jurisdiction: 'OH',
    title: 'Ohio Department of Taxation Annual Filing',
    url: 'https://tax.ohio.gov/individual/resources/annual-filing',
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
    title: 'Pennsylvania DOR Personal Income Tax',
    url: 'https://www.pa.gov/agencies/revenue/resources/tax-types-and-information/pit.html',
  },
  {
    jurisdiction: 'RI',
    title: 'Rhode Island Division of Taxation Personal Income Tax',
    url: 'https://tax.ri.gov/tax-sections/personal-income-tax',
  },
  {
    jurisdiction: 'SC',
    title: 'South Carolina DOR Individual Income Tax',
    url: 'https://dor.sc.gov/tax/individual-income',
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
    title: 'Wisconsin DOR Individual Income Tax',
    url: 'https://www.revenue.wi.gov/Pages/Individuals/income.aspx',
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

const STATE_ADDITIONAL_RULE_SOURCE_SEEDS = [
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
    title: 'California EDD Required Filings and Due Dates',
    url: 'https://edd.ca.gov/en/payroll_taxes/required_filings_and_due_dates/',
    sourceType: 'due_dates',
    acquisitionMethod: 'html_watch',
    domains: ['withholding', 'ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
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
    url: 'https://dor.georgia.gov/document/document/2024-501-and-501x-fiduciary-income-tax-instruction-booklet/download',
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
    title: 'Illinois DOR Business Income Tax Forms',
    url: 'https://tax.illinois.gov/forms/incometax/businesses.html',
    sourceType: 'instructions',
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
    url: 'https://tax.illinois.gov/research/taxinformation/income/fiduciary.html',
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
    url: 'https://tax.illinois.gov/research/publications/pubs/retailers-overview-of-sales-and-use-tax/requirements-for-retailers-who-file-form-st-1.html',
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
    healthStatus: 'degraded',
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
    healthStatus: 'degraded',
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
    healthStatus: 'degraded',
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
    title: 'North Carolina Partnership Tax Forms and Instructions',
    url: 'https://www.ncdor.gov/taxes-forms/partnership-tax/partnership-tax-forms-and-instructions',
    sourceType: 'instructions',
    acquisitionMethod: 'html_watch',
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
    healthStatus: 'degraded',
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
    healthStatus: 'degraded',
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
    healthStatus: 'degraded',
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
    healthStatus: 'degraded',
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
    healthStatus: 'degraded',
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
    healthStatus: 'degraded',
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
    healthStatus: 'degraded',
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
    healthStatus: 'degraded',
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
    id: 'mi.fiduciary_income_tax',
    title: 'Michigan Treasury Fiduciary Filing Guidance',
    url: 'https://www.michigan.gov/taxes/iit/tax-guidance/tax-situations/fiduciary',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['fiduciary_income_return'],
    entityApplicability: ['trust'],
    priority: 'high',
    healthStatus: 'degraded',
  },
  {
    jurisdiction: 'MI',
    id: 'mi.corporate_income_tax',
    title: 'Michigan Treasury Corporate Income Tax',
    url: 'https://www.michigan.gov/taxes/business-taxes/cit',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['business_income_return', 'business_estimated_tax'],
    entityApplicability: ['c_corp'],
    priority: 'critical',
    healthStatus: 'degraded',
  },
  {
    jurisdiction: 'MI',
    id: 'mi.flow_through_entity_tax',
    title: 'Michigan Treasury Flow-Through Entity Tax FAQ',
    url: 'https://www.michigan.gov/taxes/business-taxes/flowthrough-entity-tax/frequently-asked-questions',
    sourceType: 'instructions',
    acquisitionMethod: 'manual_review',
    domains: ['pass_through_entity_return'],
    entityApplicability: ['llc', 'partnership', 's_corp'],
    priority: 'high',
    healthStatus: 'degraded',
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
    healthStatus: 'degraded',
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
    healthStatus: 'degraded',
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
    healthStatus: 'degraded',
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
    healthStatus: 'degraded',
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
    healthStatus: 'degraded',
  },
  {
    jurisdiction: 'TN',
    id: 'tn.franchise_excise_tax',
    title: 'Tennessee DOR Franchise and Excise Tax',
    url: 'https://www.tn.gov/revenue/taxes/franchise---excise-tax.html',
    sourceType: 'instructions',
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
    title: 'Tennessee Unemployment Quarterly Report Due Date',
    url: 'https://lwdsupport.tn.gov/hc/en-us/articles/360001003928-What-is-delinquent-cycle',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    domains: ['ui_wage_report'],
    entityApplicability: ['sole_prop', 'llc', 'partnership', 's_corp', 'c_corp'],
    priority: 'high',
    healthStatus: 'degraded',
  },
  {
    jurisdiction: 'UT',
    id: 'ut.individual_estimated_tax',
    title: 'Utah Individual Income Tax Extensions and Prepayments',
    url: 'https://incometax.utah.gov/general-instructions/#when',
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
    healthStatus: 'degraded',
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
] as const satisfies readonly StateAdditionalRuleSourceSeed[]

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
      sourceType: incomeTaxSource.sourceType ?? 'instructions',
      acquisitionMethod: incomeTaxSource.acquisitionMethod ?? 'manual_review',
      cadence: 'pre_season',
      priority: 'high',
      healthStatus: 'degraded',
      isEarlyWarning: false,
      domains: supportedSlugs,
      entityApplicability: supportedSlugs.includes('individual_estimated_tax')
        ? ['individual', 'sole_prop']
        : ['individual'],
      authorityRole: 'basis',
      notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
      lastReviewedOn: VERIFIED_AT,
    })
  }

  for (const source of STATE_ADDITIONAL_RULE_SOURCE_SEEDS) {
    if (source.jurisdiction !== seed.jurisdiction) continue
    sources.push({
      id: source.id,
      jurisdiction: source.jurisdiction,
      title: source.title,
      url: source.url,
      sourceType: source.sourceType,
      acquisitionMethod: source.acquisitionMethod,
      cadence: 'pre_season',
      priority: source.priority ?? 'high',
      healthStatus: source.healthStatus ?? 'healthy',
      isEarlyWarning: false,
      domains: source.domains,
      entityApplicability: source.entityApplicability,
      authorityRole: 'basis',
      notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
      lastReviewedOn: VERIFIED_AT,
    })
  }

  return sources
})

type RuleSourceSeedRecord = Omit<RuleSource, 'domains' | 'entityApplicability' | 'authorityRole'> &
  Partial<Pick<RuleSource, 'domains' | 'entityApplicability' | 'authorityRole'>>

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

function hydrateRuleSources(sources: readonly RuleSourceSeedRecord[]): readonly RuleSource[] {
  return sources.map((source) => ({
    ...source,
    domains: source.domains ?? defaultSourceDomains(source),
    entityApplicability: source.entityApplicability ?? defaultSourceEntityApplicability(source),
    authorityRole: source.authorityRole ?? defaultSourceAuthorityRole(source),
  }))
}

export const RULE_SOURCES = hydrateRuleSources([
  ...STATE_OFFICIAL_SOURCES,
  {
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
    notificationChannels: ['source_change', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
  },
  {
    id: 'fed.irs_i7004_2025',
    jurisdiction: 'FED',
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
  },
  {
    id: 'ny.tax_calendar.2026',
    jurisdiction: 'NY',
    title: 'New York 2026 Tax Filing Dates',
    url: 'https://www.tax.ny.gov/help/calendar/2026.htm',
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
    url: 'https://comptroller.texas.gov/taxes/franchise/forms/2026-franchise.php',
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
  },
  {
    id: 'wa.excise_due_dates_2026',
    jurisdiction: 'WA',
    title: 'Washington DOR 2026 Excise Tax Return Due Dates',
    url: 'https://dor.wa.gov/file-pay-taxes/filing-frequencies-due-dates/2026-excise-tax-return-due-dates',
    sourceType: 'calendar',
    acquisitionMethod: 'manual_review',
    cadence: 'weekly',
    priority: 'critical',
    healthStatus: 'degraded',
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
    healthStatus: 'degraded',
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
    healthStatus: 'degraded',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review'],
    lastReviewedOn: VERIFIED_AT,
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
    healthStatus: 'degraded',
    isEarlyWarning: false,
    notificationChannels: ['source_change', 'practice_rule_review', 'practice_rule_preview'],
    lastReviewedOn: VERIFIED_AT,
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
  'fed.irs_disaster_relief':
    'IRS publishes notice-specific tax relief by date, listing affected localities and postponed acts.',
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
        sourceExcerpt: `${seed.name} official source registered for ${domain.title}; templates require practice owner or manager acceptance before customer reminders.`,
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

export const OBLIGATION_RULES = [
  ...STATE_CANDIDATE_RULES,
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
    sourceIds: ['fed.irs_pub_509_2026'],
    evidence: [
      sourceEvidence(
        'fed.irs_pub_509_2026',
        'Employment taxes',
        'Publication 509 distinguishes employment tax returns and deposit due dates.',
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
    sourceIds: ['fl.cit', 'fl.cit_due_dates_2026'],
    evidence: [
      sourceEvidence(
        'fl.cit',
        'Extension of Time and Payment of Tentative Tax',
        'F-7004 is filed with tentative payment by the original due date.',
      ),
      sourceEvidence(
        'fl.cit_due_dates_2026',
        'Corporate Income Tax Due Dates',
        'Florida publishes a taxable-year-end due-date table.',
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
    sourceIds: ['fl.cit', 'fl.cit_due_dates_2026'],
    evidence: [
      sourceEvidence(
        'fl.cit',
        'Estimated Tax',
        'Florida estimated tax applies when annual corporate income tax exceeds the threshold.',
      ),
      sourceEvidence(
        'fl.cit_due_dates_2026',
        'Estimated tax due dates table',
        'Florida publishes installment due dates by taxable year end.',
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
] as const satisfies readonly ObligationRule[]

export function listRuleSources(jurisdiction?: RuleJurisdiction): readonly RuleSource[] {
  if (!jurisdiction) return RULE_SOURCES
  return RULE_SOURCES.filter((source) => source.jurisdiction === jurisdiction)
}

export function sourceDomainsForRule(
  rule: Pick<ObligationRule, 'taxType'>,
): readonly RuleSourceDomain[] {
  return STATE_CANDIDATE_RULE_DOMAINS.filter((domain) => rule.taxType.endsWith(domain.taxType)).map(
    (domain) => domain.slug,
  )
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

function sourceVerificationStatus(source: RuleSource): SourceCoverageStatus {
  return source.healthStatus === 'healthy' && source.acquisitionMethod !== 'manual_review'
    ? 'source_verified'
    : 'source_registered'
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
    const sources = listRuleSources(currentJurisdiction)
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
): string[] {
  const reasons: string[] = []

  if (match.requiresReview && match.reviewReason) reasons.push(match.reviewReason)
  if (rule.requiresApplicabilityReview) reasons.push('rule_requires_applicability_review')
  if (rule.ruleTier === 'applicability_review') reasons.push('rule_tier_applicability_review')
  if (rule.coverageStatus !== 'full') reasons.push(`coverage_${rule.coverageStatus}`)
  if (expandedRequiresReview) reasons.push('due_date_requires_review')
  if (expandedReason) reasons.push(expandedReason)

  return Array.from(new Set(reasons))
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
    const missingClientFacts = taxPeriod.missingClientFacts

    for (const expanded of expandedDates) {
      const reviewReasons = reviewReasonsForRule(
        rule,
        match,
        missingClientFacts.length > 0 ? false : expanded.requiresReview,
        missingClientFacts.length > 0 ? null : expanded.reason,
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
