import * as z from 'zod'

import {
  RuleGenerationPreviewInputSchema,
  RuleGenerationStateValues,
  RuleJurisdictionValues,
  type ClientPublic,
  type DueDateLogic,
  type ObligationGenerationPreview,
  type ObligationInstancePublic,
  type ObligationRule,
  type RuleEvidenceAuthorityRole,
  type RuleGenerationPreviewInput,
  type RuleGenerationState,
  type RuleJurisdiction,
  type RuleSource,
} from '@duedatehq/contracts'

export type SourceHealthFilter = 'all' | RuleSource['healthStatus']
export type RuleLibraryFilter =
  | 'all'
  | 'active'
  | 'pending_review'
  | 'rejected'
  | 'archived'
  | 'verified'
  | 'candidate'
  | 'applicability_review'
  | 'exception'
export type CoverageCellState = 'verified' | 'review' | 'none'

export const RULE_JURISDICTIONS: RuleJurisdiction[] = [...RuleJurisdictionValues]
export const RULE_GENERATION_STATES: RuleGenerationState[] = [...RuleGenerationStateValues]
export const ENTITY_COLUMN_GROUPS = {
  business: ['llc', 'partnership', 's_corp', 'c_corp', 'sole_prop'],
  personal: ['individual', 'trust'],
  all: ['individual', 'trust', 'llc', 'partnership', 's_corp', 'c_corp', 'sole_prop'],
} as const
export const COVERAGE_ENTITY_GROUPS = ['business', 'personal', 'all'] as const
export const DEFAULT_COVERAGE_ENTITY_GROUP = 'business'
export type CoverageEntityGroup = (typeof COVERAGE_ENTITY_GROUPS)[number]
export type CoverageEntityColumn = (typeof ENTITY_COLUMN_GROUPS)['all'][number]
type EntityCoverageState = Record<CoverageEntityColumn, CoverageCellState>

export const RULE_JURISDICTION_LABELS: Record<string, string> = {
  FED: 'Federal',
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
}

export function jurisdictionLabel(jurisdiction: string): string {
  return RULE_JURISDICTION_LABELS[jurisdiction] ?? jurisdiction
}

const REVIEW_COVERAGE: EntityCoverageState = {
  llc: 'review',
  partnership: 'review',
  s_corp: 'review',
  c_corp: 'review',
  sole_prop: 'review',
  individual: 'review',
  trust: 'review',
}

const COVERAGE_OVERRIDES: Partial<Record<RuleJurisdiction, EntityCoverageState>> = {
  FED: {
    llc: 'review',
    partnership: 'review',
    s_corp: 'verified',
    c_corp: 'verified',
    sole_prop: 'review',
    individual: 'review',
    trust: 'review',
  },
  CA: {
    llc: 'review',
    partnership: 'none',
    s_corp: 'verified',
    c_corp: 'verified',
    sole_prop: 'review',
    individual: 'review',
    trust: 'review',
  },
  NY: {
    llc: 'review',
    partnership: 'review',
    s_corp: 'review',
    c_corp: 'verified',
    sole_prop: 'review',
    individual: 'review',
    trust: 'review',
  },
  TX: {
    llc: 'review',
    partnership: 'review',
    s_corp: 'review',
    c_corp: 'review',
    sole_prop: 'review',
    individual: 'review',
    trust: 'review',
  },
  FL: {
    llc: 'none',
    partnership: 'none',
    s_corp: 'none',
    c_corp: 'review',
    sole_prop: 'review',
    individual: 'review',
    trust: 'review',
  },
  WA: {
    llc: 'review',
    partnership: 'review',
    s_corp: 'review',
    c_corp: 'review',
    sole_prop: 'review',
    individual: 'review',
    trust: 'review',
  },
}

export function coverageCellState(
  jurisdiction: RuleJurisdiction,
  entity: CoverageEntityColumn,
): CoverageCellState {
  return (COVERAGE_OVERRIDES[jurisdiction] ?? REVIEW_COVERAGE)[entity]
}

export const PREVIEW_ENTITY_OPTIONS = [
  'llc',
  's_corp',
  'partnership',
  'c_corp',
  'sole_prop',
  'trust',
  'individual',
  'other',
] as const satisfies readonly ClientPublic['entityType'][]
export const DEFAULT_PREVIEW_CALENDAR_YEAR = 2026

