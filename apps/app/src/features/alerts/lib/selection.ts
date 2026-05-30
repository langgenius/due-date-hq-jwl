import type { PulseAffectedClient } from '@duedatehq/contracts'

// Pure selection helpers. Kept side-effect-free so they can be unit tested
// without mounting the drawer or seeding a router.

export function isSelectable(
  row: PulseAffectedClient,
  confirmedReviewIds: ReadonlySet<string> = new Set(),
): boolean {
  // `needs_review` rows are intentionally excluded until the CPA confirms the
  // missing applicability fact in the drawer.
  return (
    row.matchStatus === 'eligible' ||
    (row.matchStatus === 'needs_review' && confirmedReviewIds.has(row.obligationId))
  )
}

export function defaultSelection(
  rows: readonly PulseAffectedClient[],
  confirmedReviewIds: ReadonlySet<string> = new Set(),
): Set<string> {
  return new Set(
    rows.filter((row) => isSelectable(row, confirmedReviewIds)).map((row) => row.obligationId),
  )
}

export function toggleSelection(selection: ReadonlySet<string>, obligationId: string): Set<string> {
  const next = new Set(selection)
  if (next.has(obligationId)) next.delete(obligationId)
  else next.add(obligationId)
  return next
}

export function setAllSelection(
  rows: readonly PulseAffectedClient[],
  checked: boolean,
  confirmedReviewIds: ReadonlySet<string> = new Set(),
): Set<string> {
  if (!checked) return new Set()
  return defaultSelection(rows, confirmedReviewIds)
}

export function confirmAllNeedsReview(rows: readonly PulseAffectedClient[]): Set<string> {
  return new Set(
    rows.filter((row) => row.matchStatus === 'needs_review').map((row) => row.obligationId),
  )
}

export function excludeFromSelection(
  selection: ReadonlySet<string>,
  confirmedReviewIds: ReadonlySet<string>,
  excludedIds: ReadonlySet<string>,
  obligationId: string,
  excluded: boolean,
): {
  selection: Set<string>
  confirmedReviewIds: Set<string>
  excludedIds: Set<string>
} {
  const nextSelection = new Set(selection)
  const nextConfirmed = new Set(confirmedReviewIds)
  const nextExcluded = new Set(excludedIds)
  if (excluded) {
    nextExcluded.add(obligationId)
    nextSelection.delete(obligationId)
    nextConfirmed.delete(obligationId)
  } else {
    nextExcluded.delete(obligationId)
  }
  return {
    selection: nextSelection,
    confirmedReviewIds: nextConfirmed,
    excludedIds: nextExcluded,
  }
}

export interface SelectionStats {
  selectableCount: number
  selectedCount: number
  needsReviewCount: number
  alreadyAppliedCount: number
  revertedCount: number
}

export function computeSelectionStats(
  rows: readonly PulseAffectedClient[],
  selection: ReadonlySet<string>,
  confirmedReviewIds: ReadonlySet<string> = new Set(),
): SelectionStats {
  let selectableCount = 0
  let needsReviewCount = 0
  let alreadyAppliedCount = 0
  let revertedCount = 0
  for (const row of rows) {
    if (isSelectable(row, confirmedReviewIds)) selectableCount += 1
    if (row.matchStatus === 'needs_review') needsReviewCount += 1
    else if (row.matchStatus === 'already_applied') alreadyAppliedCount += 1
    else if (row.matchStatus === 'reverted') revertedCount += 1
  }
  let selectedCount = 0
  for (const id of selection) {
    if (rows.find((row) => row.obligationId === id && isSelectable(row, confirmedReviewIds))) {
      selectedCount += 1
    }
  }
  return {
    selectableCount,
    selectedCount,
    needsReviewCount,
    alreadyAppliedCount,
    revertedCount,
  }
}
