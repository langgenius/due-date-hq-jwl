import type { ObligationRule } from './index'

/**
 * Catalog-release cohort detection — the pure core behind the "new annual
 * catalog" release event and pre-announce.
 *
 * Each filing season the platform ships ~30+ year-stamped rules for the new
 * filing year. We want to announce that cohort exactly once, on a predictable
 * cadence, without mistaking a lone off-cycle advance rule (one rule added
 * early for a future year) for a shipped cohort. Dependency-free so it can live
 * in core and be exhaustively unit-tested; the caller supplies the
 * already-released filing years (from the rule_catalog_release table).
 */

/**
 * A real annual cohort is large; an off-cycle advance rule is one or two. A
 * filing year only counts as a cohort once it clears this many rules. (Today:
 * applicableYear 2026 has 43 rules; the lone 2027 advance rule has 1 and is
 * correctly ignored until its real cohort lands.)
 */
export const MIN_NEW_COHORT_SIZE = 8

/** September, 0-based — the start of the platform's Sept–Dec rollover season. */
export const CATALOG_RELEASE_MONTH_INDEX = 8

export interface RuleCohort {
  filingYear: number
  /** Ids of every rule in the detected cohort year. */
  newCohortRuleIds: string[]
}

type CohortRule = Pick<ObligationRule, 'id' | 'applicableYear'>

function countByFilingYear(rules: ReadonlyArray<CohortRule>): Map<number, number> {
  const counts = new Map<number, number>()
  for (const rule of rules) {
    counts.set(rule.applicableYear, (counts.get(rule.applicableYear) ?? 0) + 1)
  }
  return counts
}

/**
 * Filing years whose rule count clears `minSize` — i.e. genuine annual cohorts,
 * ascending. Off-cycle advance rules are filtered out.
 */
export function substantialCohortYears(
  rules: ReadonlyArray<CohortRule>,
  minSize: number = MIN_NEW_COHORT_SIZE,
): number[] {
  return [...countByFilingYear(rules).entries()]
    .filter(([, count]) => count >= minSize)
    .map(([year]) => year)
    .toSorted((a, b) => a - b)
}

/**
 * The newest substantial cohort year not yet released, or null.
 *
 * Pure: the caller supplies the already-released filing years so this stays
 * dependency-free and testable. The job layer decides what to do with a hit
 * (insert a release row, tag review tasks, fan out notifications).
 */
export function detectNewCohort({
  rules,
  existingReleaseFilingYears,
  minSize = MIN_NEW_COHORT_SIZE,
}: {
  rules: ReadonlyArray<CohortRule>
  existingReleaseFilingYears: ReadonlyArray<number>
  minSize?: number
}): RuleCohort | null {
  const released = new Set(existingReleaseFilingYears)
  const candidates = substantialCohortYears(rules, minSize).filter((year) => !released.has(year))
  if (candidates.length === 0) return null
  const filingYear = Math.max(...candidates)
  const newCohortRuleIds = rules
    .filter((rule) => rule.applicableYear === filingYear)
    .map((rule) => rule.id)
  return { filingYear, newCohortRuleIds }
}

/**
 * Deterministic prediction of when a filing-year cohort lands — the start of the
 * prior calendar year's rollover season (early autumn). Used ONLY for the
 * pre-announce ("YYYY catalog expected ~<date>"); it is a forecast of arrival,
 * never a review deadline. Pure (no Date.now()).
 */
export function expectedCatalogReleaseDate(filingYear: number): Date {
  return new Date(Date.UTC(filingYear - 1, CATALOG_RELEASE_MONTH_INDEX, 1))
}
