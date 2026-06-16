import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ChevronDownIcon, ClipboardListIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@duedatehq/ui/lib/utils'

import type { ObligationQueueRow } from '@duedatehq/contracts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@duedatehq/ui/components/ui/alert-dialog'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import { EmptyState } from '@/components/patterns/empty-state'
import {
  FloatingActionBar,
  FLOATING_ACTION_BAR_SCROLL_PADDING,
} from '@/components/patterns/floating-action-bar'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { DeadlineRow } from '@/features/obligations/queue/components/DeadlineRow'
import {
  LIFECYCLE_V2_STATUSES,
  useLifecycleV2StatusLabels,
  type ObligationStatus,
} from '@/features/obligations/status-control'

import type { ClientWorkPlanSummary } from './client-detail-model'

type FilingPlanYearGroup = {
  year: number | 'unknown'
  isCurrent: boolean
  // Tax years beyond the current one are next-season work — in practice these
  // are the projected (annual-rollover / auto-projection) deadlines, not yet
  // active filings. Year-based proxy for projected status (the precise signal
  // is `confirmed`, which this public-obligation view doesn't carry).
  isUpcoming: boolean
  obligations: readonly ObligationQueueRow[]
  openCount: number
  extendedCount: number
}

// Group obligations into tax-year buckets so the client page reads as a
// filing plan (matching reference CPA workbenches), not a flat queue. The
// current tax year (latest year present, or calendar year if no data) sits
// at the top with a "Current tax year" chip; prior years follow descending.
function groupObligationsByTaxYear(
  obligations: readonly ObligationQueueRow[],
  currentTaxYear: number,
): FilingPlanYearGroup[] {
  const buckets = new Map<number | 'unknown', ObligationQueueRow[]>()
  for (const obligation of obligations) {
    const key: number | 'unknown' = obligation.taxYear ?? 'unknown'
    const list = buckets.get(key)
    if (list) list.push(obligation)
    else buckets.set(key, [obligation])
  }
  const knownYears = [...buckets.keys()]
    .filter((k): k is number => typeof k === 'number')
    .toSorted((a, b) => b - a)
  const groups: FilingPlanYearGroup[] = knownYears.map((year) => {
    const list = buckets.get(year) ?? []
    return {
      year,
      isCurrent: year === currentTaxYear,
      isUpcoming: year > currentTaxYear,
      obligations: list,
      openCount: list.filter((o) => OPEN_FILING_PLAN_STATUSES.has(o.status)).length,
      extendedCount: list.filter((o) => o.status === 'extended').length,
    }
  })
  if (buckets.has('unknown')) {
    const list = buckets.get('unknown') ?? []
    groups.push({
      year: 'unknown',
      isCurrent: false,
      isUpcoming: false,
      obligations: list,
      openCount: list.filter((o) => OPEN_FILING_PLAN_STATUSES.has(o.status)).length,
      extendedCount: list.filter((o) => o.status === 'extended').length,
    })
  }
  return groups
}

// "Open" for filing-plan summary purposes: any non-terminal status. We
// don't try to be precise about prep stage here — that's drawer territory.
const OPEN_FILING_PLAN_STATUSES = new Set([
  'pending',
  'in_progress',
  'waiting_on_client',
  'review',
  'blocked',
  'done',
])

// Filing-plan column sort state. `null` field means "natural order" —
// each year section's obligations stay in whatever order the API
// returned. `internal` and `official` are the most common sort axes.
// `form` is a stable secondary key. `status` orders by the lifecycle
// enum.
type FilingPlanSortField = 'form' | 'internal' | 'official' | 'status' | 'estimate' | null
type FilingPlanSortDir = 'asc' | 'desc'
type FilingPlanSort = { field: FilingPlanSortField; dir: FilingPlanSortDir }

// Canonical status ordering — matches the V2 lifecycle. We sort by
// index so "Not started" sorts before "Filed" rather than alphabetic.
const STATUS_SORT_INDEX: Record<string, number> = {
  not_started: 0,
  in_progress: 1,
  waiting_on_client: 2,
  review: 3,
  blocked: 4,
  done: 5,
  filed: 6,
  paid: 7,
  completed: 8,
  extended: 9,
  not_applicable: 10,
}

