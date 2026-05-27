import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardListIcon,
  ExternalLinkIcon,
  EyeIcon,
  LinkIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type { ObligationInstancePublic } from '@duedatehq/contracts'
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
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { EmptyState } from '@/components/patterns/empty-state'
import { RowActionsMenu } from '@/components/patterns/row-actions-menu'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { formatDate } from '@/lib/utils'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatTaxCode } from '@/lib/tax-codes'
import { useObligationDrawer } from '@/features/obligations/ObligationDrawerProvider'
import { paymentOverdueDays } from '@/features/obligations/payment-overdue'
import {
  LIFECYCLE_V2_STATUSES,
  ObligationQueueStatusControl,
  useLifecycleV2StatusLabels,
  type ObligationStatus,
} from '@/features/obligations/status-control'

import { TabSection } from './ClientFactsWorkspace'
import type { ClientWorkPlanSummary } from './client-detail-model'

type FilingPlanYearGroup = {
  year: number | 'unknown'
  isCurrent: boolean
  obligations: readonly ObligationInstancePublic[]
  openCount: number
  extendedCount: number
}

// Group obligations into tax-year buckets so the client page reads as a
// filing plan (matching reference CPA workbenches), not a flat queue. The
// current tax year (latest year present, or calendar year if no data) sits
// at the top with a "Current tax year" chip; prior years follow descending.
function groupObligationsByTaxYear(
  obligations: readonly ObligationInstancePublic[],
): FilingPlanYearGroup[] {
  const buckets = new Map<number | 'unknown', ObligationInstancePublic[]>()
  for (const obligation of obligations) {
    const key: number | 'unknown' = obligation.taxYear ?? 'unknown'
    const list = buckets.get(key)
    if (list) list.push(obligation)
    else buckets.set(key, [obligation])
  }
  const knownYears = [...buckets.keys()]
    .filter((k): k is number => typeof k === 'number')
    .toSorted((a, b) => b - a)
  const currentYear = knownYears[0] ?? null
  const groups: FilingPlanYearGroup[] = knownYears.map((year) => {
    const list = buckets.get(year) ?? []
    return {
      year,
      isCurrent: year === currentYear,
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

// 2026-05-24 (shape — critique P2): filing-plan column sort state.
// `null` field means "natural order" — each year section's obligations
// stay in whatever order the API returned. `internal` and `official`
// are the most common sort axes (per CPA Sarah's testing). `form` is a
// stable secondary key. `status` orders by the lifecycle enum.
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

// Inline sort-header button. Renders the label + a sort indicator
// chevron when active. Click cycles asc → desc → null (handled by
// the panel's `cycleSort`). When inactive, label is uppercase
// tertiary; when active, label promotes to primary text with the
// chevron next to it. Keeps the rest of the header row visually
// quiet so it doesn't compete with the rows below.
function FilingPlanSortHeader({
  className,
  active,
  dir,
  alignRight,
  title,
  onClick,
  children,
}: {
  className?: string
  active: boolean
  dir: FilingPlanSortDir
  alignRight?: boolean
  title?: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    // 2026-05-26 (Yuqi /clients/[id] feedback #9 — "确认 header
    // 样式"): brought into line with the canonical workbench-table
    // header (TableHead primitive: `text-sm font-medium normal-case
    // text-text-secondary`). Was `text-xs font-medium uppercase
    // text-text-tertiary` — uppercase eyebrow style read as a meta
    // label, not a column header. Now matches /deadlines + /clients
    // + /rules/library table headers across the family.
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium leading-5 outline-none focus-visible:text-text-primary',
        alignRight ? 'justify-end' : 'text-left',
        active ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
        className,
      )}
    >
      <span>{children}</span>
      {active ? (
        dir === 'asc' ? (
          <ChevronUpIcon className="size-3" aria-hidden />
        ) : (
          <ChevronDownIcon className="size-3" aria-hidden />
        )
      ) : null}
    </button>
  )
}

function sortObligations(
  list: readonly ObligationInstancePublic[],
  sort: FilingPlanSort,
): readonly ObligationInstancePublic[] {
  if (sort.field === null) return list
  const sign = sort.dir === 'asc' ? 1 : -1
  const cmp = (a: ObligationInstancePublic, b: ObligationInstancePublic): number => {
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
  clientName,
  onChangeStatus,
  isStatusChangePending,
  canChangeStatus,
}: {
  obligations: readonly ObligationInstancePublic[]
  isLoading: boolean
  summary: ClientWorkPlanSummary
  clientName: string
  onChangeStatus: (id: string, status: ObligationStatus) => void
  isStatusChangePending: boolean
  canChangeStatus: boolean
}) {
  const { openDrawer: openObligationDrawer } = useObligationDrawer()
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const yearGroups = useMemo(() => groupObligationsByTaxYear(obligations), [obligations])

  // 2026-05-24 (shape — critique P2 power-user pass): sort state
  // lives at the panel level so all year sections share the same
  // sort. Click a header → toggle (asc → desc → null). Default
  // (`field === null`) keeps the API order.
  const [sort, setSort] = useState<FilingPlanSort>({ field: null, dir: 'asc' })
  const cycleSort = useCallback((field: Exclude<FilingPlanSortField, null>) => {
    setSort((prev) => {
      if (prev.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc') return { field, dir: 'desc' }
      return { field: null, dir: 'asc' }
    })
  }, [])

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
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  // 2026-05-24 (re-critique): the filing-plan bulk bar used to fire
  // the status mutation directly on dropdown pick — so a stray year-
  // level checkbox + status click could move dozens of deadlines with
  // zero pre-action signal. Stage the change behind a confirm with
  // the actual count + target status. Reversible, but the click is
  // cheap insurance against accidental cascades.
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
  // 2026-05-24: the Filing plan heading went through TabSection so it
  // sits on the same h2 / subtitle baseline as every other section
  // header on this client detail page.
  //
  // 2026-05-26 (audit D4 fix): the subtitle USED to read "N deadlines
  // across N tax years" — but the SummaryStrip "Open filing" tile
  // 100 px above already owns the count signal (made canonical in the
  // 2026-05-24 distill pass that dropped "N open filings" from the
  // workPlan summary — see `renderClientHeaderSubLine` rationale).
  // Two counts 100 px apart with slightly-different denominators
  // (the tile counts non-terminal obligations; the old subtitle
  // counted ALL obligations including terminal years) forced the
  // CPA to compute the relationship instead of just reading.
  // Subtitle now carries only the structural fact — *how* the rows
  // are grouped, not how many — so the tile stays the single source
  // of truth. See `docs/Design/ui-audit-2026-05-25.md` §3.2 D4.
  const subtitle =
    yearGroups.length <= 1 ? (
      <Trans>Latest first</Trans>
    ) : (
      <Trans>Grouped by tax year, newest first</Trans>
    )
  return (
    <TabSection title={t`Filing plan`} summary={subtitle}>
      {/* 2026-05-26 (Yuqi tab-body follow-ups, Task 3): each year
          section is wrapped in its own framed block using the
          canonical `rounded-md border-divider-regular
          bg-background-default` shape. The column header bar lives
          INSIDE the frame, paired with the rows it legends. This
          replaces the earlier single-column-header-above-all-years
          shape. Trade-off: column legend repeats per year, but each
          section now reads as a self-contained year card and
          scanning year-by-year is much easier when there are 3+
          years of history. (Prior 2026-05-24 Figma-replica pass
          used `bg-background-soft rounded-xl border-subtle`; that
          was the only divergent frame on the page and got snapped
          to canonical 2026-05-26 — see the comment on the year
          section wrapper at FilingPlanYearSection.) */}
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
            <Trans>Run migration or generate rules before this client has due-date work.</Trans>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {yearGroups.map((group) => (
              <FilingPlanYearSection
                key={group.year}
                group={group}
                clientName={clientName}
                sort={sort}
                onCycleSort={cycleSort}
                selectedIds={selectedIds}
                onToggleRow={toggleRow}
                onSetYearSelection={setYearSelection}
                onOpen={(obligationId) => openObligationDrawer(obligationId)}
                onChangeStatus={onChangeStatus}
                isStatusChangePending={isStatusChangePending}
                canChangeStatus={canChangeStatus}
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
    </TabSection>
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
  return (
    <div
      role="region"
      aria-label={t`Bulk actions`}
      className="pointer-events-none fixed inset-x-0 bottom-10 z-30 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-divider-regular bg-background-default px-3 py-1.5 shadow-lg">
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
      </div>
    </div>
  )
}

// Per-tax-year section in the Filing plan panel. Rendered once per year
// bucket; current tax year sits at the top with a CURRENT TAX YEAR chip.
//
// 2026-05-22 hierarchy pass:
//  - Year number reads as a clear section heading (text-base, tabular)
//  - Chip + counts cluster CLOSE to the year, not pushed to the far
//    edge with `ml-auto`. Wide-screen content shouldn't be split at the
//    two ends of a row — that orphans the heading.
function FilingPlanYearSection({
  group,
  clientName,
  sort,
  onCycleSort,
  selectedIds,
  onToggleRow,
  onSetYearSelection,
  onOpen,
  onChangeStatus,
  isStatusChangePending,
  canChangeStatus,
}: {
  group: FilingPlanYearGroup
  clientName: string
  sort: FilingPlanSort
  onCycleSort: (field: Exclude<FilingPlanSortField, null>) => void
  selectedIds: Set<string>
  onToggleRow: (id: string) => void
  onSetYearSelection: (ids: readonly string[], on: boolean) => void
  onOpen: (obligationId: string) => void
  onChangeStatus: (id: string, status: ObligationStatus) => void
  isStatusChangePending: boolean
  canChangeStatus: boolean
}) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const statusPickerLabels = useLifecycleV2StatusLabels()
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
  // 2026-05-24 (Figma replica pass): year section originally snapped
  // to the pixel-exact frame from the Figma Make export
  // (`bg-background-soft` + `rounded-xl` + inset hairline).
  // 2026-05-26 (Yuqi post-revamp critique P1 / §3.5 — tab section-
  // frame unification): frame swapped to the canonical
  // `bg-background-default rounded-md border-divider-regular` so
  // the Work tab's year panels read identically to the section
  // frames in Client info, Discover, and Activity. The previous
  // `rounded-xl bg-background-soft border-subtle` was the only
  // divergent frame on the page — left over from the pre-canonical
  // pixel-replica pass. Inset-surface canonical (rounded-md +
  // bg-default) is the system-level rule; per-page Figma replicas
  // should respect it.
  //   - Year header row: year + `· current year` italic marker +
  //     the "N open filing" badge. Same row paddings (`px-3 py-3`)
  //     as the original.
  //   - Column header bar: still bg-gray-soft inside the frame so
  //     it reads as the section's legend.
  //   - Row cells: 12px text + rule pill unchanged.
  const isUnknown = group.year === 'unknown'
  return (
    <div className="overflow-hidden rounded-md border border-divider-regular bg-background-default">
      {/* Year header bar.
          2026-05-26 (Yuqi feedback #9 + #10 — "感觉很难发现 / 没有看出
          来这是 header"): bumped the year-section header from
          text-sm to text-base font-semibold + soft section tint
          (bg-background-subtle) + border-b to set it apart from the
          rows below. Reads now as a real section header / group
          banner rather than as the first row of the table. Matches
          the section-heading scale used by the TabSection primitive
          (page-family-canonical §9). */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-divider-subtle bg-background-subtle px-3 py-2.5">
        <span className="text-base font-semibold leading-6 tabular-nums text-text-primary">
          {isUnknown ? <Trans>No tax year</Trans> : group.year}
        </span>
        {group.isCurrent ? (
          <span className="text-xs leading-4 text-text-tertiary">
            <Trans>· current year</Trans>
          </span>
        ) : null}
        {group.openCount > 0 ? (
          // 2026-05-24 (design-system audit): the current-year pill used
          // a raw `bg-[var(--color-util-colors-blue-100,#dbeafe)]` arbitrary
          // value with a hex fallback — bypassing the design tokens. The
          // `components-badge-bg-blue-soft` + `text-text-accent` pair is
          // the same color treatment the Badge `info` variant uses;
          // routing through it means a theme-level blue change updates
          // here too. Square-corner shape preserved (Badge defaults to
          // fully rounded, this stays a soft-corner tag for visual
          // distinction from the filing-plan row pills above).
          <span
            className={cn(
              'inline-flex items-center rounded px-2 py-0.5 text-xs leading-4',
              group.isCurrent
                ? 'bg-components-badge-bg-blue-soft text-text-accent'
                : 'bg-background-default text-text-tertiary',
            )}
          >
            <Plural value={group.openCount} one="# open filing" other="# open filings" />
          </span>
        ) : null}
        {group.extendedCount > 0 ? (
          <span className="text-xs leading-4 text-text-tertiary">
            <Trans>{group.extendedCount} extended</Trans>
          </span>
        ) : null}
      </div>
      {/* Real <table> for the filing plan body (audit L3). Earlier shape
          was nested <div>s — screen readers got no row/column semantics,
          arrow-key cell navigation was lost. Now: <thead>/<tbody>/<tr>/<td>
          with table-fixed widths preserve the visual rhythm while restoring
          row-N-of-M announcement + native keyboard table navigation. The
          per-row cursor-pointer + onClick stay on <tr>, and the nested
          buttons (form code, status pill, checkbox, row-actions) still
          stopPropagation so they don't double-fire the row open.
          The outer wrapper provides horizontal scroll on narrow viewports
          (mobile/tablet) where the fixed-width columns would otherwise
          collide with the Form cell. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] table-fixed">
          <thead className="bg-background-subtle text-sm font-medium leading-5 text-text-secondary">
            <tr className="border-y border-divider-subtle">
              <th scope="col" className="w-9 px-3 py-2 text-left align-middle">
                <Checkbox
                  checked={yearAllSelected}
                  indeterminate={yearSomeSelected}
                  onCheckedChange={toggleYear}
                  aria-label={t`Select all deadlines in this year`}
                  className="size-4"
                />
              </th>
              <th scope="col" className="px-1 py-2 text-left align-middle font-medium">
                <FilingPlanSortHeader
                  active={sort.field === 'form'}
                  dir={sort.dir}
                  onClick={() => onCycleSort('form')}
                >
                  <Trans>Form</Trans>
                </FilingPlanSortHeader>
              </th>
              <th scope="col" className="w-[120px] px-1 py-2 text-left align-middle font-medium">
                <FilingPlanSortHeader
                  active={sort.field === 'internal'}
                  dir={sort.dir}
                  title={t`The firm-side soft target — when this filing should be ready internally for the deadline window`}
                  onClick={() => onCycleSort('internal')}
                >
                  <Trans>Internal deadline</Trans>
                </FilingPlanSortHeader>
              </th>
              <th scope="col" className="w-[120px] px-1 py-2 text-left align-middle font-medium">
                <FilingPlanSortHeader
                  active={sort.field === 'official'}
                  dir={sort.dir}
                  title={t`The IRS / state statutory due date — the hard deadline the filing must be submitted by`}
                  onClick={() => onCycleSort('official')}
                >
                  <Trans>Official deadline</Trans>
                </FilingPlanSortHeader>
              </th>
              <th scope="col" className="w-[120px] px-1 py-2 text-left align-middle font-medium">
                <FilingPlanSortHeader
                  active={sort.field === 'status'}
                  dir={sort.dir}
                  title={t`The deadline's lifecycle state. Click any row's pill to change its status — the same control as on /deadlines and inside the obligation drawer.`}
                  onClick={() => onCycleSort('status')}
                >
                  <Trans>Status</Trans>
                </FilingPlanSortHeader>
              </th>
              <th scope="col" className="w-9 px-1 py-2" aria-hidden />
            </tr>
          </thead>
          <tbody className="bg-background-default">
            {sortedObligations.map((obligation, rowIndex) => {
              const isLast = rowIndex === sortedObligations.length - 1
              const isSelected = selectedIds.has(obligation.id)
              return (
                <tr
                  key={obligation.id}
                  className={cn(
                    'group/row cursor-pointer transition-colors hover:bg-state-base-hover',
                    isSelected && 'bg-state-accent-hover-alt',
                    !isLast && 'border-b border-divider-subtle',
                  )}
                  onClick={() => onOpen(obligation.id)}
                >
                  <td
                    className="w-9 px-3 py-2 align-middle"
                    onClick={(event) => event.stopPropagation()}
                    // Escape MUST bubble to the parent Dialog/Sheet close
                    // handler. Other keys stay scoped so checkbox toggle
                    // doesn't accidentally fire row open.
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') return
                      event.stopPropagation()
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleRow(obligation.id)}
                      aria-label={t`Select ${formatTaxCode(obligation.taxType)}`}
                      className="size-4"
                    />
                  </td>
                  <td className="min-h-14 px-1 py-2 align-middle">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpen(obligation.id)
                      }}
                      aria-label={t`Open ${formatTaxCode(obligation.taxType)} due ${formatDate(obligation.currentDueDate)}`}
                      className="block w-full min-w-0 truncate rounded-sm text-left text-sm font-medium leading-5 text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                    >
                      <TaxCodeLabel code={obligation.taxType} tooltip={false} />
                    </button>
                  </td>
                  <td className="w-[120px] px-1 py-2 align-middle">
                    <span className="flex items-baseline gap-1.5 text-[14px] leading-5 tabular-nums text-text-primary">
                      {formatDate(obligation.currentDueDate)}
                      {obligation.extensionState === 'filed' ||
                      obligation.extensionState === 'accepted' ? (
                        <span
                          title={t`This row's deadline has been extended. The Official Deadline column shows the original statutory date; the Internal Deadline reflects the new post-extension target.`}
                          className="rounded-sm bg-components-badge-bg-blue-soft px-1 py-0 text-caption-xs font-medium leading-4 text-text-accent"
                        >
                          ext.
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="w-[120px] px-1 py-2 align-middle text-[14px] leading-5 tabular-nums text-text-primary">
                    {formatDate(obligation.filingDueDate ?? obligation.currentDueDate)}
                  </td>
                  <td className="w-[120px] px-1 py-2 align-middle">
                    <span className="flex flex-wrap items-center gap-1">
                      <ObligationQueueStatusControl
                        row={{ id: obligation.id, status: obligation.status, clientName }}
                        labels={statusPickerLabels}
                        statuses={LIFECYCLE_V2_STATUSES}
                        disabled={isStatusChangePending}
                        onChange={onChangeStatus}
                        readOnly={!canChangeStatus}
                      />
                      {(() => {
                        const overdueDays = paymentOverdueDays(obligation, Date.now())
                        if (overdueDays === null) return null
                        return (
                          <span
                            title={t`The filing was submitted, but the authority payment due ${formatDate(obligation.paymentDueDate ?? '')} hasn't been confirmed yet. Penalty interest accrues until the wire lands.`}
                            className="rounded-sm bg-state-destructive-hover px-1 py-0 text-caption-xs font-medium leading-4 text-text-destructive"
                          >
                            <Trans>Payment {overdueDays}d late</Trans>
                          </span>
                        )
                      })()}
                    </span>
                  </td>
                  <td className="w-9 px-1 py-2 align-middle">
                    <RowActionsMenu
                      label={t`Actions for ${formatTaxCode(obligation.taxType)}`}
                      items={[
                        {
                          label: t`Open obligation`,
                          icon: EyeIcon,
                          onSelect: () => onOpen(obligation.id),
                        },
                        {
                          label: t`View in Deadlines`,
                          icon: ExternalLinkIcon,
                          onSelect: () => {
                            void navigate(`/deadlines?obligation=${obligation.id}`)
                          },
                        },
                        {
                          label: t`Copy obligation ID`,
                          icon: LinkIcon,
                          onSelect: () => {
                            if (typeof window === 'undefined') return
                            try {
                              void window.navigator.clipboard?.writeText(obligation.id)
                            } catch {
                              // Clipboard can throw in sandboxed iframes.
                            }
                          },
                        },
                      ]}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
