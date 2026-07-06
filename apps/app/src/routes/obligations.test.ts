import { describe, expect, it } from 'vitest'

import {
  canSaveInternalExtensionPlan,
  compareObligationQueueRowsForSort,
  deadlineDetailSearchFromQueueState,
  daysUntilEffectiveInternalDueDate,
  effectiveInternalDueDate,
  emptyExtensionPlanDraft,
  extensionPlanDraftFromRow,
  isDueDaysSuppressedForStatus,
  isObligationQueueRowControlClick,
  isThisWeekFilterActive,
  isInternalExtensionTargetDateValid,
  latestDeadlineInputRequest,
  nextHeaderSort,
  nextThisWeekFilterPatch,
  rangeSelectionUpdate,
  selectionHeaderState,
  urgencyBandOf,
  URGENCY_BAND_ORDER,
} from './obligations'
// These four readiness/pipeline helpers are the canonical copies in the queue
// helpers module (the obligations.tsx duplicates were removed 2026-06-16 with
// the dead detail-drawer cleanup).
import {
  countOutstandingReadinessDocuments,
  materialsChecklistReference,
  reviewPipelineCurrent,
  willReadinessChecklistBeFullyReceived,
} from '@/features/obligations/queue/helpers'
import type { ObligationStatus } from '@/features/obligations/status-control'

const smartPriorityBreakdown = (score: number) => ({
  version: 'smart-priority-v1' as const,
  score,
  rank: null,
  factors: [],
})

describe('obligations quick filters', () => {
  const defaultDetailSearchState = {
    q: '',
    status: [],
    obligation: null,
    client: [],
    rule: [],
    state: [],
    county: [],
    taxType: [],
    assignee: '',
    assignees: [],
    owner: null,
    due: null,
    dueWithin: null,
    evidence: null,
    awaitingSignature: null,
    projected: null,
    daysMin: null,
    daysMax: null,
    asOf: null,
    // Keep the test seed in sync with `DEFAULT_SORT` / `DEFAULT_GROUP` /
    // `DEFAULT_HIDDEN_COLUMN_IDS` in obligations.tsx. These tests verify that
    // helpers DROP defaults from the URL.
    sort: 'due_asc' as const,
    density: 'comfortable' as const,
    group: 'urgency' as const,
    hide: [
      'smartPriority',
      'clientCounty',
      'dueDateExact',
      'daysUntilDue',
      'evidenceCount',
      'taxCategory',
    ],
  } satisfies Parameters<typeof deadlineDetailSearchFromQueueState>[1]

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

  it('builds deadline detail search from parsed queue filters when router search is stale', () => {
    expect(
      deadlineDetailSearchFromQueueState('', {
        ...defaultDetailSearchState,
        status: ['review'],
        evidence: 'needs',
      }),
    ).toBe('?status=review&evidence=needs')
  })

  it('drops detail-only params while preserving unknown params and explicit show-all columns', () => {
    expect(
      deadlineDetailSearchFromQueueState(
        '?drawer=obligation&id=old&row=old&tab=audit&lifecycle=v1',
        {
          ...defaultDetailSearchState,
          client: ['client_1'],
          awaitingSignature: true,
          hide: [],
        },
      ),
    ).toBe('?lifecycle=v1&client=client_1&awaitingSignature=true&hide=')
  })
})