export const previewFormSchema = z.object({
  clientId: z.string().min(1),
  entityType: z.enum(PREVIEW_ENTITY_OPTIONS),
  state: z.enum(RuleGenerationStateValues),
  taxYearStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  taxYearEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  taxTypes: z.string().min(1),
})

export type PreviewFormValues = z.infer<typeof previewFormSchema>

export function isPreviewGenerationState(
  value: string | null | undefined,
): value is RuleGenerationState {
  return (
    typeof value === 'string' && (RuleGenerationStateValues as readonly string[]).includes(value)
  )
}

export function previewTaxTypesFromObligations(
  obligations: readonly Pick<ObligationInstancePublic, 'taxType'>[],
): string[] {
  return Array.from(new Set(obligations.map((obligation) => obligation.taxType).filter(Boolean)))
}

export function previewCalendarYearFromObligations(
  obligations: readonly Pick<ObligationInstancePublic, 'taxYear'>[],
): number {
  const years = obligations
    .map((obligation) => obligation.taxYear)
    .filter((year): year is number => typeof year === 'number')
  return years.length > 0 ? Math.max(...years) : DEFAULT_PREVIEW_CALENDAR_YEAR
}

export function previewFormValuesForClient(input: {
  client: Pick<ClientPublic, 'id' | 'entityType' | 'state'>
  taxTypes: readonly string[]
  calendarYear?: number
}): PreviewFormValues {
  const dates = previewCalendarYearToFormDates(input.calendarYear ?? DEFAULT_PREVIEW_CALENDAR_YEAR)
  return previewFormSchema.parse({
    clientId: input.client.id,
    entityType: input.client.entityType,
    state: input.client.state,
    taxYearStart: dates.taxYearStart,
    taxYearEnd: dates.taxYearEnd,
    taxTypes: input.taxTypes.join(', '),
  })
}

export function previewCalendarYearToFormDates(
  year: number,
): Pick<PreviewFormValues, 'taxYearStart' | 'taxYearEnd'> {
  return {
    taxYearStart: `${year}-01-01`,
    taxYearEnd: `${year - 1}-12-31`,
  }
}

export function previewCalendarYearFromFormDates(
  values: Pick<PreviewFormValues, 'taxYearStart' | 'taxYearEnd'>,
): number {
  const startYear = parseIsoYear(values.taxYearStart)
  if (startYear !== null) return startYear

  const endYear = parseIsoYear(values.taxYearEnd)
  if (endYear !== null) return endYear + 1

  return DEFAULT_PREVIEW_CALENDAR_YEAR
}

export function previewFormToInput(values: PreviewFormValues): RuleGenerationPreviewInput {
  const input = {
    client: {
      id: values.clientId.trim(),
      entityType: values.entityType,
      state: values.state,
      taxYearStart: values.taxYearStart,
      taxYearEnd: values.taxYearEnd,
      taxTypes: values.taxTypes
        .split(/[,\s]+/)
        .map((taxType) => taxType.trim())
        .filter(Boolean),
    },
  }
  return RuleGenerationPreviewInputSchema.parse(input)
}

export function formatEnumLabel(value: string): string {
  return value.replaceAll('_', ' ')
}

function parseIsoYear(value: string): number | null {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(value)
  if (!match) return null
  return Number(match[1])
}

export function compactAcquisitionMethod(method: RuleSource['acquisitionMethod']): string {
  return method.replace(/_(watch|review|subscription)$/, '')
}

export function compactSourceType(sourceType: RuleSource['sourceType']): string {
  if (sourceType === 'publication') return 'pub'
  if (sourceType === 'emergency_relief') return 'emergency'
  if (sourceType === 'early_warning') return 'early-warn'
  return sourceType
}

type SourceHealthOnly = Pick<RuleSource, 'healthStatus'>
type RuleFilterOnly = Pick<ObligationRule, 'ruleTier' | 'status'>
type PreviewReadyOnly = {
  reminderReady: ObligationGenerationPreview['reminderReady']
  missingClientFacts: readonly ObligationGenerationPreview['missingClientFacts'][number][]
}

export function countSourcesByHealth(sources: readonly SourceHealthOnly[]) {
  return {
    all: sources.length,
    healthy: sources.filter((source) => source.healthStatus === 'healthy').length,
    degraded: sources.filter((source) => source.healthStatus === 'degraded').length,
    failing: sources.filter((source) => source.healthStatus === 'failing').length,
    paused: sources.filter((source) => source.healthStatus === 'paused').length,
  }
}

