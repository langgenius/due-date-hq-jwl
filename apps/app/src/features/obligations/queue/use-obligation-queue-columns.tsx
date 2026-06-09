// Column definitions for the obligation queue table (/deadlines), extracted from
// routes/obligations.tsx as the useObligationQueueColumns hook. The route owns
// all state; this hook receives the reactive closure as params and memoizes the
// ColumnDef[] with the same dependency list it had inline.
import { type RefObject, useMemo } from 'react'

import { Trans, useLingui } from '@lingui/react/macro'
import { type ColumnDef } from '@tanstack/react-table'
import type { SetValues } from 'nuqs'
import { CheckCircle2Icon, CircleDollarSignIcon, EyeIcon, Hourglass } from 'lucide-react'

import {
  type MemberAssigneeOption,
  type ObligationQueueRow,
  type ObligationQueueSort,
} from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import { EmptyCellMark } from '@/components/patterns/empty-cell-mark'
import { TableHeaderMultiFilter } from '@/components/patterns/table-header-filter'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { ClientPeekHoverCard } from '@/features/clients/ClientPeekHoverCard'
import { ConceptLabel } from '@/features/concepts/concept-help'
import type { OpenEvidenceInput } from '@/features/evidence/EvidenceDrawerContext'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { BlockedByChip, isBlockedByVisible } from '@/features/obligations/blocked-by-chip'
import { paymentOverdueDays } from '@/features/obligations/payment-overdue'
import { isRejectionVisible, RejectionChip } from '@/features/obligations/rejection-chip'
import {
  ObligationQueueStatusControl,
  type ObligationStatus,
} from '@/features/obligations/status-control'
import { formatTaxCode } from '@/lib/tax-codes'
import { cn, formatDate, formatDatePretty } from '@/lib/utils'

import type { ClientFilterOption, FilterOption } from './types'
import { OBLIGATION_QUEUE_DUE_COL_WIDTH, obligationQueueSearchParamsParsers } from './constants'
import {
  daysUntilEffectiveInternalDueDate,
  effectiveInternalDueDate,
  isObligationStatus,
  rangeSelectionUpdate,
} from './helpers'
import { DueDaysPill } from './components/primitives'
import { AssigneeQuickPicker, ObligationQueueSortableHeader } from './components/toolbar'

export type UseObligationQueueColumnsParams = {
  assignClient: (input: { clientIds: string[]; assigneeId: string | null }) => void
  assignableMembers: MemberAssigneeOption[]
  assigneeUpdatePending: boolean
  changeSort: (nextSort: ObligationQueueSort) => void
  canUpdateObligationStatus: boolean
  clientOptions: ClientFilterOption[]
  clientQuery: string[]
  continuationRowIds: Set<string>
  currentUserName: string | null
  explicitActiveRowId: string | null
  filtersDisabled: boolean
  openHeaderFilter: string | null
  openEvidence: (input: OpenEvidenceInput) => void
  panelOpenIntent: boolean
  rowsById: Map<string, ObligationQueueRow>
  setHeaderFilterOpen: (filterId: string, nextOpen: boolean) => void
  setObligationQueueQuery: SetValues<typeof obligationQueueSearchParamsParsers>
  lastSelectedIdRef: RefObject<string | null>
  sort: ObligationQueueSort
  stateOptions: FilterOption[]
  stateQuery: string[]
  statusDropdownOptions: readonly ObligationStatus[]
  statusLabels: Record<ObligationStatus, string>
  statusOptions: FilterOption[]
  statusQuery: ObligationStatus[]
  statusUpdatePending: boolean
  taxTypeOptions: FilterOption[]
  taxTypeQuery: string[]
  updateStatus: (
    input: { id: string; status: ObligationStatus },
    previousStatus: ObligationStatus,
  ) => void
}

