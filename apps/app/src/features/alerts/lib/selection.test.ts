import { describe, expect, it } from 'vitest'

import type { PulseAffectedClient } from '@duedatehq/contracts'

import {
  computeSelectionStats,
  confirmAllNeedsReview,
  defaultSelection,
  excludeFromSelection,
  isSelectable,
  setAllSelection,
  toggleSelection,
} from './selection'

function makeRow(
  id: string,
  matchStatus: PulseAffectedClient['matchStatus'],
  overrides: Partial<PulseAffectedClient> = {},
): PulseAffectedClient {
  return {
    obligationId: id,
    clientId: `client-${id}`,
    clientName: `Client ${id}`,
    state: 'CA',
    county: 'Los Angeles',
    entityType: 'llc',
    taxType: '1040',
    currentDueDate: '2026-04-15',
    newDueDate: '2026-10-15',
    status: 'pending',
    matchStatus,
    reason: null,
    ...overrides,
  }
}

describe('selection helpers', () => {
  it('isSelectable only returns true for eligible rows', () => {
    expect(isSelectable(makeRow('a', 'eligible'))).toBe(true)
    expect(isSelectable(makeRow('b', 'needs_review'))).toBe(false)
    expect(isSelectable(makeRow('b', 'needs_review'), new Set(['b']))).toBe(true)
    expect(isSelectable(makeRow('c', 'already_applied'))).toBe(false)
    expect(isSelectable(makeRow('c', 'already_applied'), new Set(['c']))).toBe(false)
    expect(isSelectable(makeRow('d', 'reverted'))).toBe(false)
  })

  it('defaultSelection picks every eligible row exactly once', () => {
    const rows = [
      makeRow('a', 'eligible'),
      makeRow('b', 'needs_review'),
      makeRow('c', 'eligible'),
      makeRow('d', 'already_applied'),
    ]
    const selection = defaultSelection(rows)
    expect([...selection].toSorted()).toEqual(['a', 'c'])
  })

  it('toggleSelection adds and removes the same id', () => {
    const start = new Set(['a'])
    const added = toggleSelection(start, 'b')
    expect([...added].toSorted()).toEqual(['a', 'b'])
    const removed = toggleSelection(added, 'a')
    expect([...removed]).toEqual(['b'])
  })

  it('setAllSelection clears or restores defaultSelection deterministically', () => {
    const rows = [makeRow('a', 'eligible'), makeRow('b', 'needs_review'), makeRow('c', 'eligible')]
    expect([...setAllSelection(rows, false)]).toEqual([])
    expect([...setAllSelection(rows, true)].toSorted()).toEqual(['a', 'c'])
    expect([...setAllSelection(rows, true, new Set(['b']))].toSorted()).toEqual(['a', 'b', 'c'])
  })

  it('computeSelectionStats partitions by matchStatus', () => {
    const rows = [
      makeRow('a', 'eligible'),
      makeRow('b', 'eligible'),
      makeRow('c', 'needs_review'),
      makeRow('d', 'already_applied'),
      makeRow('e', 'reverted'),
    ]
    const stats = computeSelectionStats(rows, new Set(['a', 'c']), new Set(['c']))
    expect(stats).toEqual({
      selectableCount: 3,
      selectedCount: 2,
      needsReviewCount: 1,
      alreadyAppliedCount: 1,
      revertedCount: 1,
    })
  })

  it('computeSelectionStats only counts ids that are still eligible', () => {
    // If a stale selection points to an `already_applied` row (race condition),
    // the count should treat it as 0 — apply CTA stays accurate.
    const rows = [makeRow('a', 'already_applied'), makeRow('b', 'eligible')]
    const stats = computeSelectionStats(rows, new Set(['a']))
    expect(stats.selectedCount).toBe(0)
    expect(stats.selectableCount).toBe(1)
  })

  it('confirmAllNeedsReview returns only rows that need manager confirmation', () => {
    const rows = [
      makeRow('a', 'eligible'),
      makeRow('b', 'needs_review'),
      makeRow('c', 'needs_review'),
      makeRow('d', 'already_applied'),
    ]
    expect([...confirmAllNeedsReview(rows)].toSorted()).toEqual(['b', 'c'])
  })

  it('excludeFromSelection removes stale selection and confirmation state', () => {
    const result = excludeFromSelection(
      new Set(['a', 'b']),
      new Set(['b']),
      new Set(['c']),
      'b',
      true,
    )
    expect([...result.selection]).toEqual(['a'])
    expect([...result.confirmedReviewIds]).toEqual([])
    expect([...result.excludedIds].toSorted()).toEqual(['b', 'c'])

    const restored = excludeFromSelection(
      result.selection,
      result.confirmedReviewIds,
      result.excludedIds,
      'b',
      false,
    )
    expect([...restored.selection]).toEqual(['a'])
    expect([...restored.excludedIds]).toEqual(['c'])
  })
})
