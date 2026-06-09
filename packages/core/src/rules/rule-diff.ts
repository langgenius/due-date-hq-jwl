import type { ObligationRule } from './index'

/**
 * Year-over-year rule comparison used by the rule-review surfaces.
 *
 * A new annual cohort ships year-stamped rules (e.g. `fed.1040.return.2026`)
 * that, today, every firm must review COLD — there is no link to last year's
 * equivalent and no diff. These helpers let the review UI show "same as last
 * year except <these dates>" and let a bulk action accept the date-only cohort
 * in one click while routing genuinely-substantive changes to individual review.
 *
 * Pure + dependency-free so it can live in core and be exhaustively unit-tested.
 */

export type RuleDiffClassification = 'new' | 'date_only' | 'substantive'

export interface RuleFieldDiff {
  /** Field name on ObligationRule that changed. */
  field: string
  /** `date` = a pure date/version refresh; `substantive` = real rule logic change. */
  kind: 'date' | 'substantive'
  before: unknown
  after: unknown
}

export interface RuleDiff {
  /** False when there is no prior-year rule to compare against (first cohort / brand-new rule). */
  hasPredecessor: boolean
  classification: RuleDiffClassification
  /** Only the fields that changed. */
  fields: RuleFieldDiff[]
}

/** The ObligationRule fields compared for review. Order is the display order. */
const COMPARED_FIELDS = [
  'dueDateLogic',
  'extensionPolicy',
  'jurisdiction',
  'formName',
  'eventType',
  'taxType',
  'entityApplicability',
  'isFiling',
  'isPayment',
  'ruleTier',
  'riskLevel',
  'requiresApplicabilityReview',
  'applicableYear',
  'taxYear',
  'version',
  'nextReviewOn',
  'verifiedAt',
] as const satisfies ReadonlyArray<keyof ObligationRule>

/** Fields whose change is, by itself, a routine annual refresh — never substantive. */
const DATE_FIELDS = new Set<keyof ObligationRule>([
  'applicableYear',
  'taxYear',
  'version',
  'verifiedAt',
  'nextReviewOn',
])

/** Order-insensitive set-style comparison for fields like entityApplicability. */
const SET_FIELDS = new Set<keyof ObligationRule>(['entityApplicability'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, index) => deepEqual(value, b[index]))
  }
  if (isRecord(a) && isRecord(b)) {
    const leftKeys = Object.keys(a).toSorted()
    const rightKeys = Object.keys(b).toSorted()
    if (leftKeys.length !== rightKeys.length) return false
    if (!leftKeys.every((key, index) => key === rightKeys[index])) return false
    return leftKeys.every((key) => deepEqual(a[key], b[key]))
  }
  return false
}

/**
 * Is a `dueDateLogic` change a pure date refresh (vs a substantive logic change)?
 * Conservative on purpose — anything that isn't unambiguously "same shape, only
 * date strings moved" is treated as substantive so it can't be bulk-accepted.
 * Call only when the two logics actually differ.
 */
export function isDateOnlyDueDateLogicChange(
  prev: ObligationRule['dueDateLogic'],
  next: ObligationRule['dueDateLogic'],
): boolean {
  // Both guards narrow prev AND next without unsafe casts.
  if (prev.kind === 'fixed_date' && next.kind === 'fixed_date') {
    // Only the literal `date` may move; a holiday-rollover policy change is substantive.
    return prev.holidayRollover === next.holidayRollover
  }
  if (prev.kind === 'period_table' && next.kind === 'period_table') {
    if (prev.frequency !== next.frequency) return false
    if (prev.periods.length !== next.periods.length) return false
    // Same set of period keys → only the per-period dueDate values can differ.
    const beforeKeys = new Set(prev.periods.map((entry) => entry.period))
    return next.periods.every((entry) => beforeKeys.has(entry.period))
  }
  // Different kinds, nth_day_* (offsets are substance), and source_defined_calendar
  // (free-text) are all treated as substantive.
  return false
}

function fieldsEqual(field: keyof ObligationRule, before: unknown, after: unknown): boolean {
  if (SET_FIELDS.has(field)) {
    const beforeSorted = (Array.isArray(before) ? before : []).map(String).toSorted()
    const afterSorted = (Array.isArray(after) ? after : []).map(String).toSorted()
    return deepEqual(beforeSorted, afterSorted)
  }
  return deepEqual(before, after)
}

/**
 * Diff a rule against its prior-year predecessor.
 * - `prev === null` → `{ classification: 'new', hasPredecessor: false }` (review cold).
 * - any substantive field changed → `'substantive'`.
 * - only date-class changes (or none) → `'date_only'` (safe for the bulk accept).
 */
export function diffObligationRules(prev: ObligationRule | null, next: ObligationRule): RuleDiff {
  if (prev === null) {
    return { hasPredecessor: false, classification: 'new', fields: [] }
  }

  const fields: RuleFieldDiff[] = []
  for (const field of COMPARED_FIELDS) {
    const before = prev[field]
    const after = next[field]
    if (fieldsEqual(field, before, after)) continue

    let kind: RuleFieldDiff['kind']
    if (DATE_FIELDS.has(field)) {
      kind = 'date'
    } else if (field === 'dueDateLogic') {
      // Access the typed union directly (prev/next are full rules) — no cast.
      kind = isDateOnlyDueDateLogicChange(prev.dueDateLogic, next.dueDateLogic)
        ? 'date'
        : 'substantive'
    } else {
      kind = 'substantive'
    }
    fields.push({ field, kind, before, after })
  }

  const classification: RuleDiffClassification = fields.some(
    (entry) => entry.kind === 'substantive',
  )
    ? 'substantive'
    : 'date_only'
  return { hasPredecessor: true, classification, fields }
}

/** The authored predecessor link, or null when none was set (first cohort). */
export function resolvePredecessorRuleId(
  rule: Pick<ObligationRule, 'predecessorRuleId'>,
): string | null {
  return rule.predecessorRuleId ?? null
}

/**
 * Best-effort predecessor id derived by decrementing the single 4-digit year
 * token in the id (e.g. `fed.1040.return.2025` → `fed.1040.return.2024`).
 * Returns null when the id has zero or multiple year tokens. NOT used at runtime
 * — only a CI cross-check that authored `predecessorRuleId`s line up.
 */
export function derivePredecessorRuleIdFromToken(id: string): string | null {
  const matches = id.match(/20\d{2}/g)
  if (!matches || matches.length !== 1) return null
  const year = matches[0]
  return id.replace(year, String(Number(year) - 1))
}