describe('obligation queue header sort', () => {
  const sortRows = [
    {
      id: 'deadline_a',
      currentDueDate: '2026-06-01',
      updatedAt: '2026-05-01T00:00:00.000Z',
      smartPriority: smartPriorityBreakdown(10),
    },
    {
      id: 'deadline_b',
      currentDueDate: '2026-08-01',
      updatedAt: '2026-05-03T00:00:00.000Z',
      smartPriority: smartPriorityBreakdown(20),
    },
    {
      id: 'deadline_c',
      currentDueDate: '2026-07-01',
      updatedAt: '2026-05-02T00:00:00.000Z',
      smartPriority: smartPriorityBreakdown(30),
    },
  ]

  it('toggles Internal Due between ascending and descending without clearing to Smart Priority', () => {
    expect(
      nextHeaderSort({
        currentSort: 'smart_priority',
        ascSort: 'due_asc',
        descSort: 'due_desc',
        firstSort: 'due_asc',
      }),
    ).toBe('due_asc')

    expect(
      nextHeaderSort({
        currentSort: 'due_asc',
        ascSort: 'due_asc',
        descSort: 'due_desc',
        firstSort: 'due_asc',
      }),
    ).toBe('due_desc')

    expect(
      nextHeaderSort({
        currentSort: 'due_desc',
        ascSort: 'due_asc',
        descSort: 'due_desc',
        firstSort: 'due_asc',
      }),
    ).toBe('due_asc')
  })

  it('sorts the loaded buffer by internal due date immediately', () => {
    expect(
      [...sortRows]
        .toSorted((a, b) => compareObligationQueueRowsForSort(a, b, 'due_asc'))
        .map((row) => row.id),
    ).toEqual(['deadline_a', 'deadline_c', 'deadline_b'])

    expect(
      [...sortRows]
        .toSorted((a, b) => compareObligationQueueRowsForSort(a, b, 'due_desc'))
        .map((row) => row.id),
    ).toEqual(['deadline_b', 'deadline_c', 'deadline_a'])
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

  it('allows a target after the original deadline but within the extended window', () => {
    // The cap fed in is now the EXTENDED filing deadline, so a realistic
    // post-extension target (after the original April 15) is valid up to Oct 15.
    expect(isInternalExtensionTargetDateValid('2026-08-01', '2026-10-15')).toBe(true)
    expect(isInternalExtensionTargetDateValid('2026-10-15', '2026-10-15')).toBe(true)
    expect(isInternalExtensionTargetDateValid('2026-10-16', '2026-10-15')).toBe(false)
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

  it('clears the same-row extension draft after save without triggering row rehydration', () => {
    const currentDraft = extensionPlanDraftFromRow({
      id: 'deadline_1',
      extensionInternalTargetDate: '2026-04-15',
      extensionMemo: 'Client materials are late.',
      extensionSource: 'Partner approval',
    })

    expect(currentDraft).toEqual({
      obligationId: 'deadline_1',
      internalTargetDate: '2026-04-15',
      memo: 'Client materials are late.',
      source: 'Partner approval',
      extendedFilingDate: '',
    })
    expect(emptyExtensionPlanDraft(currentDraft.obligationId)).toEqual({
      obligationId: 'deadline_1',
      internalTargetDate: '',
      memo: '',
      source: '',
      extendedFilingDate: '',
    })
  })
})

describe('internal due date queue display', () => {
  it('keeps extension-active rows eligible for the internal due date value', () => {
    expect(isDueDaysSuppressedForStatus('extended')).toBe(false)
    expect(isDueDaysSuppressedForStatus('not_applicable')).toBe(true)
  })

  it('uses the saved extension target before the original current due date', () => {
    const row = {
      currentDueDate: '2026-06-10',
      daysUntilDue: 12,
      extensionInternalTargetDate: '2026-05-30',
    }

    expect(effectiveInternalDueDate(row)).toBe('2026-05-30')
    expect(daysUntilEffectiveInternalDueDate(row, '2026-05-29')).toBe(1)
  })

  it('keeps the server-provided relative days when no extension target is saved', () => {
    expect(
      daysUntilEffectiveInternalDueDate(
        {
          currentDueDate: '2026-06-10',
          daysUntilDue: 12,
          extensionInternalTargetDate: null,
        },
        '2026-05-29',
      ),
    ).toBe(12)
  })
})

describe('urgency band derivation', () => {
  // 2026-06-04 (Yuqi h4bQ2): bands group the /deadlines table by the
  // INTERNAL (effective) due date. Boundaries: <0 overdue, 0 today,
  // 1..7 this week, >7 upcoming (2026-06-22: "Today" split into its own
  // horizon so a deadline product reads time-forward).
  const baseRow = {
    currentDueDate: '2026-06-01',
    daysUntilDue: 0,
    extensionInternalTargetDate: null as string | null,
    // Active (non-terminal) status so the date-based bands apply; the settled
    // case is covered separately below.
    status: 'pending' as ObligationStatus,
  }

  it('classifies a past-due row as overdue', () => {
    expect(urgencyBandOf({ ...baseRow, daysUntilDue: -1 }, '2026-06-01')).toBe('overdue')
    expect(urgencyBandOf({ ...baseRow, daysUntilDue: -12 }, '2026-06-01')).toBe('overdue')
  })

  it('gives due-today its own band, and days 1–7 to this week', () => {
    expect(urgencyBandOf({ ...baseRow, daysUntilDue: 0 }, '2026-06-01')).toBe('today')
    expect(urgencyBandOf({ ...baseRow, daysUntilDue: 1 }, '2026-06-01')).toBe('this_week')
    expect(urgencyBandOf({ ...baseRow, daysUntilDue: 7 }, '2026-06-01')).toBe('this_week')
  })

  it('classifies anything beyond seven days as upcoming', () => {
    expect(urgencyBandOf({ ...baseRow, daysUntilDue: 8 }, '2026-06-01')).toBe('upcoming')
    expect(urgencyBandOf({ ...baseRow, daysUntilDue: 90 }, '2026-06-01')).toBe('upcoming')
  })

  it('bands off the extension target date when present', () => {
    // currentDueDate is far out, but the saved extension target is
    // tomorrow → the row belongs in "this week", not "upcoming".
    expect(
      urgencyBandOf(
        {
          currentDueDate: '2026-08-01',
          daysUntilDue: 60,
          extensionInternalTargetDate: '2026-06-02',
          status: 'pending',
        },
        '2026-06-01',
      ),
    ).toBe('this_week')
  })

  it('routes settled work to the Filed band regardless of date (audit P0)', () => {
    // A return filed 48d late is DONE, not overdue — terminal statuses must land
    // in the calm Filed band so the urgency lanes hold only what needs action.
    for (const status of ['done', 'completed', 'paid', 'not_applicable'] as ObligationStatus[]) {
      expect(urgencyBandOf({ ...baseRow, daysUntilDue: -48, status }, '2026-06-01')).toBe('filed')
      // even a settled row whose date is upcoming stays in Filed, not Upcoming.
      expect(urgencyBandOf({ ...baseRow, daysUntilDue: 30, status }, '2026-06-01')).toBe('filed')
    }
  })

  it('orders bands overdue → today → this week → upcoming → filed', () => {
    expect(URGENCY_BAND_ORDER).toEqual(['overdue', 'today', 'this_week', 'upcoming', 'filed'])
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

describe('deadline input request audit chip', () => {
  it('reads the latest input request from deadline audit events', () => {
    const latest = latestDeadlineInputRequest([
      {
        id: '11111111-1111-4111-8111-111111111111',
        firmId: 'firm_1',
        actorId: 'user_preparer',
        actorLabel: 'Paula Preparer',
        actorType: 'user',
        previousActorType: null,
        aiEventMetadata: null,
        entityType: 'obligation_instance',
        entityId: 'obligation_1',
        action: 'obligation.input_requested',
        beforeJson: null,
        afterJson: {
          recipientName: 'Olivia Owner',
          recipientRole: 'owner',
          message: 'Please review the extension plan.',
        },
        reason: null,
        ipHash: null,
        userAgentHash: null,
        createdAt: '2026-05-26T12:00:00.000Z',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        firmId: 'firm_1',
        actorId: 'user_preparer',
        actorLabel: 'Paula Preparer',
        actorType: 'user',
        previousActorType: null,
        aiEventMetadata: null,
        entityType: 'obligation_instance',
        entityId: 'obligation_1',
        action: 'obligation.input_requested',
        beforeJson: null,
        afterJson: {
          recipientName: 'Pat Partner',
          recipientRole: 'partner',
          message: 'Please decide whether to file.',
        },
        reason: null,
        ipHash: null,
        userAgentHash: null,
        createdAt: '2026-05-26T13:00:00.000Z',
      },
    ])

    expect(latest).toEqual({
      recipientName: 'Pat Partner',
      recipientRole: 'partner',
      message: 'Please decide whether to file.',
      createdAt: '2026-05-26T13:00:00.000Z',
    })
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
