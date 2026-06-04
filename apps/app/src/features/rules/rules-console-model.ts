import * as z from 'zod'

import {
  RuleGenerationPreviewInputSchema,
  RuleGenerationStateValues,
  type ClientPublic,
  type DueDateLogic,
  type ObligationGenerationPreview,
  type ObligationInstancePublic,
  type ObligationRule,
  type RuleCoverageRow,
  type RuleEvidenceAuthorityRole,
  type RuleGenerationPreviewInput,
  type RuleGenerationState,
  type RuleSource,
  type RuleStatus,
} from '@duedatehq/contracts'
import { ClientTaxClassificationSchema } from '@duedatehq/contracts/shared/enums'

type SourceDisplayHealth = 'healthy' | 'paused'
export type SourceHealthFilter = 'all' | SourceDisplayHealth
export type CoverageCellState = 'active' | 'review' | 'none'

export const RULE_GENERATION_STATES: RuleGenerationState[] = [...RuleGenerationStateValues]
export const ENTITY_COLUMN_GROUPS = {
  business: ['llc', 'partnership', 's_corp', 'c_corp', 'sole_prop'],
  personal: ['individual', 'trust'],
  all: ['individual', 'trust', 'llc', 'partnership', 's_corp', 'c_corp', 'sole_prop'],
} as const
export const COVERAGE_ENTITY_GROUPS = ['business', 'personal', 'all'] as const
export type CoverageEntityColumn = (typeof ENTITY_COLUMN_GROUPS)['all'][number]

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

// ---------------------------------------------------------------------------
// Shared rule-library model — entity + status maps and small pure helpers.
//
// Lifted out of routes/rules.library.tsx (2026-06-04, Yuqi rule-library
// master–detail pivot) so the new states-rail + per-jurisdiction table
// feature components can share the exact same entity ordering, status
// tones, and title-stripping logic as the route WITHOUT importing back
// from the route module (which would create a circular dependency — the
// route imports those feature components). Behaviour is identical to the
// previous in-route definitions; only the home moved.
// ---------------------------------------------------------------------------

export type EntityKey = keyof RuleCoverageRow['entityCoverage']

// Rule-tier label map type, shared so the per-jurisdiction table can
// accept the same `useRuleTierLabels()` output the route produces.
export type RuleTier = ObligationRule['ruleTier']
export type RuleTierLabels = Record<RuleTier, string>

export const ENTITY_KEYS: readonly EntityKey[] = [
  'llc',
  'partnership',
  's_corp',
  'c_corp',
  'sole_prop',
  'individual',
  'trust',
] as const

export const ENTITY_LABELS: Record<EntityKey, string> = {
  llc: 'LLC',
  partnership: 'Partnership',
  s_corp: 'S-Corp',
  c_corp: 'C-Corp',
  sole_prop: 'Sole prop',
  individual: 'Individual',
  trust: 'Trust',
}

// Status sub-grouping. Rules are bucketed into these groups so a
// reviewer reads "needs review / active / …" rather than scanning a
// per-rule status column.
export type StatusGroupKey = 'needs_review' | 'active' | 'rejected' | 'archived' | 'other'

export const STATUS_GROUP_ORDER: readonly StatusGroupKey[] = [
  'needs_review',
  'active',
  'rejected',
  'archived',
  'other',
] as const

export function statusGroupOf(status: RuleStatus): StatusGroupKey {
  if (status === 'pending_review' || status === 'candidate') return 'needs_review'
  if (status === 'active' || status === 'verified') return 'active'
  if (status === 'rejected') return 'rejected'
  if (status === 'archived') return 'archived'
  return 'other'
}

// Status tone palette — `review` is its own tone (accent blue), NOT
// reused with `warning`. Amber/warning is reserved for true caution
// states (paused sources, expiring auth) so the eye learns one
// signal = one meaning.
export const STATUS_TONE: Record<RuleStatus, 'success' | 'review' | 'destructive' | 'muted'> = {
  active: 'success',
  verified: 'success',
  pending_review: 'review',
  candidate: 'review',
  rejected: 'destructive',
  archived: 'muted',
  deprecated: 'muted',
}

// Single-word label per status, used next to the leading status dot
// and inside the per-jurisdiction table's Status column.
export const STATUS_LABEL_SHORT: Record<RuleStatus, string> = {
  active: 'Active',
  verified: 'Verified',
  pending_review: 'Needs review',
  candidate: 'Candidate',
  rejected: 'Rejected',
  archived: 'Archived',
  deprecated: 'Deprecated',
}

