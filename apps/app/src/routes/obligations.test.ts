import { describe, expect, it } from 'vitest'

import {
  canSaveInternalExtensionPlan,
  isThisWeekFilterActive,
  isInternalExtensionTargetDateValid,
  nextThisWeekFilterPatch,
  rangeSelectionUpdate,
  selectionHeaderState,
} from './obligations'

describe('obligations quick filters', () => {
  it('applies the this week days filter when inactive', () => {
    expect(nextThisWeekFilterPatch(null, null)).toEqual({
      dueWithin: null,
      due: null,
      daysMin: null,
      daysMax: 7,
      obligation: null,
      row: null,
    })
  })

  it('clears the this week days filter when clicked while active', () => {
    expect(nextThisWeekFilterPatch(null, 7)).toEqual({
      dueWithin: null,
      due: null,
      daysMin: null,
      daysMax: null,
      obligation: null,
      row: null,
    })
  })

  it('only treats an empty lower bound and seven-day upper bound as this week', () => {
    expect(isThisWeekFilterActive(null, 7)).toBe(true)
    expect(isThisWeekFilterActive(0, 7)).toBe(false)
    expect(isThisWeekFilterActive(null, 14)).toBe(false)
  })
})

describe('internal extension target date validation', () => {
  it('allows an empty internal target date', () => {
    expect(isInternalExtensionTargetDateValid('', '2026-04-15')).toBe(true)
  })

  it('rejects invalid ISO dates', () => {
    expect(isInternalExtensionTargetDateValid('2026-02-31', '2026-04-15')).toBe(false)
  })

  it('allows the filing deadline date', () => {
    expect(isInternalExtensionTargetDateValid('2026-04-15', '2026-04-15')).toBe(true)
  })

  it('rejects dates after the filing deadline', () => {
    expect(isInternalExtensionTargetDateValid('2026-04-16', '2026-04-15')).toBe(false)
  })
})

describe('internal extension plan save state', () => {
  it('disables save when the internal target date is empty', () => {
    expect(
      canSaveInternalExtensionPlan({
        draftTargetDate: '',
        filingDeadline: '2026-04-15',
        memo: 'Proceed with extension.',
      }),
    ).toBe(false)
  })

  it('allows save when the internal target date is unchanged and the memo is filled', () => {
    expect(
      canSaveInternalExtensionPlan({
        draftTargetDate: '2026-04-10',
        filingDeadline: '2026-04-15',
        memo: 'Proceed with extension.',
      }),
    ).toBe(true)
  })

  it('disables save when the decision memo is blank', () => {
    expect(
      canSaveInternalExtensionPlan({
        draftTargetDate: '2026-04-11',
        filingDeadline: '2026-04-15',
        memo: '   ',
      }),
    ).toBe(false)
  })

  it('disables save when the internal target date is after the filing deadline', () => {
    expect(
      canSaveInternalExtensionPlan({
        draftTargetDate: '2026-04-16',
        filingDeadline: '2026-04-15',
        memo: 'Proceed with extension.',
      }),
    ).toBe(false)
  })

  it('allows save when the internal target date changed and the memo is filled', () => {
    expect(
      canSaveInternalExtensionPlan({
        draftTargetDate: '2026-04-15',
        filingDeadline: '2026-04-15',
        memo: 'Proceed with extension.',
      }),
    ).toBe(true)
  })

  it('disables save while the mutation is pending', () => {
    expect(
      canSaveInternalExtensionPlan({
        draftTargetDate: '2026-04-15',
        filingDeadline: '2026-04-15',
        isPending: true,
        memo: 'Proceed with extension.',
      }),
    ).toBe(false)
  })
})

describe('rangeSelectionUpdate', () => {
  const orderedIds = ['a', 'b', 'c', 'd', 'e']

  it('selects every id between the anchor and target inclusive', () => {
    expect(
      rangeSelectionUpdate({
        current: { a: true },
        orderedIds,
        anchorId: 'a',
        targetId: 'c',
        nextChecked: true,
      }),
    ).toEqual({ a: true, b: true, c: true })
  })

  it('works when the target is above the anchor', () => {
    expect(
      rangeSelectionUpdate({
        current: { d: true },
        orderedIds,
        anchorId: 'd',
        targetId: 'b',
        nextChecked: true,
      }),
    ).toEqual({ b: true, c: true, d: true })
  })

  it('deselects the range when nextChecked is false', () => {
    expect(
      rangeSelectionUpdate({
        current: { a: true, b: true, c: true, d: true },
        orderedIds,
        anchorId: 'b',
        targetId: 'd',
        nextChecked: false,
      }),
    ).toEqual({ a: true })
  })

  it('falls back to a single-row toggle when the anchor is missing', () => {
    expect(
      rangeSelectionUpdate({
        current: {},
        orderedIds,
        anchorId: null,
        targetId: 'c',
        nextChecked: true,
      }),
    ).toEqual({ c: true })
  })

  it('ignores ranges with an unknown target', () => {
    const current = { a: true }
    expect(
      rangeSelectionUpdate({
        current,
        orderedIds,
        anchorId: 'a',
        targetId: 'zz',
        nextChecked: true,
      }),
    ).toBe(current)
  })

  it('treats an anchor not in the list as a missing anchor', () => {
    expect(
      rangeSelectionUpdate({
        current: {},
        orderedIds,
        anchorId: 'gone',
        targetId: 'b',
        nextChecked: true,
      }),
    ).toEqual({ b: true })
  })
})

describe('selectionHeaderState', () => {
  it('returns none when nothing is selected', () => {
    expect(selectionHeaderState({}, ['a', 'b'])).toBe('none')
  })

  it('returns all when every visible id is selected', () => {
    expect(selectionHeaderState({ a: true, b: true }, ['a', 'b'])).toBe('all')
  })

  it('returns partial when only some visible ids are selected', () => {
    expect(selectionHeaderState({ a: true }, ['a', 'b'])).toBe('partial')
  })

  it('ignores selected ids that are not visible', () => {
    expect(selectionHeaderState({ z: true }, ['a', 'b'])).toBe('none')
  })

  it('returns none when there are no visible rows', () => {
    expect(selectionHeaderState({ a: true }, [])).toBe('none')
  })
})
