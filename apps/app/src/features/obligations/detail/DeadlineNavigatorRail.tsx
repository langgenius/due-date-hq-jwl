import { Trans, useLingui } from '@lingui/react/macro'
import { CheckIcon, ChevronDownIcon, ListFilterIcon, SearchIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { ObligationQueueDetailTab, ObligationQueueRow } from '@duedatehq/contracts'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { cn } from '@duedatehq/ui/lib/utils'

import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { deadlineDetailHref } from '@/features/obligations/deadline-detail-url'
import {
  STATUS_ICON,
  STATUS_ICON_COLOR,
  useStatusLabels,
  type ObligationStatus,
} from '@/features/obligations/status-control'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

// ISO `YYYY-MM-DD` → "Apr 15". Parsed by parts (not `new Date`) so the
// rendered month/day is the authority's calendar date, never shifted by
// the viewer's timezone.
function formatRailDate(iso: string): string {
  const [, month, day] = iso.split('-')
  const monthIndex = Number(month) - 1
  const label = MONTHS[monthIndex]
  if (!label || !day) return iso
  return `${label} ${Number(day)}`
}

// Terminal statuses don't carry an active countdown — lateness is a
// quality stat there, not a call to action (mirrors DueDaysPill).
const RELATIVE_SUPPRESSED_STATUSES = new Set<ObligationStatus>(['completed', 'not_applicable'])

// Canonical urgency order for the status filter menu (action-needed first),
// mirroring the queue's "Sort by Status" ordering.
const STATUS_FILTER_ORDER: readonly ObligationStatus[] = [
  'pending',
  'blocked',
  'waiting_on_client',
  'in_progress',
  'review',
  'extended',
  'done',
  'paid',
  'completed',
  'not_applicable',
]

function relativeDueLabel(row: ObligationQueueRow): {
  text: string
  tone: 'late' | 'soon' | 'calm'
} {
  const days = row.daysUntilDue
  if (days < 0) return { text: `${Math.abs(days)}d late`, tone: 'late' }
  if (days === 0) return { text: 'Today', tone: 'soon' }
  return { text: `in ${days}d`, tone: days <= 7 ? 'soon' : 'calm' }
}

/**
 * The 380px navigator rail on the deadline detail page (Pencil rzzww).
 * Renders the same row set the table is showing (passed in by the route
 * so both share one `obligations.list` query — rail order === table
 * order). Each row deep-links to `/deadlines/:ref` and carries the
 * active highlight (left accent border + tinted fill) when selected.
 */
export function DeadlineNavigatorRail({
  rows,
  activeObligationId,
  activeTab,
  totalCount,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  rows: readonly ObligationQueueRow[]
  activeObligationId: string | null
  activeTab: ObligationQueueDetailTab
  totalCount: number | null
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
}) {
  const { t } = useLingui()
  const statusLabels = useStatusLabels()
  const [search, setSearch] = useState('')
  // Optional client-side status filter over the loaded rail rows. `all` shows
  // everything; otherwise only rows in the chosen status. Composes with search.
  const [statusFilter, setStatusFilter] = useState<ObligationStatus | 'all'>('all')

  // Statuses present in the loaded set, with counts, in canonical urgency order
  // — the menu only offers statuses that actually exist in the rail.
  const statusOptions = useMemo(() => {
    const counts = new Map<ObligationStatus, number>()
    for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1)
    return STATUS_FILTER_ORDER.filter((status) => counts.has(status)).map((status) => ({
      status,
      count: counts.get(status) ?? 0,
    }))
  }, [rows])

  // If the active status filter no longer exists in the loaded set (e.g. the
  // list changed), fall back to showing all so the rail never reads empty.
  const effectiveStatusFilter =
    statusFilter !== 'all' && !statusOptions.some((option) => option.status === statusFilter)
      ? 'all'
      : statusFilter

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (effectiveStatusFilter !== 'all' && row.status !== effectiveStatusFilter) return false
      if (!needle) return true
      const haystack = [row.clientName, row.formName ?? '', row.taxType, statusLabels[row.status]]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [rows, search, effectiveStatusFilter, statusLabels])

  return (
    // 2026-06-10 (Yuqi responsive contract): rail is the xl/lg companion
    // column; below lg the master-detail collapses to detail-only (rail hidden,
    // so the detail gets full width — the crumb's "Deadlines" link returns to
    // the table). Width 340 (lg) → 380 (xl).
    <aside className="hidden h-full w-[340px] shrink-0 flex-col border-r border-divider-subtle bg-background-default lg:flex xl:w-[380px]">
      {/* ListHead — title + count chip (rzzww `mCfAZ`). */}
      <div className="flex items-center justify-between gap-2 border-b border-divider-subtle px-[18px] py-3.5">
        <span className="text-[16px] font-semibold text-text-primary">
          <Trans>Deadlines</Trans>
        </span>
        {totalCount !== null ? (
          <span className="rounded-full bg-background-subtle px-2 py-0.5 text-caption-xs font-medium tabular-nums text-text-tertiary">
            {t`${totalCount} active`}
          </span>
        ) : null}
      </div>

      {/* FilterRow — client-side search + optional status filter over the
          loaded rows (rzzww `kEi6B`). */}
      <div className="flex items-center gap-1.5 border-b border-divider-subtle px-4 py-2.5">
        <SearchIcon className="size-3.5 shrink-0 text-text-muted" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t`Search deadlines`}
          aria-label={t`Search deadlines`}
          className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
        />
        {/* Optional status filter. Trigger surfaces the active status label so
            it's clear the rail is filtered; "All statuses" clears it. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label={t`Filter by status`}
                className={cn(
                  'inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-caption-xs font-medium outline-none transition-colors hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                  effectiveStatusFilter === 'all'
                    ? 'text-text-tertiary hover:text-text-secondary'
                    : 'text-text-accent',
                )}
              >
                <ListFilterIcon className="size-3.5 shrink-0" aria-hidden />
                {effectiveStatusFilter !== 'all' ? (
                  <span className="max-w-[110px] truncate">
                    {statusLabels[effectiveStatusFilter]}
                  </span>
                ) : null}
                <ChevronDownIcon className="size-3 shrink-0" aria-hidden />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>
              <span className="flex-1">
                <Trans>All statuses</Trans>
              </span>
              <span className="tabular-nums text-text-tertiary">{rows.length}</span>
              {effectiveStatusFilter === 'all' ? (
                <CheckIcon className="size-3.5 text-text-accent" aria-hidden />
              ) : null}
            </DropdownMenuItem>
            {statusOptions.map(({ status, count }) => (
              <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
                <span className="flex-1 truncate">{statusLabels[status]}</span>
                <span className="tabular-nums text-text-tertiary">{count}</span>
                {effectiveStatusFilter === status ? (
                  <CheckIcon className="size-3.5 text-text-accent" aria-hidden />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ListBody */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredRows.length === 0 ? (
          <p className="px-[18px] py-6 text-sm text-text-tertiary">
            <Trans>No deadlines match.</Trans>
          </p>
        ) : (
          filteredRows.map((row) => (
            <DeadlineNavigatorRow
              key={row.id}
              row={row}
              active={row.id === activeObligationId}
              activeTab={activeTab}
              statusLabel={statusLabels[row.status]}
            />
          ))
        )}
        {hasMore ? (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="w-full cursor-pointer px-[18px] py-3 text-left text-xs font-medium text-text-accent hover:bg-state-base-hover disabled:opacity-50"
          >
            {isLoadingMore ? <Trans>Loading…</Trans> : <Trans>Load more deadlines</Trans>}
          </button>
        ) : null}
      </div>
    </aside>
  )
}