// Drop a leading jurisdiction label from a rule title so the same
// state name doesn't repeat down a state-scoped table. "Alabama
// individual income tax" → "Individual income tax".
export function stripJurisdictionPrefix(title: string, jurisLabel: string): string {
  const trimmedTitle = title.trim()
  const label = jurisLabel.trim()
  if (!label) return trimmedTitle
  const lcTitle = trimmedTitle.toLowerCase()
  const lcLabel = label.toLowerCase()
  if (!lcTitle.startsWith(lcLabel)) return trimmedTitle
  let stripped = trimmedTitle.slice(label.length).trimStart()
  // Drop a leading separator if present (em-dash, dash, colon).
  stripped = stripped.replace(/^[-:·—]+\s*/, '')
  if (!stripped) return trimmedTitle
  return stripped.charAt(0).toUpperCase() + stripped.slice(1)
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
export const DEFAULT_PREVIEW_TAX_YEAR = 2025

export const previewFormSchema = z.object({
  clientId: z.string().min(1),
  entityType: z.enum(PREVIEW_ENTITY_OPTIONS),
  taxClassification: ClientTaxClassificationSchema,
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

export function previewTaxYearFromObligations(
  obligations: readonly Pick<ObligationInstancePublic, 'taxYear'>[],
): number {
  const years = obligations
    .map((obligation) => obligation.taxYear)
    .filter((year): year is number => typeof year === 'number')
  return years.length > 0 ? Math.max(...years) : DEFAULT_PREVIEW_TAX_YEAR
}

export function previewFormValuesForClient(input: {
  client: Pick<ClientPublic, 'id' | 'entityType' | 'state'> &
    Partial<Pick<ClientPublic, 'taxClassification'>>
  taxTypes: readonly string[]
  taxYear?: number
}): PreviewFormValues {
  const dates = previewTaxYearToFormDates(input.taxYear ?? DEFAULT_PREVIEW_TAX_YEAR)
  return previewFormSchema.parse({
    clientId: input.client.id,
    entityType: input.client.entityType,
    taxClassification: input.client.taxClassification ?? 'unknown',
    state: input.client.state,
    taxYearStart: dates.taxYearStart,
    taxYearEnd: dates.taxYearEnd,
    taxTypes: input.taxTypes.join(', '),
  })
}

// The preview identifies returns by their real Tax Year (the same convention
// the queue, Add Deadline picker, and rollover CTA use), so the start/end pair
// is the actual span of that tax year. For the calendar filers this preview
// models, Tax Year N runs Jan 1 – Dec 31 of year N; rules keyed off tax-year
// end (e.g. income returns) still resolve to N+1 filing dates, and rules keyed
// off tax-year begin (e.g. CA LLC annual tax) resolve within year N.
export function previewTaxYearToFormDates(
  taxYear: number,
): Pick<PreviewFormValues, 'taxYearStart' | 'taxYearEnd'> {
  return {
    taxYearStart: `${taxYear}-01-01`,
    taxYearEnd: `${taxYear}-12-31`,
  }
}

export function previewTaxYearFromFormDates(
  values: Pick<PreviewFormValues, 'taxYearStart' | 'taxYearEnd'>,
): number {
  const startYear = parseIsoYear(values.taxYearStart)
  if (startYear !== null) return startYear

  const endYear = parseIsoYear(values.taxYearEnd)
  if (endYear !== null) return endYear

  return DEFAULT_PREVIEW_TAX_YEAR
}

export function previewFormToInput(values: PreviewFormValues): RuleGenerationPreviewInput {
  const taxClassification =
    values.taxClassification === 'unknown' ? undefined : values.taxClassification
  const input = {
    client: {
      id: values.clientId.trim(),
      entityType: values.entityType,
      ...(taxClassification ? { taxClassification } : {}),
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

type SourceHealthOnly = Pick<RuleSource, 'healthStatus'>
type PreviewReadyOnly = {
  reminderReady: ObligationGenerationPreview['reminderReady']
  missingClientFacts: readonly ObligationGenerationPreview['missingClientFacts'][number][]
}

export function countSourcesByHealth(sources: readonly SourceHealthOnly[]) {
  const normalized = sources.map((source) => normalizeSourceHealth(source.healthStatus))
  return {
    all: sources.length,
    healthy: normalized.filter((status) => status === 'healthy').length,
    paused: normalized.filter((status) => status === 'paused').length,
  }
}

export function filterSources<T extends SourceHealthOnly>(
  sources: readonly T[],
  healthFilter: SourceHealthFilter,
): T[] {
  if (healthFilter === 'all') return [...sources]
  return sources.filter((source) => normalizeSourceHealth(source.healthStatus) === healthFilter)
}

export function normalizeSourceHealth(
  healthStatus: RuleSource['healthStatus'],
): SourceDisplayHealth {
  return healthStatus === 'paused' ? 'paused' : 'healthy'
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

// 2026-05-26 (Yuqi /critique — P1-4): tooltip-friendly explainer
// for each authority role. The labels above are short for chip
// real estate; these strings spell out what each role means so a
// first-timer hovering the chip understands the classification.
// Stays in plain English (no jargon) so the explainer doesn't
// itself need an explainer.
export const RULE_AUTHORITY_ROLE_DESCRIPTION: Record<RuleEvidenceAuthorityRole, string> = {
  basis: 'Primary source — the authority this rule is based on.',
  cross_check: 'Supporting source that confirms the primary basis.',
  watch: 'Monitoring source — the rule cites this in case the authority changes its position.',
  early_warning: 'Advance signal that the rule may need to change soon.',
}