function sortObligations(
  list: readonly ObligationQueueRow[],
  sort: FilingPlanSort,
): readonly ObligationQueueRow[] {
  if (sort.field === null) return list
  const sign = sort.dir === 'asc' ? 1 : -1
  const cmp = (a: ObligationQueueRow, b: ObligationQueueRow): number => {
    switch (sort.field) {
      case 'form':
        return a.taxType.localeCompare(b.taxType) * sign
      case 'internal': {
        const av = Date.parse(a.currentDueDate)
        const bv = Date.parse(b.currentDueDate)
        return ((av || 0) - (bv || 0)) * sign
      }
      case 'official': {
        const av = Date.parse(a.filingDueDate ?? a.currentDueDate)
        const bv = Date.parse(b.filingDueDate ?? b.currentDueDate)
        return ((av || 0) - (bv || 0)) * sign
      }
      case 'status': {
        const av = STATUS_SORT_INDEX[a.status] ?? 99
        const bv = STATUS_SORT_INDEX[b.status] ?? 99
        return (av - bv) * sign
      }
      case 'estimate': {
        const av = a.estimatedTaxDueCents ?? -1
        const bv = b.estimatedTaxDueCents ?? -1
        return (av - bv) * sign
      }
      default:
        return 0
    }
  }
  return list.toSorted(cmp)
}

