// Pure helper functions for the obligation queue route (/deadlines).
// Extracted from routes/obligations.tsx — no React components / JSX here.
import type { MouseEvent } from 'react'

import type { RowSelectionState, SortingState, VisibilityState } from '@tanstack/react-table'

import {
  OBLIGATION_QUEUE_FILTER_MAX_SELECTIONS,
  ObligationQueueDetailTabSchema,
  type AuditEventPublic,
  type ObligationFiledRejectionNextStep,
  type ObligationQueueDetailTab,
  type ObligationQueueFacetOption,
  type ObligationQueueRow,
  type ObligationQueueSort,
  type ReadinessChecklistItem,
  type ReadinessDocumentChecklistItemPublic,
} from '@duedatehq/contracts'
import { ALL_STATUSES, type ObligationStatus } from '@/features/obligations/status-control'
import {
  cleanDeadlineDetailSearch,
  obligationIdMatchesDeadlineRef,
} from '@/features/obligations/deadline-detail-url'
import { isValidIsoDate } from '@/components/primitives/iso-date-picker'
import { formatDate } from '@/lib/utils'

import type {
  AuthorityRejectionAuditDetails,
  AuthorityRejectionDraft,
  DeadlineInputRequestAudit,
  DueDaysTone,
  ExtensionPlanDraft,
  FilterOption,
  ObligationQueueExportQuery,
  ObligationQueueListInputWithoutCursor,
} from './types'
import {
  AUTHORITY_REJECTION_NEXT_STEPS,
  DAY_MS,
  DAYS_FILTER_MAX,
  DAYS_FILTER_MIN,
  DEFAULT_DENSITY,
  DEFAULT_GROUP,
  DEFAULT_HIDDEN_COLUMN_IDS,
  DEFAULT_SORT,
  DUE_DAYS_TERMINAL_STATUSES,
  NON_HIDEABLE_COLUMNS,
  OBLIGATION_QUEUE_ROW_CONTROL_SELECTOR,
  ReadinessChecklistItemsSchema,
  STATE_CODE_RE,
  THIS_WEEK_MAX_DAYS,
  TIMELINE_STAGE_COUNT,
  TIMELINE_STAGE_KEYS,
  UUID_RE,
  type DeadlineDetailQueueSearchState,
  type ObligationQueueSearchParams,
  type PastStageEntry,
  type ReviewPipelineKey,
  type TimelineStageKey,
} from './constants'

export async function copyTextToClipboard(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    return
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.append(textarea)
    textarea.focus()
    textarea.select()
    try {
      if (!document.execCommand('copy')) throw new Error('Clipboard fallback failed.')
    } finally {
      textarea.remove()
    }
  }
}

// Page size is derived from the ACTUAL scroll container height, not
// window height. A window-height heuristic would overshoot when the
// page chrome is tall (e.g. filter bar wrapping two lines) and
// undershoot when the panel is open eating side space but not
// vertical. Measuring the container with ResizeObserver gives the
// true "how much room do I have for rows" answer.
//
// The measurement target is the table-card, a bordered frame that
// contains ONLY the Table + Pagination — no filter bars, no page
// header. So the chrome budget is small and stable (it doesn't drift
// when the filter bar wraps).
//
// Chrome subtracted from the table-card's clientHeight:
//   - TableHeader                ≈ 40px (h-12 with cell padding + border)
//   - Pagination footer          ≈ 44px (border-t + py-2 + content)
//   - card border (1px × 2)      ≈ 2px
//   - safety buffer              ≈ 4px (round-off vs sub-px line heights)
//   Total ≈ 90px. Set to 96 for breathing room.

export function openExternalUrl(value: string): void {
  const opened = window.open(value, '_blank')
  if (opened) {
    opened.opener = null
    opened.focus()
    return
  }
  window.location.assign(value)
}