export function useObligationQueueColumns(
  params: UseObligationQueueColumnsParams,
): ColumnDef<ObligationQueueRow>[] {
  const {
    assignClient,
    assignableMembers,
    assigneeUpdatePending,
    changeSort,
    canUpdateObligationStatus,
    clientOptions,
    clientQuery,
    continuationRowIds,
    currentUserName,
    explicitActiveRowId,
    filtersDisabled,
    openHeaderFilter,
    openEvidence,
    panelOpenIntent,
    rowsById,
    setHeaderFilterOpen,
    setObligationQueueQuery,
    lastSelectedIdRef,
    sort,
    stateOptions,
    stateQuery,
    statusDropdownOptions,
    statusLabels,
    statusOptions,
    statusQuery,
    statusUpdatePending,
    taxTypeOptions,
    taxTypeQuery,
    updateStatus,
  } = params
  const { t } = useLingui()
  return useMemo<ColumnDef<ObligationQueueRow>[]>(
    () => [
      {
        id: 'select',
        enableHiding: false,
        header: ({ table }) => {
          const allSelected = table.getIsAllPageRowsSelected()
          const someSelected = table.getIsSomePageRowsSelected()
          return (
            <Checkbox
              aria-label={t`Select all visible rows`}
              checked={allSelected}
              indeterminate={!allSelected && someSelected}
              onCheckedChange={(checked) => {
                table.toggleAllPageRowsSelected(checked)
                lastSelectedIdRef.current = null
              }}
            />
          )
        },
        cell: ({ row: tableRow, table }) => {
          const isContinuation = continuationRowIds.has(tableRow.original.id)
          return (
            <div className={cn(isContinuation && 'translate-x-[26px]')}>
              <Checkbox
                aria-label={t`Select ${tableRow.original.clientName}`}
                checked={tableRow.getIsSelected()}
                onClick={(event) => {
                  event.stopPropagation()
                  if (event.shiftKey && lastSelectedIdRef.current) {
                    event.preventDefault()
                    const nextChecked = !tableRow.getIsSelected()
                    const orderedIds = table.getRowModel().rows.map((r) => r.original.id)
                    table.setRowSelection((current) =>
                      rangeSelectionUpdate({
                        current,
                        orderedIds,
                        anchorId: lastSelectedIdRef.current,
                        targetId: tableRow.original.id,
                        nextChecked,
                      }),
                    )
                    lastSelectedIdRef.current = tableRow.original.id
                  }
                }}
                onCheckedChange={(checked) => {
                  tableRow.toggleSelected(checked)
                  lastSelectedIdRef.current = tableRow.original.id
                }}
              />
            </div>
          )
        },
        meta: { headerClassName: 'w-10', cellClassName: 'w-10' },
      },
      {
        accessorKey: 'clientName',
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`Client`}
            open={openHeaderFilter === 'client'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('client', nextOpen)}
            options={clientOptions}
            selected={clientQuery}
            disabled={filtersDisabled}
            emptyLabel={t`No clients`}
            searchable
            searchPlaceholder={t`Search clients`}
            onSelectedChange={(nextClient) =>
              void setObligationQueueQuery({
                client: nextClient.length > 0 ? nextClient : null,
                obligation: null,
                row: null,
              })
            }
          />
        ),
        cell: ({ row: tableRow, table }) => {
          const isContinuation = continuationRowIds.has(tableRow.original.id)
          // Shift+click the client name → range-select every row
          // sharing this clientId (2026-05-21). Matches the hybrid
          // multi-select model: filings-default, with a group-expand
          // keystroke for the one workflow (reassignment) that
          // naturally lives at the client level. Unshifted clicks
          // pass through to the row handler that opens the drawer.
          const handleClientNameClick = (event: React.MouseEvent<HTMLElement>) => {
            if (!event.shiftKey) return
            event.preventDefault()
            event.stopPropagation()
            const targetClientId = tableRow.original.clientId
            const allRows = table.getRowModel().rows
            const groupIds = allRows
              .filter((candidate) => candidate.original.clientId === targetClientId)
              .map((candidate) => candidate.original.id)
            if (groupIds.length === 0) return
            const allSelected = groupIds.every(
              (id) =>
                allRows.find((candidate) => candidate.original.id === id)?.getIsSelected() ?? false,
            )
            const nextChecked = !allSelected
            table.setRowSelection((current) => {
              const next = { ...current }
              for (const id of groupIds) {
                if (nextChecked) next[id] = true
                else delete next[id]
              }
              return next
            })
            lastSelectedIdRef.current = tableRow.original.id
          }
          // No `role="button"` here on purpose: unshifted clicks need
          // to bubble to the row handler so the drawer opens.
          // Marking the span as a button would make
          // `isObligationQueueRowControlClick` treat it as a control
          // and the row would only focus, not open.
          if (isContinuation) {
            return (
              <div
                className="min-w-0 pl-6"
                onClick={handleClientNameClick}
                onMouseDown={(event) => {
                  if (event.shiftKey) event.preventDefault()
                }}
              >
                <span className="sr-only">{tableRow.original.clientName}</span>
                <span aria-hidden className="block h-px w-8 rounded-full bg-divider-regular" />
              </div>
            )
          }
          return (
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                onClick={handleClientNameClick}
                onMouseDown={(event) => {
                  // Prevent text-selection drag from interfering with
                  // the shift-click range gesture.
                  if (event.shiftKey) event.preventDefault()
                }}
                className={cn(
                  'line-clamp-2 min-w-0 flex-1 text-sm leading-tight text-text-primary',
                  tableRow.original.id === explicitActiveRowId ? 'font-medium' : 'font-normal',
                )}
                title={t`${tableRow.original.clientName} · Shift+click to select all of this client's rows`}
              >
                {tableRow.original.clientName}
              </span>
              {/* Peek the client info in place. The eye icon is the
                    hover/focus trigger for a small popover (ClientPeek
                    HoverCard) — no click required to see identity. The
                    popover has its own "Open full page" / "All
                    obligations" navigation buttons.

                    `stopPropagation` on click prevents the row's
                    obligation-drawer onClick from firing if the user
                    does click the eye. Visible on row hover, also on
                    keyboard focus for accessibility. */}
              <ClientPeekHoverCard clientId={tableRow.original.clientId}>
                <button
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  aria-label={t`Peek ${tableRow.original.clientName} details`}
                  title={t`Peek client details`}
                  className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-tertiary opacity-0 outline-none transition-opacity group-hover:opacity-100 hover:bg-state-base-hover hover:text-text-primary focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                >
                  <EyeIcon className="size-3.5" aria-hidden />
                </button>
              </ClientPeekHoverCard>
            </div>
          )
        },
        meta: { cellClassName: 'min-w-[200px] max-w-[280px]' },
      },
      {
        // Smart Priority — second data column (right after Client) per
        // 2026-05-21 design call. Client is the primary anchor; Priority
        // answers "why am I looking at this row" right next to the
        // name. Default sort is smart_priority desc, so this column
        // doubles as the implicit sort key.
        accessorKey: 'smartPriority',
        id: 'smartPriority',
        // 2026-05-27 (Yuqi feedback "remove the sortby arrow besides
        // priority — no use"): Priority IS the default sort, so the
        // click-to-sort affordance was a no-op (sorting by priority
        // when already sorted by priority). Header is now plain text.
        header: () => <span>{t`Priority`}</span>,
        cell: ({ row: tableRow }) => {
          const score = tableRow.original.smartPriority.score
          const rank = tableRow.original.smartPriority.rank
          // 2026-05-27 (Yuqi feedback "priority just show the number, don't
          // write urgent or now"): tier labels ("Urgent" / "High" / "Med"
          // / "Low") retired. Column now renders just the numeric score
          // (rounded), with optical-weight inherited from the tier (kept
          // because the score's heaviness IS the visual urgency cue —
          // dropping weight too would flatten the whole column).
          const tierClassName =
            score >= 70
              ? 'text-text-primary font-semibold'
              : score >= 50
                ? 'text-text-primary font-medium'
                : score >= 25
                  ? 'text-text-secondary'
                  : 'text-text-tertiary'
          return (
            <div
              className="flex items-baseline gap-1.5"
              title={
                rank
                  ? t`Smart Priority ${score.toFixed(1)} · rank #${rank}`
                  : t`Smart Priority ${score.toFixed(1)}`
              }
            >
              <span className={cn('text-xs tabular-nums leading-tight', tierClassName)}>
                {Math.round(score)}
              </span>
              {rank ? (
                <span className="text-caption-xs tabular-nums leading-tight text-text-tertiary">
                  #{rank}
                </span>
              ) : null}
            </div>
          )
        },
        meta: { cellClassName: 'w-[90px]' },
      },
      {
        // Owner column — surfaces who's on the hook for this row. Per
        // docs/Design/ux-audit-2026-05-21.md P0 #3: triage of 47
        // assigned rows is impossible without "is this mine?" The
        // existing assignee facet filter helps once you know to
        // filter; this column answers the question at-a-glance with
        // no filter step.
        accessorKey: 'assigneeName',
        id: 'assigneeName',
        header: () => <span>{t`Assignee`}</span>,
        cell: ({ row: tableRow }) => {
          const assigneeName = tableRow.original.assigneeName
          if (!assigneeName) {
            // Unassigned = dashed-outline empty avatar, no text.
            // Reads as "slot exists but nobody's filled it."
            // 2026-05-26 (Yuqi sixty-sixth pass — inset-followup E
            // finally lands): the `?` is now a real DropdownMenu
            // trigger. Clicking it opens an assignee picker (same
            // member list + `clients.bulkUpdateAssignee` flow the
            // client-detail H1 owner-pill uses). Per obligation
            // schema review: there is no per-obligation `assignee`
            // — an obligation's assignee inherits from the client.
            // So the picker assigns the CLIENT, which propagates
            // to every deadline for that client. Tooltip + footer
            // copy make that scope explicit so the user doesn't
            // assign one row and discover they assigned twelve.
            return (
              <AssigneeQuickPicker
                clientName={tableRow.original.clientName}
                currentAssigneeId={null}
                currentUserName={currentUserName}
                assignableMembers={assignableMembers}
                disabled={assigneeUpdatePending}
                onChange={(assigneeId) =>
                  assignClient({
                    clientIds: [tableRow.original.clientId],
                    assigneeId,
                  })
                }
              />
            )
          }
          const isMine =
            currentUserName !== null &&
            assigneeName.trim().toLowerCase() === currentUserName.toLowerCase()
          return (
            <AssigneeAvatar
              name={assigneeName}
              isMine={isMine}
              title={isMine ? t`Assigned to you (${assigneeName})` : assigneeName}
            />
          )
        },
        meta: { cellClassName: 'w-[52px]' },
      },
      {
        accessorKey: 'clientState',
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`State`}
            open={openHeaderFilter === 'state'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('state', nextOpen)}
            options={stateOptions}
            selected={stateQuery}
            disabled={filtersDisabled}
            emptyLabel={t`No states`}
            onSelectedChange={(nextState) =>
              void setObligationQueueQuery({
                state: nextState.length > 0 ? nextState : null,
                county: null,
                obligation: null,
                row: null,
              })
            }
          />
        ),
        // 2026-05-26 (Yuqi /deadlines sixty-fifth pass — State cell
        // canonical): adopt the Alerts page's universal state
        // representation. The bare 2-letter code "CA" / "NY" read
        // as the same line of text as every other cell — the column
        // didn't actually look like "state" anything. Now: leading
        // StateBadge SVG (flag/seal motif) + code, matches the
        // Alerts state-chip strip + the /clients filing-states
        // pill so "state" reads as a recognized motif at scan
        // distance. Empty cell stays "—" since rendering a flag for
        // "no state" would be more confusing than less.
        cell: (info) => {
          const state = info.getValue<string | null>()
          if (!state) return <EmptyCellMark />
          // 2026-05-29 (Yuqi /clients round 1 — "remove the state icon
          // everywhere"): swept to a bordered Badge for cross-route
          // consistency with /clients. The SVG flag glyph is gone;
          // the code itself sits in the unified outline pill.
          return (
            <Badge variant="outline" className="text-xs font-normal">
              {state}
            </Badge>
          )
        },
        meta: { cellClassName: 'text-text-secondary' },
      },
      {
        accessorKey: 'taxType',
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`Tax type`}
            open={openHeaderFilter === 'taxType'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('taxType', nextOpen)}
            options={taxTypeOptions}
            selected={taxTypeQuery}
            disabled={filtersDisabled}
            emptyLabel={t`No forms`}
            onSelectedChange={(nextTaxType) =>
              void setObligationQueueQuery({
                taxType: nextTaxType.length > 0 ? nextTaxType : null,
                obligation: null,
                row: null,
              })
            }
          />
        ),
        cell: (info) => <TaxCodeLabel code={info.getValue<string>()} tooltip={false} />,
        meta: { cellClassName: 'min-w-[200px] text-text-secondary' },
      },
      {
        accessorKey: 'currentDueDate',
        header: () => {
          const label = t`Internal due date`
          // 2026-05-26 (Yuqi /deadlines sixty-fifth pass #5): dropped
          // the RangeHeaderFilterDropdown icon button. Yuqi's call:
          // "remove. Sort by is doing the same thing." The dropdown
          // was a min/max-days range filter on the column — but the
          // toolbar chip row above (Past Due / Due this week) already
          // covers the common date-range filters with one click, and
          // the column sort handle on this same header lets you find
          // any row by ordering. The icon-button-inside-header chrome
          // added a second affordance (range filter) that overlapped
          // semantically with sort + the toolbar chips. Killing it
          // also addresses #4 (no way to cancel an applied range)
          // because there's no longer an applied range to cancel.
          return (
            <ObligationQueueSortableHeader
              label={label}
              sort={sort}
              ascSort="due_asc"
              descSort="due_desc"
              firstSort="due_asc"
              sortLabel={`${t`Sort`} ${label}`}
              onSortChange={changeSort}
            />
          )
        },
        // Relative-time pill only ("3d late" / "in 5d"). Per
        // 2026-05-21 design call the exact date moved to its own
        // hide-by-default column ('dueDateExact' below) — most
        // triage decisions only need the relative urgency, and the
        // date row is signal-to-noise tax.
        cell: ({ row: tableRow }) => (
          <DueDaysPill
            days={daysUntilEffectiveInternalDueDate(tableRow.original)}
            status={tableRow.original.status}
          />
        ),
        meta: { cellClassName: `tabular-nums ${OBLIGATION_QUEUE_DUE_COL_WIDTH}` },
      },
      {
        // "Due date (exact)" — addable column for people who do need
        // to read the date. Hidden by default via DEFAULT_HIDDEN_COLUMN_IDS.
        // When the statutory deadline diverges from the internal one,
        // surface both inline so the audit anchor stays discoverable.
        accessorKey: 'currentDueDate',
        id: 'dueDateExact',
        header: () => <span>{t`Due date`}</span>,
        cell: ({ row: tableRow }) => {
          const internal = effectiveInternalDueDate(tableRow.original)
          const statutory = tableRow.original.baseDueDate
          const divergent = statutory && statutory !== internal
          return (
            <span className="text-xs tabular-nums text-text-secondary">
              {formatDate(internal)}
              {divergent ? (
                <>
                  <span className="mx-1 text-text-quaternary">·</span>
                  <span className="text-text-quaternary" title={t`Statutory deadline`}>
                    {formatDate(statutory)}
                  </span>
                </>
              ) : null}
            </span>
          )
        },
        meta: { cellClassName: `tabular-nums ${OBLIGATION_QUEUE_DUE_COL_WIDTH}` },
      },
      // "Projected risk" column removed 2026-05-21 per UX call —
      // the dollar exposure number lives inside the obligation drawer
      // and is summarised at the firm level on the dashboard. Surfacing
      // a per-row $ in the queue was over-quantifying triage decisions
      // that are really driven by status + due date. Penalty inputs
      // and risk filtering still ship via the chip row above.
      {
        accessorKey: 'evidenceCount',
        header: () => <ConceptLabel concept="evidence">{t`Evidence`}</ConceptLabel>,
        // Source-count badge + descriptive text, style-matched to the
        // Rule library's SOURCE column. Soft-green circle when sources
        // exist; muted gray circle when count is zero. Keeps the click
        // affordance (opens evidence drawer) but loses the heavy
        // ghost-button chrome — the dev-defining visual is the badge,
        // not a button.
        cell: ({ row: tableRow }) => {
          const count = tableRow.original.evidenceCount
          const hasEvidence = count > 0
          return (
            <button
              type="button"
              aria-label={
                hasEvidence
                  ? t`Open ${count} evidence sources for ${tableRow.original.clientName}`
                  : t`Add evidence for ${tableRow.original.clientName}`
              }
              onClick={(event) => {
                event.stopPropagation()
                openEvidence({
                  obligationId: tableRow.original.id,
                  label: `${tableRow.original.clientName} - ${formatTaxCode(tableRow.original.taxType)}`,
                })
              }}
              className="inline-flex cursor-pointer items-center rounded-sm outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              {hasEvidence ? (
                // Has evidence → green count badge only (the number
                // is the whole signal). No "N sources" duplicate text.
                <span
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-status-done/15 text-xs font-semibold tabular-nums text-status-done"
                  title={t`${count} sources attached`}
                >
                  {count}
                </span>
              ) : (
                // No evidence → just the text "Needs evidence" — a
                // zero-count circle would read as "we have something"
                // when we actually have nothing.
                <span className="text-xs text-text-tertiary">
                  <Trans>Needs evidence</Trans>
                </span>
              )}
            </button>
          )
        },
      },
      {
        accessorKey: 'status',
        // 2026-05-26 (Yuqi /deadlines feedback): "Sort by Status does
        // not work." It WAS working, just sorting alphabetically —
        // ('blocked', 'completed', 'done', 'extended', 'in_progress',
        // ...) which clustered statuses in an order that didn't match
        // any task-flow logic. Replace the alphabetical sort with an
        // urgency-ordered priority sort: not_started → blocked →
        // waiting_on_client → in_progress → in_review → done →
        // filed → paid → completed → extended → not_applicable. The
        // urgent / action-needed states come first so "Sort by
        // Status" surfaces what the CPA should work on next at the
        // top.
        sortingFn: (a, b) => {
          const order: Record<string, number> = {
            not_started: 0,
            pending: 0,
            blocked: 1,
            waiting_on_client: 2,
            review: 3,
            in_progress: 4,
            in_review: 5,
            done: 6,
            filed: 7,
            paid: 8,
            completed: 9,
            extended: 10,
            not_applicable: 11,
          }
          const ai = order[a.original.status] ?? 99
          const bi = order[b.original.status] ?? 99
          return ai - bi
        },
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`Status`}
            open={openHeaderFilter === 'status'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('status', nextOpen)}
            options={statusOptions}
            selected={statusQuery}
            emptyLabel={t`All statuses`}
            onSelectedChange={(nextStatus) => {
              const typedStatus = nextStatus.filter(isObligationStatus)
              void setObligationQueueQuery({
                status: typedStatus.length > 0 ? typedStatus : null,
                obligation: null,
                row: null,
              })
            }}
          />
        ),
        cell: ({ row: tableRow }) => {
          const obligationQueueRow = tableRow.original
          const showRejection = isRejectionVisible({
            status: obligationQueueRow.status,
            efileRejectedAt: obligationQueueRow.efileRejectedAt,
          })
          const showBlockedBy = isBlockedByVisible({
            status: obligationQueueRow.status,
            blockedByObligationInstanceId: obligationQueueRow.blockedByObligationInstanceId,
          })
          // 2026-05-27 (phi journey audit J1): payment-overdue chip in
          // the queue Status column. A row that's been Filed but whose
          // paymentDueDate has slipped used to render only the green
          // Filed pill — the queue itself never surfaced the buried
          // payment-overdue signal. Now: a small red Badge appears
          // next to the status pill when the row's payment is past
          // due, regardless of the lifecycle status. Stacks cleanly
          // with BlockedByChip / RejectionChip (they're status-state
          // signals; this is a date-state signal).
          const paymentLateDays = paymentOverdueDays(obligationQueueRow, Date.now())
          return (
            <div className="flex items-center gap-1.5">
              <ObligationQueueStatusControl
                row={obligationQueueRow}
                labels={statusLabels}
                statuses={statusDropdownOptions}
                disabled={statusUpdatePending}
                onChange={(id, status) => updateStatus({ id, status }, obligationQueueRow.status)}
                compact={panelOpenIntent}
                readOnly={!canUpdateObligationStatus}
              />
              {/* Projected (rolled-forward / auto-generated) deadline awaiting CPA
                    confirmation — withheld from the reminder pipeline until confirmed. */}
              {!obligationQueueRow.confirmed ? (
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-caption-xs"
                  title={t`Projected — won't send client reminders until a CPA confirms it.`}
                >
                  <Trans>Projected</Trans>
                </Badge>
              ) : null}
              {/* Awaiting-signature signal. A row marked Filed but still
                    parked at efileState=authorization_requested isn't truly
                    done — it's waiting on the client's 8879. Quiet outline
                    chip so the green Filed pill stops reading as "complete."
                    Mirrors the queue "Awaiting signature" filter lens. */}
              {obligationQueueRow.status === 'done' &&
              obligationQueueRow.efileState === 'authorization_requested' ? (
                panelOpenIntent ? (
                  <span
                    title={t`Filed, but the client hasn't signed Form 8879 yet — e-filing is blocked until they sign.`}
                    aria-label={t`Awaiting signature`}
                    className="inline-flex size-4 shrink-0 items-center justify-center text-text-tertiary"
                  >
                    <Hourglass className="size-3.5" aria-hidden />
                  </span>
                ) : (
                  <Badge
                    variant="outline"
                    className="h-5 gap-1 px-1.5 text-caption-xs"
                    title={t`Filed, but the client hasn't signed Form 8879 yet — e-filing is blocked until they sign.`}
                  >
                    <Hourglass className="size-3" aria-hidden />
                    <Trans>Awaiting signature</Trans>
                  </Badge>
                )
              ) : null}
              {obligationQueueRow.efileAcceptedAt && obligationQueueRow.status !== 'completed' ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-state-success-solid px-2 py-0.5 text-caption-xs font-medium text-text-inverted"
                  title={`${t`Authority accepted the return`} · ${formatDatePretty(obligationQueueRow.efileAcceptedAt.slice(0, 10))}`}
                >
                  <CheckCircle2Icon className="size-3" aria-hidden />
                  <Trans>Accepted</Trans>
                </span>
              ) : null}
              {paymentLateDays !== null ? (
                panelOpenIntent ? (
                  <span
                    title={t`Filing submitted but the authority payment due ${formatDate(obligationQueueRow.paymentDueDate ?? '')} hasn't been confirmed. Penalty interest accrues until the wire lands.`}
                    aria-label={t`Payment ${paymentLateDays}d late`}
                    className="inline-flex size-4 shrink-0 items-center justify-center text-text-tertiary"
                  >
                    <CircleDollarSignIcon className="size-4" aria-hidden />
                  </span>
                ) : (
                  <Badge
                    variant="destructive"
                    className="h-5 px-1.5 text-caption-xs"
                    title={t`Filing submitted but the authority payment due ${formatDate(obligationQueueRow.paymentDueDate ?? '')} hasn't been confirmed. Penalty interest accrues until the wire lands.`}
                  >
                    <Trans>Payment {paymentLateDays}d late</Trans>
                  </Badge>
                )
              ) : null}
              {showBlockedBy && obligationQueueRow.blockedByObligationInstanceId ? (
                <BlockedByChip
                  parentObligationId={obligationQueueRow.blockedByObligationInstanceId}
                  parentLabel={(() => {
                    const parent = rowsById.get(obligationQueueRow.blockedByObligationInstanceId)
                    if (!parent) return null
                    return `${parent.clientName} · ${formatTaxCode(parent.taxType)}`
                  })()}
                  onOpen={(parentId) =>
                    void setObligationQueueQuery({
                      obligation: parentId,
                      row: null,
                    })
                  }
                  compact={panelOpenIntent}
                />
              ) : null}
              {showRejection ? <RejectionChip compact={panelOpenIntent} /> : null}
            </div>
          )
        },
      },
    ],
    [
      assignClient,
      assignableMembers,
      assigneeUpdatePending,
      changeSort,
      canUpdateObligationStatus,
      clientOptions,
      clientQuery,
      continuationRowIds,
      currentUserName,
      explicitActiveRowId,
      filtersDisabled,
      openHeaderFilter,
      openEvidence,
      panelOpenIntent,
      rowsById,
      setHeaderFilterOpen,
      setObligationQueueQuery,
      sort,
      stateOptions,
      stateQuery,
      statusDropdownOptions,
      statusLabels,
      statusOptions,
      statusQuery,
      statusUpdatePending,
      lastSelectedIdRef,
      t,
      taxTypeOptions,
      taxTypeQuery,
      updateStatus,
    ],
  )
}
