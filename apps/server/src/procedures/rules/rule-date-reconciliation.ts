/*
 * Deterministic, offline reconciliation of verified (hand-authored) rule due dates against the
 * rule's own cited basis excerpt and filing year — the gap-#5 check that the existing
 * check-rule-sources.ts (URL reachability + excerpt completeness) never performed.
 *
 * It guards the *static rule data*: a federal/verified literal date that was never rolled to the new
 * filing year, or a literal date that contradicts the source text the rule itself quotes. It does
 * NOT fetch the live source — catching a source that silently changed its published dates is the
 * rule-source drift detector's job (it raises an Alert when a cited excerpt stops matching the live
 * page). The two are complementary: drift watches the world, this watches our own catalog.
 */
import { dueDateLogicDateCodes, extractComparableDateCodes } from './concrete-draft'

// A legitimate weekend/holiday adjustment only ever pushes a statutory date a few days *later* (a
// Saturday deadline → Monday; a holiday → the next business day). So a literal date up to this many
// days after a cited statutory date is treated as a valid adjustment, not a contradiction. This is
// rollover-kind agnostic — it also covers 'source_adjusted' rules where the source itself published
// the shifted date (e.g. 1099-NEC: excerpt cites "January 31", rule encodes the observed Feb 2).
const MAX_ADJUSTMENT_FORWARD_DAYS = 4
const MS_PER_DAY = 86_400_000

export type RuleDateIssueKind = 'stale_applicable_year' | 'date_excerpt_mismatch'

export interface RuleDateIssue {
  ruleId: string
  kind: RuleDateIssueKind
  detail: string
}

/** The minimal rule shape the reconciliation needs; `dueDateLogic` matches dueDateLogicDateCodes. */
export interface ReconcilableRule {
  id: string
  status: string
  applicableYear: number
  dueDateLogic: Parameters<typeof dueDateLogicDateCodes>[0]
  evidence: ReadonlyArray<{ authorityRole: string; sourceExcerpt: string }>
}

function basisExcerptDateCodes(rule: ReconcilableRule): Set<string> {
  const codes = new Set<string>()
  for (const evidence of rule.evidence) {
    if (evidence.authorityRole !== 'basis' || evidence.sourceExcerpt.length === 0) continue
    for (const code of extractComparableDateCodes(evidence.sourceExcerpt)) codes.add(code)
  }
  return codes
}

/**
 * For a fixed_date rule, whether the literal date is supported by a basis-excerpt date — either an
 * exact match, or the excerpt's statutory date shifted forward by up to MAX_ADJUSTMENT_FORWARD_DAYS
 * (a weekend/holiday rollover, e.g. a Jan 31 statutory deadline correctly encoded as the observed
 * Feb 2). Returns a detail string when the literal date is unsupported, or null when supported or
 * unprovable (no machine-readable date in any basis excerpt). Only forward shifts count — a date
 * *earlier* than every cited date, or weeks off, is a genuine contradiction worth review.
 */
function fixedDateExcerptMismatch(rule: ReconcilableRule): string | null {
  if (rule.dueDateLogic.kind !== 'fixed_date') return null
  const claimedDate = rule.dueDateLogic.date
  const claimedCode = claimedDate.slice(5)
  const excerptCodes = basisExcerptDateCodes(rule)
  if (excerptCodes.size === 0) return null
  if (excerptCodes.has(claimedCode)) return null

  const claimedMs = Date.parse(`${claimedDate}T00:00:00Z`)
  for (const code of excerptCodes) {
    const statutoryMs = Date.parse(`${rule.applicableYear}-${code}T00:00:00Z`)
    if (Number.isNaN(statutoryMs) || Number.isNaN(claimedMs)) continue
    const forwardDays = (claimedMs - statutoryMs) / MS_PER_DAY
    if (forwardDays >= 0 && forwardDays <= MAX_ADJUSTMENT_FORWARD_DAYS) return null
  }
  return `fixed date ${claimedCode} is not within a weekend/holiday-adjustment window of any basis-excerpt date [${[...excerptCodes].join(', ')}]`
}

/**
 * Reconcile verified rule due dates. Only verified rules with an absolute due date are checked;
 * relative / source_defined_calendar rules carry no literal date and are skipped, as are rules whose
 * basis excerpts contain no machine-readable date.
 *
 * - 'stale_applicable_year': a verified absolute-date rule whose filing year is already past
 *   (applicableYear < currentYear) and was never rolled forward to the current year or deprecated.
 * - 'date_excerpt_mismatch': a fixed_date rule whose literal date contradicts its own cited basis
 *   excerpt, rollover-aware.
 */
export function findRuleDateReconciliationIssues(input: {
  rules: readonly ReconcilableRule[]
  currentYear: number
}): RuleDateIssue[] {
  const issues: RuleDateIssue[] = []
  for (const rule of input.rules) {
    if (rule.status !== 'verified') continue
    if (dueDateLogicDateCodes(rule.dueDateLogic).length === 0) continue

    if (rule.applicableYear < input.currentYear) {
      issues.push({
        ruleId: rule.id,
        kind: 'stale_applicable_year',
        detail: `verified rule targets filing year ${rule.applicableYear} (< ${input.currentYear}); roll forward to the current year or deprecate`,
      })
    }

    const mismatch = fixedDateExcerptMismatch(rule)
    if (mismatch) {
      issues.push({ ruleId: rule.id, kind: 'date_excerpt_mismatch', detail: mismatch })
    }
  }
  return issues
}