export function openExternalUrlFromAnchorClick(
  event: MouseEvent<HTMLAnchorElement>,
  value: string,
): void {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  ) {
    return
  }
  event.preventDefault()
  openExternalUrl(value)
}

export function isInternalExtensionTargetDateValid(value: string, filingDueDate: string): boolean {
  if (value === '') return true
  return isValidIsoDate(value) && isValidIsoDate(filingDueDate) && value <= filingDueDate
}

export function canSaveInternalExtensionPlan({
  draftTargetDate,
  filingDeadline,
  isPending = false,
  memo,
}: {
  draftTargetDate: string
  filingDeadline: string
  isPending?: boolean
  memo: string
}): boolean {
  return (
    !isPending &&
    draftTargetDate !== '' &&
    memo.trim().length > 0 &&
    isInternalExtensionTargetDateValid(draftTargetDate, filingDeadline)
  )
}

export function emptyExtensionPlanDraft(obligationId = ''): ExtensionPlanDraft {
  return {
    obligationId,
    memo: '',
    source: '',
    internalTargetDate: '',
    extendedFilingDate: '',
  }
}

export function extensionPlanDraftFromRow(
  row: Pick<
    ObligationQueueRow,
    'id' | 'extensionInternalTargetDate' | 'extensionMemo' | 'extensionSource'
  >,
): ExtensionPlanDraft {
  return {
    obligationId: row.id,
    memo: row.extensionMemo ?? '',
    source: row.extensionSource ?? '',
    internalTargetDate: row.extensionInternalTargetDate ?? '',
    extendedFilingDate: '',
  }
}