export function ClientWorkPlanPanel({
  obligations,
  isLoading,
  summary: _summary,
  clientName: _clientName,
  onChangeStatus,
  isStatusChangePending: _isStatusChangePending,
  canChangeStatus,
  expandedFilingId,
  activeObligationId,
  onExpandFiling,
  onCollapseFiling,
  compact = false,
}: {
  obligations: readonly ObligationQueueRow[]
  isLoading: boolean
  summary: ClientWorkPlanSummary
  clientName: string
  onChangeStatus: (id: string, status: ObligationStatus) => void
  isStatusChangePending: boolean
  canChangeStatus: boolean
  expandedFilingId: string
  /** The obligation open in the side panel — its row gets the active accent. */
  activeObligationId: string | null
  onExpandFiling: (id: string) => void
  onCollapseFiling: () => void
  // When the obligation side panel is open the left column squeezes; render
  // the filing rows compact (drop OFFICIAL DUE + OWNER) so columns don't collide.
  compact?: boolean
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  // Current tax year = the calendar year just closed (the season being filed
  // now); tax years beyond it are upcoming/projected, not active filings.
  const currentTaxYear = new Date().getFullYear() - 1
  const yearGroups = useMemo(
    () => groupObligationsByTaxYear(obligations, currentTaxYear),
    [obligations, currentTaxYear],
  )

  // Sort state lives at the panel level so all year sections share the
  // same sort. There's no column-header sort affordance, so sort holds
  // at API order (smart priority); `field === null` keeps that order.
  const [sort] = useState<FilingPlanSort>({ field: null, dir: 'asc' })

  // Multi-select state — a Set of obligation ids selected across all
  // year sections. The floating bulk action bar appears when
  // `selectedIds.size > 0`. `selectAllInYear` / `clearSelection`
  // helpers keep year-level controls clean.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const setYearSelection = useCallback((ids: readonly string[], on: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (on) for (const id of ids) next.add(id)
      else for (const id of ids) next.delete(id)
      return next
    })
  }, [])
  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  // Bulk status mutation — same RPC the queue's bulk bar uses, same
  // invalidation set so changes propagate to the queue, dashboard,
  // and this client's filing plan rows.
  const v2StatusLabels = useLifecycleV2StatusLabels()
  const bulkStatusMutation = useMutation(
    orpc.obligations.bulkUpdateStatus.mutationOptions({
      onSuccess: (result, vars) => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        const skipped = result.skippedCount
        toast.success(
          vars.ids.length === 1
            ? t`Status changed to ${v2StatusLabels[vars.status]}`
            : t`${result.updatedCount} deadlines moved to ${v2StatusLabels[vars.status]}`,
          skipped > 0 ? { description: t`${skipped} skipped (already closed)` } : undefined,
        )
        clearSelection()
      },
      onError: (err) => {
        toast.error(t`Couldn't update status`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  // The bulk status change is staged behind a confirm with the actual
  // count + target status, rather than firing the mutation directly on
  // dropdown pick — otherwise a stray year-level checkbox + status
  // click could move dozens of deadlines with zero pre-action signal.
  // Reversible, but the confirm is cheap insurance against accidental
  // cascades.
  const [pendingBulkStatus, setPendingBulkStatus] = useState<{
    status: ObligationStatus
    ids: string[]
  } | null>(null)
  const bulkApplyStatus = useCallback(
    (status: ObligationStatus) => {
      if (selectedIds.size === 0) return
      setPendingBulkStatus({ status, ids: [...selectedIds] })
    },
    [selectedIds],
  )
  // The subtitle is the only header text the filing plan renders (the
  // tab names the surface, so no h2). It carries only the structural
  // fact — *how* the rows are
  // grouped, not how many — so the SummaryStrip "Open filing" tile
  // ~100px above stays the single source of truth for the count. Two
  // counts that close together with slightly-different denominators
  // (the tile counts non-terminal obligations; a count subtitle would
  // count ALL obligations including terminal years) would force the CPA
  // to compute the relationship instead of just reading. See
  // `docs/Design/ui-audit-2026-05-25.md` §3.2 D4.
  return (
    // No restated "Filing plan" h2 here: the tab bar already names this
    // surface "Filing plan" and each year card carries its year + open
    // count, so a section heading would just echo the active tab (the
    // redundant-header anti-pattern). Only the quiet grouping hint (sort
    // order) survives — `pl-3`/`gap-3` keep the workbench gutter + rhythm
    // that TabSection used to supply.
    <section
      className={cn(
        'flex flex-col gap-3',
        // Reserve clearance for the floating bulk bar while a selection
        // exists, so the last rows scroll clear of the fixed bar instead of
        // being occluded (this section scrolls inside the tab's overflow-y-auto).
        selectedIds.size > 0 && FLOATING_ACTION_BAR_SCROLL_PADDING,
      )}
    >
      {/* Each year section is wrapped in its own framed block using
          the canonical `rounded-lg border-divider-regular
          bg-background-default` shape. The column header bar lives
          INSIDE the frame, paired with the rows it legends, rather than
          a single column header above all years. Trade-off: the column
          legend repeats per year, but each section reads as a
          self-contained year card and scanning year-by-year is much
          easier when there are 3+ years of history. */}
      {isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : obligations.length === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title={<Trans>No deadlines yet</Trans>}
          description={
            <Trans>
              Add this client's filing state and entity type in Setup, and the rule library
              generates its deadlines automatically.
            </Trans>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {yearGroups.map((group) => (
              <FilingPlanYearSection
                key={group.year}
                group={group}
                sort={sort}
                activeObligationId={activeObligationId}
                selectedIds={selectedIds}
                onToggleRow={toggleRow}
                onSetYearSelection={setYearSelection}
                onChangeStatus={onChangeStatus}
                canChangeStatus={canChangeStatus}
                expandedFilingId={expandedFilingId}
                onExpandFiling={onExpandFiling}
                onCollapseFiling={onCollapseFiling}
                compact={compact}
              />
            ))}
          </div>
          {/* Floating bulk-status bar — appears when ≥1 row is selected
              across any year section. Same pattern the queue uses:
              count badge, status picker, clear button. Mounts at the
              bottom of the viewport via fixed positioning so it
              doesn't push the filing plan around when it appears. */}
          {selectedIds.size > 0 ? (
            <FilingPlanBulkBar
              count={selectedIds.size}
              statuses={LIFECYCLE_V2_STATUSES}
              statusLabels={v2StatusLabels}
              isPending={bulkStatusMutation.isPending}
              onApplyStatus={bulkApplyStatus}
              onClear={clearSelection}
            />
          ) : null}
        </>
      )}

      <AlertDialog
        open={pendingBulkStatus !== null}
        onOpenChange={(open) => {
          if (!open) setPendingBulkStatus(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingBulkStatus && pendingBulkStatus.ids.length === 1 ? (
                <Trans>Move this deadline to {v2StatusLabels[pendingBulkStatus.status]}?</Trans>
              ) : pendingBulkStatus ? (
                <Trans>
                  Move {pendingBulkStatus.ids.length} deadlines to{' '}
                  {v2StatusLabels[pendingBulkStatus.status]}?
                </Trans>
              ) : null}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>
                Each row will receive a status-change audit entry. You can move them back through
                the same control if this wasn't intended.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkStatusMutation.isPending || !pendingBulkStatus}
              onClick={() => {
                if (pendingBulkStatus) {
                  bulkStatusMutation.mutate(
                    { ids: pendingBulkStatus.ids, status: pendingBulkStatus.status },
                    {
                      onSettled: () => setPendingBulkStatus(null),
                    },
                  )
                }
              }}
            >
              {bulkStatusMutation.isPending ? (
                <Trans>Moving…</Trans>
              ) : pendingBulkStatus && pendingBulkStatus.ids.length === 1 ? (
                <Trans>Move deadline</Trans>
              ) : (
                <Trans>Move deadlines</Trans>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

/**
 * Floating bulk-action bar shown when ≥1 filing-plan row is selected.
 *
 * Modelled after the obligations queue's bulk bar — fixed-position at
 * the bottom centre of the viewport, count badge on the left, status
 * picker in the middle, clear button on the right. Renders nothing
 * when count === 0 (caller gates).
 */
function FilingPlanBulkBar({
  count,
  statuses,
  statusLabels,
  isPending,
  onApplyStatus,
  onClear,
}: {
  count: number
  statuses: readonly ObligationStatus[]
  statusLabels: Record<ObligationStatus, string>
  isPending: boolean
  onApplyStatus: (status: ObligationStatus) => void
  onClear: () => void
}) {
  const { t } = useLingui()
  // The shared FloatingActionBar primitive so the Filing-plan bulk
  // surface matches the canonical shadow/blur/z-index recipe used by
  // the obligations queue and rules library bulk bars.
  return (
    <FloatingActionBar ariaLabel={t`Bulk actions`}>
      <span className="text-xs font-medium tabular-nums text-text-primary">
        <Plural value={count} one="# selected" other="# selected" />
      </span>
      <span className="h-4 w-px bg-divider-regular" aria-hidden />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" disabled={isPending}>
              <Trans>Move to status</Trans>
              <ChevronDownIcon className="size-3.5" aria-hidden />
            </Button>
          }
        />
        <DropdownMenuContent align="center" className="min-w-[200px]">
          {statuses.map((status) => (
            <DropdownMenuItem key={status} onClick={() => onApplyStatus(status)}>
              {statusLabels[status]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="h-4 w-px bg-divider-regular" aria-hidden />
      <Button variant="ghost" size="sm" onClick={onClear}>
        <Trans>Clear</Trans>
      </Button>
    </FloatingActionBar>
  )
}

// Per-tax-year section in the Filing plan panel. Rendered once per year
// bucket; current tax year sits at the top with a CURRENT TAX YEAR chip.
//
// Hierarchy:
//  - Year number reads as a clear section heading (text-base, tabular)
//  - Chip + counts cluster CLOSE to the year, not pushed to the far
//    edge with `ml-auto`. Wide-screen content shouldn't be split at the
//    two ends of a row — that orphans the heading.
function FilingPlanYearSection({
  group,
  sort,
  activeObligationId,
  selectedIds,
  onToggleRow,
  onSetYearSelection,
  onChangeStatus,
  canChangeStatus,
  expandedFilingId,
  onExpandFiling,
  onCollapseFiling,
  compact,
}: {
  group: FilingPlanYearGroup
  sort: FilingPlanSort
  activeObligationId: string | null
  selectedIds: Set<string>
  onToggleRow: (id: string) => void
  onSetYearSelection: (ids: readonly string[], on: boolean) => void
  onChangeStatus: (id: string, status: ObligationStatus) => void
  canChangeStatus: boolean
  expandedFilingId: string
  onExpandFiling: (id: string) => void
  onCollapseFiling: () => void
  compact: boolean
}) {
  const { t } = useLingui()
  // Apply panel-level sort to this year's obligations. When sort is
  // null (default), order matches whatever the API returned.
  const sortedObligations = useMemo(
    () => sortObligations(group.obligations, sort),
    [group.obligations, sort],
  )
  // Year-level selection state — derives directly from the panel's
  // Set so check / partial / unchecked stays in sync. `partial` means
  // some but not all rows in this year are selected.
  const yearIds = useMemo(() => group.obligations.map((o) => o.id), [group.obligations])
  const yearSelectedCount = useMemo(
    () => yearIds.filter((id) => selectedIds.has(id)).length,
    [yearIds, selectedIds],
  )
  const yearAllSelected = yearSelectedCount === yearIds.length && yearIds.length > 0
  const yearSomeSelected = yearSelectedCount > 0 && !yearAllSelected
  const toggleYear = useCallback(() => {
    onSetYearSelection(yearIds, !yearAllSelected)
  }, [onSetYearSelection, yearIds, yearAllSelected])
  // Frame uses the canonical `bg-background-default rounded-lg
  // border-divider-regular` so the Work tab's year panels read
  // identically to the section frames in Client info, Discover, and
  // Activity. Inset-surface canonical (rounded-lg + bg-default) is the
  // system-level rule.
  //   - Year header row: year + `· current year` italic marker +
  //     the "N open filing" badge.
  //   - Column header bar: bg-gray-soft inside the frame so it reads
  //     as the section's legend.
  //   - Row cells: 12px text + rule pill.
  const isUnknown = group.year === 'unknown'
  return (
    <div className="overflow-hidden rounded-lg border border-divider-regular bg-background-default">
      {/* Year header bar. text-base font-semibold + soft section tint
          (bg-background-subtle) + border-b set it apart from the rows
          below so it reads as a real section header / group banner
          rather than the first row of the table. Matches the
          section-heading scale used by the TabSection primitive
          (page-family-canonical §9). */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-divider-subtle bg-background-subtle px-5 py-3">
        <Checkbox
          checked={yearAllSelected}
          indeterminate={yearSomeSelected}
          onCheckedChange={toggleYear}
          aria-label={t`Select all deadlines in this year`}
          className="size-4"
        />
        <span className="text-base font-semibold leading-6 tabular-nums text-text-primary">
          {isUnknown ? <Trans>No tax year</Trans> : group.year}
        </span>
        {group.isCurrent ? (
          // Italic year-marker tag matching Pencil V1kJX ("· Current tax
          // year"): sentence-leading capital + italic so it reads as an
          // annotation on the year heading, not a second label.
          <span className="text-xs italic leading-4 text-text-tertiary">
            <Trans>· Current tax year</Trans>
          </span>
        ) : group.isUpcoming ? (
          <span className="text-xs italic leading-4 text-text-tertiary">
            <Trans>· Projected</Trans>
          </span>
        ) : null}
        {group.openCount > 0 ? (
          // Badge size='sm' shape='square' — info variant for the
          // current year, outline for prior years. Soft-corner square
          // shape distinguishes it from the fully-rounded row status
          // pills below.
          <Badge variant={group.isCurrent ? 'info' : 'outline'} size="sm" shape="square">
            {group.isUpcoming ? (
              <Plural
                value={group.openCount}
                one="# projected filing"
                other="# projected filings"
              />
            ) : (
              <Plural value={group.openCount} one="# open filing" other="# open filings" />
            )}
          </Badge>
        ) : null}
        {group.extendedCount > 0 ? (
          // "{n} extended" marker as a Badge outline sm pill so it
          // doesn't drift from the open-count chip next to it.
          <Badge variant="outline" size="sm" shape="square">
            <Trans>{group.extendedCount} extended</Trans>
          </Badge>
        ) : null}
        {/* Sort hint lives RIGHTMOST in the year header bar (Yuqi "Latest first
            can be put in the header, right most"), not as a standalone line. */}
        <span className="ml-auto text-xs text-text-tertiary">
          <Trans>Latest first</Trans>
        </span>
      </div>
      {/* Each filing renders as a <DeadlineRow mode="inline-expand">
          (per deadline-row-interaction.md). Body click expands inline;
          the title navigates to the full deadline. The inline status
          picker / kebab / dual-date columns are redistributed into the
          row expansion. Panel sort orders rows; multi-select drives the
          bulk bar. */}
      {/* Column header (Pencil VtC73) — grid must match DeadlineRow's
          inline-expand layout exactly so the columns line up. */}
      <div
        className={cn(
          'grid items-center gap-3 border-b border-divider-subtle bg-background-section px-5 py-2.5 text-caption-xs font-bold tracking-eyebrow-tight text-text-muted uppercase',
          compact
            ? 'grid-cols-[minmax(0,1fr)_auto_auto_24px]'
            : 'grid-cols-[minmax(0,1fr)_148px_124px_104px_132px_24px]',
        )}
      >
        <span>
          <Trans>Deadline</Trans>
        </span>
        <span>
          <Trans>Status</Trans>
        </span>
        <span>
          <Trans>Internal due</Trans>
        </span>
        {compact ? null : (
          <span>
            <Trans>Official due</Trans>
          </span>
        )}
        {compact ? null : (
          <span>
            <Trans>Owner</Trans>
          </span>
        )}
        <span aria-hidden />
      </div>
      <div className="flex flex-col">
        {sortedObligations.map((obligation) => (
          <DeadlineRow
            key={obligation.id}
            deadline={obligation}
            mode="inline-expand"
            compact={compact}
            isActive={activeObligationId === obligation.id}
            isExpanded={expandedFilingId === obligation.id}
            isSelected={selectedIds.has(obligation.id)}
            multiSelectMode={selectedIds.size > 0}
            canEdit={canChangeStatus}
            onExpand={onExpandFiling}
            onCollapse={onCollapseFiling}
            onSelect={(id) => onToggleRow(id)}
            onMarkFiled={(id) => onChangeStatus(id, 'done')}
          />
        ))}
      </div>
    </div>
  )
}
