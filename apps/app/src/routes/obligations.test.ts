import { describe, expect, it } from 'vitest'

import {
  canSaveInternalExtensionPlan,
  countOutstandingReadinessDocuments,
  isObligationQueueRowControlClick,
  isThisWeekFilterActive,
  isInternalExtensionTargetDateValid,
  materialsChecklistReference,
  nextThisWeekFilterPatch,
  rangeSelectionUpdate,
  reviewPipelineCurrent,
  selectionHeaderState,
  willReadinessChecklistBeFullyReceived,
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

describe('obligation queue row clicks', () => {
  it('does not treat the clickable row itself as a nested control', () => {
    const row = document.createElement('tr')
    row.setAttribute('role', 'button')
    const cell = document.createElement('td')
    const label = document.createElement('span')

    row.append(cell)
    cell.append(label)

    expect(isObligationQueueRowControlClick(label, row)).toBe(false)
    expect(isObligationQueueRowControlClick(row, row)).toBe(false)
  })

  it('still treats controls inside a row as control clicks', () => {
    const row = document.createElement('tr')
    row.setAttribute('role', 'button')
    const cell = document.createElement('td')
    const button = document.createElement('button')
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

    row.append(cell)
    cell.append(button)
    button.append(icon)

    expect(isObligationQueueRowControlClick(button, row)).toBe(true)
    expect(isObligationQueueRowControlClick(icon, row)).toBe(true)
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

describe('review workflow step derivation', () => {
  it('starts newly entered review rows at reviewing', () => {
    expect(
      reviewPipelineCurrent({
        prepStage: 'ready_for_prep',
        reviewStage: 'not_required',
      }),
    ).toBe('reviewing_return')

    expect(
      reviewPipelineCurrent({
        prepStage: 'ready_for_prep',
        reviewStage: 'ready_for_review',
      }),
    ).toBe('reviewing_return')
  })

  it('keeps explicit in-prep rows at preparing', () => {
    expect(
      reviewPipelineCurrent({
        prepStage: 'in_prep',
        reviewStage: 'not_required',
      }),
    ).toBe('preparing_return')
  })

  it('collapses prepared and reviewer states into reviewing', () => {
    expect(
      reviewPipelineCurrent({
        prepStage: 'prepared',
        reviewStage: 'not_required',
      }),
    ).toBe('reviewing_return')

    expect(
      reviewPipelineCurrent({
        prepStage: 'ready_for_prep',
        reviewStage: 'notes_open',
      }),
    ).toBe('reviewing_return')
  })

  it('uses approved as the only ready-to-file review state', () => {
    expect(
      reviewPipelineCurrent({
        prepStage: 'prepared',
        reviewStage: 'approved',
      }),
    ).toBe('ready_to_file')
  })
})

describe('materials readiness gating', () => {
  it('treats an empty checklist as having no outstanding materials', () => {
    expect(countOutstandingReadinessDocuments([])).toBe(0)
  })

  it('counts missing and needs-review materials as outstanding', () => {
    expect(
      countOutstandingReadinessDocuments([
        { status: 'missing' },
        { status: 'received' },
        { status: 'needs_review' },
      ]),
    ).toBe(2)
  })

  it('allows the review transition only after every item is received', () => {
    expect(
      countOutstandingReadinessDocuments([{ status: 'received' }, { status: 'received' }]),
    ).toBe(0)
  })

  it('does not treat an empty checklist as fully received', () => {
    expect(willReadinessChecklistBeFullyReceived([], new Set())).toBe(false)
  })

  it('does not advance when an unreceived item remains outside the receive action', () => {
    expect(
      willReadinessChecklistBeFullyReceived(
        [
          { id: 'w2', status: 'missing' },
          { id: '1099', status: 'needs_review' },
        ],
        new Set(['w2']),
      ),
    ).toBe(false)
  })

  it('advances when the receive action covers every remaining item', () => {
    expect(
      willReadinessChecklistBeFullyReceived(
        [
          { id: 'w2', status: 'received' },
          { id: '1099', status: 'missing' },
          { id: 'k1', status: 'needs_review' },
        ],
        new Set(['1099', 'k1']),
      ),
    ).toBe(true)
  })

  it('treats an already received checklist as complete', () => {
    expect(
      willReadinessChecklistBeFullyReceived(
        [
          { id: 'w2', status: 'received' },
          { id: '1099', status: 'received' },
        ],
        new Set(),
      ),
    ).toBe(true)
  })
})

describe('materials checklist reference', () => {
  it('shows Form 1040 for state individual income checklist templates', () => {
    expect(
      materialsChecklistReference({
        taxType: 'ca_state_individual_income_tax',
        formName: 'State individual income tax return',
        obligationType: 'filing',
      }),
    ).toBe('Form 1040')
  })

  it('shows the selected estimated-tax form without falling through to Form 1040', () => {
    expect(
      materialsChecklistReference({
        taxType: 'federal_1040_estimated_tax',
        formName: 'Form 1040-ES',
        obligationType: 'payment',
      }),
    ).toBe('Form 1040-ES')
  })

  it('omits a reference for non-individual templates', () => {
    expect(
      materialsChecklistReference({
        taxType: 'federal_1120s',
        formName: 'Form 1120-S',
        obligationType: 'filing',
      }),
    ).toBeNull()
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