export function filterSources<T extends SourceHealthOnly>(
  sources: readonly T[],
  healthFilter: SourceHealthFilter,
): T[] {
  if (healthFilter === 'all') return [...sources]
  return sources.filter((source) => source.healthStatus === healthFilter)
}

export function countRulesByFilter(rules: readonly RuleFilterOnly[]) {
  return {
    all: rules.length,
    active: rules.filter((rule) => rule.status === 'active' || rule.status === 'verified').length,
    pending_review: rules.filter(
      (rule) => rule.status === 'pending_review' || rule.status === 'candidate',
    ).length,
    rejected: rules.filter((rule) => rule.status === 'rejected').length,
    archived: rules.filter((rule) => rule.status === 'archived').length,
    verified: rules.filter((rule) => rule.status === 'active' || rule.status === 'verified').length,
    candidate: rules.filter(
      (rule) => rule.status === 'pending_review' || rule.status === 'candidate',
    ).length,
    applicability_review: rules.filter((rule) => rule.ruleTier === 'applicability_review').length,
    exception: rules.filter((rule) => rule.ruleTier === 'exception').length,
  }
}

export function filterRules<T extends RuleFilterOnly>(
  rules: readonly T[],
  filter: RuleLibraryFilter,
): T[] {
  if (filter === 'all') return [...rules]
  if (
    filter === 'active' ||
    filter === 'pending_review' ||
    filter === 'rejected' ||
    filter === 'archived'
  ) {
    return rules.filter((rule) => rule.status === filter)
  }
  if (filter === 'verified' || filter === 'candidate') {
    const mapped = filter === 'verified' ? 'active' : 'pending_review'
    return rules.filter((rule) => rule.status === mapped || rule.status === filter)
  }
  return rules.filter((rule) => rule.ruleTier === filter)
}

export function groupPreviewRows<T extends PreviewReadyOnly>(rows: readonly T[]) {
  return {
    reminderReady: rows.filter((row) => row.reminderReady),
    needsClientFacts: rows.filter((row) => !row.reminderReady && row.missingClientFacts.length > 0),
    requiresReview: rows.filter((row) => !row.reminderReady && row.missingClientFacts.length === 0),
  }
}

const ORDINAL_SUFFIX_BY_TENS = ['th', 'st', 'nd', 'rd'] as const

function ordinal(n: number): string {
  const lastTwo = n % 100
  const lastOne = n % 10
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`
  return `${n}${ORDINAL_SUFFIX_BY_TENS[lastOne] ?? 'th'}`
}

function rolloverLabel(rollover: 'source_adjusted' | 'next_business_day'): string {
  return rollover === 'next_business_day' ? 'next business day' : 'source-adjusted'
}

/**
 * Renders a `DueDateLogic` discriminated union into a single human-readable
 * sentence for the Rule Detail drawer.
 *
 * Kept English-only on purpose: rule IDs, tax type slugs, and form names in
 * the surrounding UI are also un-localized internal terminology, and the
 * union shape is fixed by the contract (no localization fan-out risk).
 */
export function humanizeDueDateLogic(logic: DueDateLogic): string {
  if (logic.kind === 'fixed_date') {
    return `Fixed: ${logic.date} · ${rolloverLabel(logic.holidayRollover)} rollover`
  }
  if (logic.kind === 'nth_day_after_tax_year_end') {
    return `${ordinal(logic.day)} day of the ${ordinal(logic.monthOffset)} month after tax year end · ${rolloverLabel(logic.holidayRollover)} rollover`
  }
  if (logic.kind === 'nth_day_after_tax_year_begin') {
    return `${ordinal(logic.day)} day of the ${ordinal(logic.monthOffset)} month after tax year begin · ${rolloverLabel(logic.holidayRollover)} rollover`
  }
  if (logic.kind === 'period_table') {
    return `${logic.frequency} schedule · ${logic.periods.length} periods · ${rolloverLabel(logic.holidayRollover)} rollover`
  }
  return logic.description
}

export const RULE_AUTHORITY_ROLE_LABEL: Record<RuleEvidenceAuthorityRole, string> = {
  basis: 'Basis',
  cross_check: 'Cross-check',
  watch: 'Watch',
  early_warning: 'Early warn',
}