function DeadlineNavigatorRow({
  row,
  active,
  activeTab,
  statusLabel,
}: {
  row: ObligationQueueRow
  active: boolean
  activeTab: ObligationQueueDetailTab
  statusLabel: string
}) {
  const relative = relativeDueLabel(row)
  const showRelative = !RELATIVE_SUPPRESSED_STATUSES.has(row.status)
  const title = row.formName ?? row.taxType
  const StatusIcon = STATUS_ICON[row.status]

  return (
    <Link
      to={deadlineDetailHref({ obligationId: row.id, tab: activeTab })}
      state={{ obligationId: row.id }}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex gap-2.5 border-b border-divider-subtle px-[18px] py-3.5 outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset',
        active
          ? 'border-l-2 border-l-state-accent-solid bg-background-default-subtle'
          : 'border-l-2 border-l-transparent hover:bg-state-base-hover',
      )}
    >
      {/* TimeColumn (rzzww `wdyv4`) */}
      <div className="flex w-[60px] shrink-0 flex-col gap-0.5">
        <span className="text-base font-medium text-text-primary tabular-nums">
          {formatRailDate(row.currentDueDate)}
        </span>
        {showRelative ? (
          <span
            className={cn(
              'text-xs font-semibold tabular-nums',
              relative.tone === 'late'
                ? 'text-text-destructive'
                : relative.tone === 'soon'
                  ? 'text-text-warning'
                  : 'text-text-tertiary',
            )}
          >
            {relative.text}
          </span>
        ) : null}
      </div>

      {/* Content (rzzww `NIkyc`) */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2 pb-0.5">
          <TaxCodeBadge code={row.taxType} className="px-1.5 py-0.5 text-caption-xs" />
          {/* Status reads as an icon; the active (currently-viewed)
              row expands it to icon + label. */}
          <span className="flex shrink-0 items-center gap-1" title={statusLabel}>
            <StatusIcon
              className={cn('size-3.5 shrink-0', STATUS_ICON_COLOR[row.status])}
              aria-hidden
            />
            {active ? (
              <span className="text-xs font-medium text-text-tertiary">{statusLabel}</span>
            ) : null}
          </span>
        </div>
        <span className="line-clamp-2 text-[16px] font-medium leading-snug text-text-primary">
          {title}
        </span>
        <span className="truncate text-xs text-text-tertiary">{row.clientName}</span>
      </div>
    </Link>
  )
}
