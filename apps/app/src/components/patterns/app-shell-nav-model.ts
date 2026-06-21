import type { RuleCoverageRow } from '@duedatehq/contracts'

export function aggregateRuleLibraryPendingCount(rows: readonly RuleCoverageRow[]): number {
  let total = 0
  for (const row of rows) {
    // `candidateCount` is the legacy coverage field and is currently emitted
    // as the same value as `pendingReviewCount`. Prefer the explicit field so
    // the sidebar badge stays a pending-review count, not a double-count.
    total += row.pendingReviewCount ?? row.candidateCount
  }
  return total
}