export function formatFiscalYearEnd(month: number, day: number): string {
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`
}

export function fiscalYearEndDraftValue(month: number | null, day: number | null): string {
  if (!month || !day) return ''
  return formatFiscalYearEnd(month, day)
}

export function fiscalYearEndParts(value: string): { month: number; day: number } | null {
  const match = /^\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*$/.exec(value)
  if (!match) return null
  const month = Number(match[1])
  const day = Number(match[2])
  const date = new Date(Date.UTC(2024, month - 1, day))
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return {
    month,
    day,
  }
}

export function isObligationQueueDetailTab(value: string): value is ObligationQueueDetailTab {
  return ObligationQueueDetailTabSchema.safeParse(value).success
}

export function readPlainRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return Object.fromEntries(Object.entries(value))
}

export function readNonEmptyString(
  record: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = record?.[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export function latestDeadlineInputRequest(
  auditEvents: readonly AuditEventPublic[],
): DeadlineInputRequestAudit | null {
  const sorted = [...auditEvents].toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
  for (const event of sorted) {
    if (event.action !== 'obligation.input_requested') continue
    const after = readPlainRecord(event.afterJson)
    return {
      recipientName: readNonEmptyString(after, 'recipientName'),
      recipientRole: readNonEmptyString(after, 'recipientRole'),
      message: readNonEmptyString(after, 'message'),
      createdAt: event.createdAt,
    }
  }
  return null
}

export function deadlineDetailStateObligationId(
  state: unknown,
  routeRef: string | null,
): string | null {
  if (!routeRef || !state || typeof state !== 'object') return null
  const obligationId = Reflect.get(state, 'obligationId')
  if (typeof obligationId !== 'string') return null
  return obligationIdMatchesDeadlineRef(obligationId, routeRef) ? obligationId : null
}

export function parseGeneratedReadinessChecklist(
  value: string | null,
): ReadinessChecklistItem[] | null {
  if (!value) return null
  try {
    const parsed = ReadinessChecklistItemsSchema.safeParse(JSON.parse(value))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function searchParamArrayEquals(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

export function setOptionalSearchParam(
  params: URLSearchParams,
  key: string,
  value: string | number | null,
): void {
  if (value === null || value === '') {
    params.delete(key)
    return
  }
  params.set(key, String(value))
}

export function setArraySearchParam(
  params: URLSearchParams,
  key: string,
  values: readonly string[],
): void {
  if (values.length === 0) {
    params.delete(key)
    return
  }
  params.set(key, values.join(','))
}

export function deadlineDetailSearchFromQueueState(
  search: string,
  state: DeadlineDetailQueueSearchState,
): string {
  const baseSearch = cleanDeadlineDetailSearch(search)
  const params = new URLSearchParams(baseSearch.startsWith('?') ? baseSearch.slice(1) : baseSearch)

  setOptionalSearchParam(params, 'q', state.q)
  setArraySearchParam(params, 'status', state.status)
  setOptionalSearchParam(params, 'obligation', state.obligation)
  setArraySearchParam(params, 'client', state.client)
  setArraySearchParam(params, 'rule', state.rule)
  setArraySearchParam(params, 'state', state.state)
  setArraySearchParam(params, 'county', state.county)
  setArraySearchParam(params, 'taxType', state.taxType)
  setOptionalSearchParam(params, 'assignee', state.assignee)
  setArraySearchParam(params, 'assignees', state.assignees)
  setOptionalSearchParam(params, 'owner', state.owner)
  setOptionalSearchParam(params, 'due', state.due)
  setOptionalSearchParam(params, 'dueWithin', state.dueWithin)
  setOptionalSearchParam(params, 'evidence', state.evidence)
  if (state.awaitingSignature === true) params.set('awaitingSignature', 'true')
  else params.delete('awaitingSignature')
  if (state.projected === true) params.set('projected', 'true')
  else params.delete('projected')
  setOptionalSearchParam(params, 'daysMin', state.daysMin)
  setOptionalSearchParam(params, 'daysMax', state.daysMax)
  setOptionalSearchParam(params, 'asOf', state.asOf)
  setOptionalSearchParam(params, 'sort', state.sort === DEFAULT_SORT ? null : state.sort)
  setOptionalSearchParam(
    params,
    'density',
    state.density === DEFAULT_DENSITY ? null : state.density,
  )
  setOptionalSearchParam(params, 'group', state.group === DEFAULT_GROUP ? null : state.group)
  if (state.hide.length === 0) {
    params.set('hide', '')
  } else if (searchParamArrayEquals(state.hide, DEFAULT_HIDDEN_COLUMN_IDS)) {
    params.delete('hide')
  } else {
    params.set('hide', state.hide.join(','))
  }

  const nextSearch = params.toString()
  return nextSearch ? `?${nextSearch}` : ''
}

export function isThisWeekFilterActive(daysMin: number | null, daysMax: number | null): boolean {
  return daysMin === null && daysMax === THIS_WEEK_MAX_DAYS
}

export function nextThisWeekFilterPatch(
  daysMin: number | null,
  daysMax: number | null,
): Partial<ObligationQueueSearchParams> {
  const isActive = isThisWeekFilterActive(daysMin, daysMax)
  return {
    dueWithin: null,
    due: null,
    daysMin: null,
    daysMax: isActive ? null : THIS_WEEK_MAX_DAYS,
    obligation: null,
    row: null,
  }
}

export function isObligationStatus(value: string): value is ObligationStatus {
  return ALL_STATUSES.some((status) => status === value)
}

export function getSortingState(sort: ObligationQueueSort): SortingState {
  if (sort === 'smart_priority') return [{ id: 'smartPriority', desc: true }]
  if (sort === 'due_desc') return [{ id: 'currentDueDate', desc: true }]
  if (sort === 'updated_desc') return [{ id: 'updatedAt', desc: true }]
  return [{ id: 'currentDueDate', desc: false }]
}

export function withDefaultSortCleared(sort: ObligationQueueSort): ObligationQueueSort | null {
  return sort === DEFAULT_SORT ? null : sort
}

export function nextHeaderSort({
  currentSort,
  ascSort,
  descSort,
  firstSort,
}: {
  currentSort: ObligationQueueSort
  ascSort: ObligationQueueSort
  descSort: ObligationQueueSort
  firstSort: ObligationQueueSort
}): ObligationQueueSort {
  if (currentSort !== ascSort && currentSort !== descSort) return firstSort
  return currentSort === ascSort ? descSort : ascSort
}

export function obligationQueueColumnAriaSort(columnId: string, sort: ObligationQueueSort) {
  if (columnId === 'currentDueDate') {
    if (sort === 'due_asc') return 'ascending'
    if (sort === 'due_desc') return 'descending'
    return 'none'
  }
  return undefined
}

export function cleanStringFilters(values: readonly string[], maxLength = 120): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value.length <= maxLength),
    ),
  ].slice(0, OBLIGATION_QUEUE_FILTER_MAX_SELECTIONS)
}

export function cleanEntityIdFilters(values: readonly string[]): string[] {
  return cleanStringFilters(values).filter((value) => UUID_RE.test(value))
}

export function cleanStateFilters(values: readonly string[]): string[] {
  return cleanStringFilters(values)
    .map((value) => value.toUpperCase())
    .filter((value) => STATE_CODE_RE.test(value))
}

export function cleanColumnIds(values: readonly string[]): string[] {
  return cleanStringFilters(values, 80).filter((value) => !NON_HIDEABLE_COLUMNS.has(value))
}

export function columnVisibilityFromHidden(hidden: readonly string[]): VisibilityState {
  return Object.fromEntries(cleanColumnIds(hidden).map((columnId) => [columnId, false]))
}

export function hiddenFromColumnVisibility(visibility: VisibilityState): string[] {
  return Object.entries(visibility)
    .filter(([columnId, isVisible]) => !isVisible && !NON_HIDEABLE_COLUMNS.has(columnId))
    .map(([columnId]) => columnId)
}

export function daysFilterValue(value: number | null): number | undefined {
  if (value === null || !Number.isSafeInteger(value)) return undefined
  return Math.min(DAYS_FILTER_MAX, Math.max(DAYS_FILTER_MIN, value))
}

export function columnLabel(columnId: string, labels: Record<string, string>): string {
  return labels[columnId] ?? columnId
}

export function isObligationQueueRowControlClick(
  target: EventTarget | null,
  rowElement: HTMLElement | null,
): boolean {
  if (!(target instanceof Element)) return false
  const closestControl = target.closest<HTMLElement>(OBLIGATION_QUEUE_ROW_CONTROL_SELECTOR)
  return closestControl !== null && closestControl !== rowElement
}

export function scrollObligationRowIntoView(rowId: string | null): void {
  if (!rowId || typeof document === 'undefined') return
  window.requestAnimationFrame(() => {
    const escapedRowId =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(rowId)
        : rowId.replace(/["\\]/g, '\\$&')
    const node = document.querySelector<HTMLElement>(`[data-row-id="${escapedRowId}"]`)
    node?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isAuthorityRejectionNextStep(
  value: unknown,
): value is ObligationFiledRejectionNextStep {
  return typeof value === 'string' && AUTHORITY_REJECTION_NEXT_STEPS.has(value)
}

export function cleanOptionalText(value: string): string | undefined {
  const cleaned = value.trim()
  return cleaned ? cleaned : undefined
}

export function defaultAuthorityRejectionDraft(row: ObligationQueueRow): AuthorityRejectionDraft {
  return {
    rejectedAt: todayIsoDate(),
    authority: row.authority?.trim() || 'IRS',
    reference: '',
    reason: '',
    nextStep: 'correct_resubmit',
  }
}

export function latestAuthorityRejectionAudit(
  auditEvents: readonly AuditEventPublic[],
): AuthorityRejectionAuditDetails | null {
  const event = auditEvents
    .filter((candidate) => candidate.action === 'obligation.efile.rejected')
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  if (!event) return null

  const after = isPlainObject(event.afterJson) ? event.afterJson : {}
  const rejectedAt = typeof after.efileRejectedAt === 'string' ? after.efileRejectedAt : null
  const authority = typeof after.authority === 'string' && after.authority ? after.authority : null
  const reference = typeof after.reference === 'string' && after.reference ? after.reference : null
  const reason =
    typeof after.reason === 'string' && after.reason
      ? after.reason
      : event.reason && event.reason.trim()
        ? event.reason
        : null
  const nextStep = isAuthorityRejectionNextStep(after.nextStep) ? after.nextStep : null

  return { rejectedAt, authority, reference, reason, nextStep }
}

export function diffIsoDateDays(fromIso: string, toIso: string): number {
  return Math.round(
    (Date.parse(`${toIso}T00:00:00.000Z`) - Date.parse(`${fromIso}T00:00:00.000Z`)) / DAY_MS,
  )
}

export function exportQueryFromListInput(
  input: ObligationQueueListInputWithoutCursor,
): ObligationQueueExportQuery {
  const { limit: _limit, ...query } = input
  return query
}

export function downloadBase64File(input: {
  fileName: string
  contentType: string
  contentBase64: string
}) {
  const binary = atob(input.contentBase64)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: input.contentType }))
  const link = document.createElement('a')
  link.href = url
  link.download = input.fileName
  link.click()
  URL.revokeObjectURL(url)
}

export function facetOptionToFilterOption(option: ObligationQueueFacetOption): FilterOption {
  return {
    value: option.value,
    label: option.label,
    count: option.count,
  }
}

// Compute the next row-selection state when shift-clicking a checkbox.
// Selects every id in `orderedIds` between `anchorId` and `targetId` inclusive.
// If `anchorId` is missing or not in the list, falls back to a single-row toggle.

export function rangeSelectionUpdate({
  current,
  orderedIds,
  anchorId,
  targetId,
  nextChecked,
}: {
  current: RowSelectionState
  orderedIds: readonly string[]
  anchorId: string | null
  targetId: string
  nextChecked: boolean
}): RowSelectionState {
  const targetIndex = orderedIds.indexOf(targetId)
  if (targetIndex === -1) return current
  const anchorIndex = anchorId ? orderedIds.indexOf(anchorId) : -1
  if (anchorIndex === -1) {
    const next = { ...current }
    if (nextChecked) next[targetId] = true
    else delete next[targetId]
    return next
  }
  const [start, end] =
    anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex]
  const next = { ...current }
  for (let i = start; i <= end; i += 1) {
    const id = orderedIds[i]
    if (!id) continue
    if (nextChecked) next[id] = true
    else delete next[id]
  }
  return next
}

export function selectionHeaderState(
  selection: RowSelectionState,
  orderedIds: readonly string[],
): 'none' | 'all' | 'partial' {
  if (orderedIds.length === 0) return 'none'
  let selectedCount = 0
  for (const id of orderedIds) {
    if (selection[id]) selectedCount += 1
  }
  if (selectedCount === 0) return 'none'
  if (selectedCount === orderedIds.length) return 'all'
  return 'partial'
}

export function dueDaysTone(days: number): DueDaysTone {
  // Calmer color ladder. The previous tone used a solid white-on-red
  // pill for *any* past-due row, which made every late filing scream
  // and stripped urgency hierarchy from the queue. We now stay in soft
  // tints and reserve the loudest red for rows that are both late AND
  // imminent — the warning amber band carries everything else past
  // due, and the future band stays neutral so the eye lands on
  // genuinely urgent rows.
  if (days < -7) return { variant: 'destructive', dot: 'error' }
  if (days < 0) return { variant: 'warning', dot: 'error' }
  if (days <= 2) return { variant: 'warning', dot: 'warning' }
  if (days <= 7) return { variant: 'outline', dot: 'warning' }
  return { variant: 'outline', dot: 'normal' }
}

export function isDueDaysSuppressedForStatus(status: ObligationStatus): boolean {
  return DUE_DAYS_TERMINAL_STATUSES.has(status)
}

export function effectiveInternalDueDate(
  row: Pick<ObligationQueueRow, 'currentDueDate' | 'extensionInternalTargetDate'>,
): string {
  return row.extensionInternalTargetDate ?? row.currentDueDate
}

export function daysUntilEffectiveInternalDueDate(
  row: Pick<ObligationQueueRow, 'currentDueDate' | 'daysUntilDue' | 'extensionInternalTargetDate'>,
  today = todayIsoDate(),
): number {
  const internalDueDate = effectiveInternalDueDate(row)
  if (internalDueDate === row.currentDueDate) return row.daysUntilDue
  const ms = new Date(internalDueDate).getTime() - new Date(today).getTime()
  return Math.round(ms / DAY_MS)
}

// Stages whose `isPastInternalDue` red ring is suppressed in the
// milestone timeline. Lateness on a Filed/Completed row is a quality
// stat, not an active urgency — the dates panel shows the red
// Internal due value, that's the surface for "was this filed on
// time?". Hoisted out of `PathToFilingSummary` so we don't allocate
// the Set every render.

export function formatTaxPeriod(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start || !end) return '—'
  const startIso = start.slice(0, 10)
  const endIso = end.slice(0, 10)
  const startYear = startIso.slice(0, 4)
  const endYear = endIso.slice(0, 4)
  if (startYear === endYear && startIso.endsWith('-01-01') && endIso.endsWith('-12-31')) {
    return startYear
  }
  return `${formatDate(startIso)} – ${formatDate(endIso)}`
}

// PrimaryDeadlineStrip — three-column row at the top of the snapshot.
// The three dates the CPA reaches for first — Internal, Filing,
// Payment — sit here instead of buried under "Reference dates" so
// they're answer-at-a-glance. Each
// column shows: small uppercase label / date in tabular-num / a small
// state tag (MISSED in red when the date is in the past, otherwise
// blank to keep the row quiet). Internal due is the primary CPA-
// internal deadline; Filing is the statutory; Payment is the
// authority-payment due.

export function humanizeAuditAction(action: string): string {
  const cleaned = action
    .replace(/^obligation\./, '')
    .replace(/[._-]/g, ' ')
    .trim()
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : action
}

// Past-stage entry = a contiguous span the row spent in one stage,
// bookended by audit events. Used by the "Previous stages" collapsible
// list below the active card so the CPA can see (and drill into) what
// happened in earlier stages without leaving the panel.

export function computePastStageEntries(
  auditEvents: readonly AuditEventPublic[],
): PastStageEntry[] {
  if (auditEvents.length === 0) return []
  // Sort oldest → newest so spans accumulate forward in time
  const sorted = [...auditEvents].toSorted((a, b) => a.createdAt.localeCompare(b.createdAt))
  // Tag each event with the stage it lands the row in (drop events
  // that don't carry a status transition)
  type EventWithStage = { event: AuditEventPublic; stageKey: TimelineStageKey }
  const tagged: EventWithStage[] = []
  for (const event of sorted) {
    if (typeof event.afterJson !== 'object' || event.afterJson === null) continue
    const status = (event.afterJson as { status?: unknown }).status
    if (typeof status !== 'string') continue
    const stageIdx = timelineIndexForStatus(status)
    const stageKey = TIMELINE_STAGE_KEYS[stageIdx]
    if (!stageKey) continue
    tagged.push({ event, stageKey })
  }
  if (tagged.length === 0) return []
  // Group consecutive events with the same stage into one span. Each
  // new stage closes the previous span's exitAt at the new entry.
  type Span = {
    stageKey: TimelineStageKey
    entryAt: string
    exitAt: string | null
    events: AuditEventPublic[]
  }
  const spans: Span[] = []
  for (const { event, stageKey } of tagged) {
    const last = spans[spans.length - 1]
    if (last && last.stageKey === stageKey) {
      last.events.push(event)
    } else {
      if (last) last.exitAt = event.createdAt
      spans.push({ stageKey, entryAt: event.createdAt, exitAt: null, events: [event] })
    }
  }
  // Past = every span EXCEPT the latest (which is the active stage
  // the row is still sitting in)
  const past = spans.slice(0, -1)
  return past.map((span) => ({
    stageKey: span.stageKey,
    entryAt: span.entryAt,
    exitAt: span.exitAt ?? span.entryAt,
    events: span.events,
  }))
}

// Canonical e-file sub-status pipeline. Linear path the row walks
// from the moment we ask for 8879 authorization through to delivering
// the final package. Branch states (rejected, corrected_resubmitted,
// paper_filed) render inline as alternative current-step labels
// rather than full extra rows, to keep the strip compact.

export function reviewPipelineCurrent(
  row: Pick<ObligationQueueRow, 'prepStage' | 'reviewStage'>,
): ReviewPipelineKey {
  if (row.reviewStage === 'approved') return 'ready_to_file'
  if (row.prepStage === 'in_prep' && row.reviewStage !== 'in_review') return 'preparing_return'
  if (
    row.reviewStage === 'in_review' ||
    row.reviewStage === 'notes_open' ||
    row.prepStage === 'prepared' ||
    row.prepStage === 'ready_for_prep'
  ) {
    return 'reviewing_return'
  }
  return 'preparing_return'
}

export function countOutstandingReadinessDocuments(
  checklist: readonly Pick<ReadinessDocumentChecklistItemPublic, 'status'>[],
): number {
  return checklist.filter((item) => item.status !== 'received').length
}

export function willReadinessChecklistBeFullyReceived(
  checklist: readonly Pick<ReadinessDocumentChecklistItemPublic, 'id' | 'status'>[],
  receivedItemIds: ReadonlySet<string>,
): boolean {
  return (
    checklist.length > 0 &&
    // A waived item no longer applies this year, so it counts as satisfied
    // alongside received items when deciding "is the checklist complete?".
    checklist.every(
      (item) =>
        item.status === 'received' || item.status === 'waived' || receivedItemIds.has(item.id),
    )
  )
}

export function normalizeMaterialsReferenceValue(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_')
}

export function materialsReferenceSearchValue(
  row: Pick<ObligationQueueRow, 'taxType' | 'formName' | 'obligationType'>,
): string {
  return [row.taxType, row.formName, row.obligationType]
    .map(normalizeMaterialsReferenceValue)
    .filter(Boolean)
    .join('_')
}

export function matchesMaterialsReference(value: string, fragments: readonly string[]): boolean {
  return fragments.some((fragment) => value.includes(fragment))
}

export function materialsChecklistReference(
  row: Pick<ObligationQueueRow, 'taxType' | 'formName' | 'obligationType'>,
): string | null {
  const value = materialsReferenceSearchValue(row)
  if (
    matchesMaterialsReference(value, ['1040_es', '1040_estimated_tax', 'individual_estimated_tax'])
  ) {
    return row.formName?.trim() || 'Form 1040-ES'
  }
  if (
    matchesMaterialsReference(value, [
      '1040',
      'individual_income_tax',
      'state_individual_income_tax',
      'schedule_c',
      'sch_c',
    ])
  ) {
    return 'Form 1040'
  }
  return null
}

// Resolve the pipeline position of a step relative to where the row
// currently sits. Returns 'done' for steps the row has already
// passed, 'current' for the active step, 'upcoming' for steps still
// ahead. If the row has no sub-status set, EVERY step reads as
// 'upcoming' (the row hasn't entered the pipeline).

export function pipelineStateOf<T extends string>(
  stepKey: T,
  current: T | null | undefined,
  pipeline: readonly T[],
): 'done' | 'current' | 'upcoming' {
  if (!current) return 'upcoming'
  const currentIdx = pipeline.indexOf(current)
  if (currentIdx === -1) return 'upcoming'
  const stepIdx = pipeline.indexOf(stepKey)
  if (stepIdx < currentIdx) return 'done'
  if (stepIdx === currentIdx) return 'current'
  return 'upcoming'
}

export function subStatusForActiveStage(
  row: ObligationQueueRow,
  t: (strings: TemplateStringsArray, ...keys: unknown[]) => string,
): string | null {
  switch (row.status) {
    case 'waiting_on_client': {
      if (row.prepStage === 'waiting_on_client') return t`Documents from client`
      if (row.prepStage === 'waiting_on_third_party') return t`Third-party docs`
      if (row.prepStage === 'bookkeeping_cleanup') return t`Bookkeeping cleanup`
      if (row.prepStage === 'ready_for_prep') return t`Ready for prep`
      return null
    }
    case 'blocked': {
      if (row.blockedByObligationInstanceId) return t`Upstream deadline`
      return null
    }
    case 'review':
    case 'in_progress': {
      if (row.reviewStage === 'notes_open') return t`Notes open`
      if (reviewPipelineCurrent(row) === 'ready_to_file') return t`Ready to file`
      if (reviewPipelineCurrent(row) === 'reviewing_return') return t`Reviewing`
      return t`Preparing`
    }
    case 'done':
    case 'paid': {
      if (row.efileState === 'accepted') return t`Accepted by authority`
      if (row.efileState === 'rejected') return t`Rejected — unwind to In review`
      if (row.efileState === 'submitted') return t`Awaiting acceptance`
      if (row.efileState === 'paper_filed') return t`Paper filed`
      if (row.efileState === 'corrected_resubmitted') return t`Corrected & resubmitted`
      if (row.efileState === 'final_package_delivered') return t`Package delivered`
      return null
    }
    case 'extended': {
      return t`Extension active`
    }
    default:
      return null
  }
}

export function timelineIndexForStatus(status: string): number {
  switch (status) {
    case 'pending':
    case 'not_applicable':
      return 0
    case 'waiting_on_client':
      return 1
    case 'blocked':
      return 2
    case 'in_progress':
    case 'review':
    case 'extended':
      return 3
    case 'done':
    case 'paid':
      return 4
    case 'completed':
      return 5
    default:
      return 0
  }
}

// Number of distinct stages in the milestone timeline — pending,
// waiting_on_client, blocked, review, done, completed. Used to size
// the result array of `mineTimelineTimestamps` so the indices line up
// with `timelineIndexForStatus`.

export function mineTimelineTimestamps(
  auditEvents: readonly AuditEventPublic[],
): (string | null)[] {
  const sorted = [...auditEvents].toSorted((a, b) => a.createdAt.localeCompare(b.createdAt))
  const stamps: (string | null)[] = Array.from({ length: TIMELINE_STAGE_COUNT }, () => null)
  for (const event of sorted) {
    if (typeof event.afterJson !== 'object' || event.afterJson === null) continue
    const afterStatus = (event.afterJson as { status?: unknown }).status
    if (typeof afterStatus !== 'string') continue
    const idx = timelineIndexForStatus(afterStatus)
    if (stamps[idx] === null) stamps[idx] = event.createdAt
  }
  return stamps
}

export function parseMoneyCents(value: string): number | null {
  const normalized = value.trim().replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : null
}

export function parseOwnerCount(value: string): number | null {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

// Scope tab — borderless, inline count, active state is a 2px accent
// underline that overlaps the parent's bottom hairline (via -mb-px on
// the parent and border-b-2 here). The count is a sibling tabular span,
// not a nested pill — pill-inside-pill was visual stutter.
//
// Collapsible search control — magnifier icon at rest, expands into
// an inline Input when clicked OR when the user presses `/` (the
// global hotkey focuses `inputRef`, which auto-opens via the
// Input's own onFocus). Stays open while a query value is present
// so the user always sees what they're filtering by.
