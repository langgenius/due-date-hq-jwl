import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowDownUpIcon, CheckIcon, ChevronDownIcon, ListFilterIcon } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { ObligationQueueDetailTab, ObligationQueueRow } from '@duedatehq/contracts'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { cn } from '@duedatehq/ui/lib/utils'

import {
  ListRail,
  ListRailBody,
  ListRailHead,
  ListRailSection,
} from '@/components/patterns/list-rail'
import { SearchInput } from '@/components/primitives/search-input'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { describeTaxCode } from '@/lib/tax-codes'
import { deadlineDetailHref } from '@/features/obligations/deadline-detail-url'
import { todayIsoDate } from '@/features/obligations/queue/helpers'
import { daysBetween } from '@/lib/utils'
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

// Rail sort keys. The rail receives rows in the queue's order, but the
// navigator lets the user re-rank the loaded set client-side (and always
// shows which ranking is active). `due` (soonest first) is the default —
// the most intuitive ordering for a deadline navigator.
type RailSort = 'due' | 'priority' | 'client' | 'status'

function relativeDueLabel(row: ObligationQueueRow): {
  text: string
  tone: 'late' | 'soon' | 'calm'
} {
  // Live today-based count (matches the detail's date cards/banner) so the rail
  // and the open deadline never disagree by a day on the server snapshot.
  // NOTE: `daysBetween` clamps to >= 0, so derive past/future from two calls.
  const dueIso = row.currentDueDate.slice(0, 10)
  const today = todayIsoDate()
  const overdue = daysBetween(dueIso, today) // today − due, 0 when not past
  const until = daysBetween(today, dueIso) // due − today, 0 when not future
  if (overdue > 0) return { text: `${overdue}d late`, tone: 'late' }
  if (until === 0) return { text: 'Today', tone: 'soon' }
  return { text: `in ${until}d`, tone: until <= 7 ? 'soon' : 'calm' }
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
  // Client-side re-rank of the loaded rail rows. Default `due` = soonest
  // internal due date first. The active ranking is surfaced in the rail so the
  // user always knows how the list is ordered (Yuqi rail feedback).
  const [sortKey, setSortKey] = useState<RailSort>('due')
  const sortOptions: readonly { key: RailSort; label: string }[] = [
    { key: 'due', label: t`Due date` },
    { key: 'priority', label: t`Priority` },
    { key: 'client', label: t`Client` },
    { key: 'status', label: t`Status` },
  ]
  const sortLabel = sortOptions.find((option) => option.key === sortKey)?.label ?? t`Due date`

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

  // Re-rank the filtered set by the active sort key. Stable within ties
  // (toSorted is stable), so equal keys keep the incoming queue order.
  const sortedRows = useMemo(() => {
    return filteredRows.toSorted((a, b) => {
      switch (sortKey) {
        case 'priority':
          return b.smartPriority.score - a.smartPriority.score
        case 'client':
          return a.clientName.localeCompare(b.clientName)
        case 'status':
          return STATUS_FILTER_ORDER.indexOf(a.status) - STATUS_FILTER_ORDER.indexOf(b.status)
        default:
          // Due date — soonest internal due first (ISO strings sort lexically).
          return a.currentDueDate.localeCompare(b.currentDueDate)
      }
    })
  }, [filteredRows, sortKey])

  return (
    // Rail is the xl/lg companion
    // column; below lg the master-detail collapses to detail-only (rail hidden,
    // so the detail gets full width — the crumb's "Deadlines" link returns to
    // the table). Width 340 (lg) → 380 (xl).
    <ListRail className="hidden w-[340px] lg:flex xl:w-[380px]">
      {/* ListHead — title + count chip (rzzww `mCfAZ`). */}
      <ListRailHead className="justify-between">
        <span className="text-item-title text-text-primary">
          <Trans>Deadlines</Trans>
        </span>
        {totalCount !== null ? (
          <span className="rounded-full bg-background-subtle px-2 py-0.5 text-caption-xs font-medium tabular-nums text-text-tertiary">
            {t`${totalCount} active`}
          </span>
        ) : null}
      </ListRailHead>

      {/* FilterRow — client-side search + optional status filter over the
          loaded rows (rzzww `kEi6B`). */}
      <ListRailSection className="gap-1.5">
        <SearchInput
          variant="compact"
          value={search}
          onChange={setSearch}
          placeholder={t`Search deadlines`}
          className="min-w-0 flex-1"
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
      </ListRailSection>

      {/* RankRow — surfaces how the rail is ordered and lets the user
          re-rank the loaded set. The label always states the active sort
          ("Sorted by Due date") so the ranking is never a mystery. */}
      <ListRailSection className="justify-between py-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label={t`Change sort order`}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md py-0.5 text-caption-xs font-medium text-text-tertiary outline-none transition-colors hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
              >
                <ArrowDownUpIcon className="size-3 shrink-0" aria-hidden />
                <span>
                  <Trans>Sorted by</Trans> {sortLabel}
                </span>
                <ChevronDownIcon className="size-3 shrink-0" aria-hidden />
              </button>
            }
          />
          <DropdownMenuContent align="start" className="min-w-[180px]">
            {sortOptions.map((option) => (
              <DropdownMenuItem key={option.key} onClick={() => setSortKey(option.key)}>
                <span className="flex-1">{option.label}</span>
                {sortKey === option.key ? (
                  <CheckIcon className="size-3.5 text-text-accent" aria-hidden />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="text-caption-xs tabular-nums text-text-tertiary">
          {t`${sortedRows.length} shown`}
        </span>
      </ListRailSection>

      {/* ListBody */}
      <ListRailBody>
        {sortedRows.length === 0 ? (
          <p className="px-[18px] py-6 text-sm text-text-tertiary">
            <Trans>No deadlines match.</Trans>
          </p>
        ) : (
          sortedRows.map((row, index) => {
            // When sorted by client, lead each client's cluster with a client
            // name header so the grouping is unmistakable (Yuqi: "you can't
            // tell it's sorted by client"). Rows are already clientName-ordered.
            const showClientHeader =
              sortKey === 'client' &&
              (index === 0 || sortedRows[index - 1]!.clientName !== row.clientName)
            return (
              <Fragment key={row.id}>
                {showClientHeader ? (
                  <div className="sticky top-0 z-[1] border-b border-divider-subtle bg-background-subtle px-[18px] py-1.5 text-caption-xs font-semibold tracking-wide text-text-tertiary uppercase">
                    {row.clientName}
                  </div>
                ) : null}
                <DeadlineNavigatorRow
                  row={row}
                  active={row.id === activeObligationId}
                  activeTab={activeTab}
                  statusLabel={statusLabels[row.status]}
                />
              </Fragment>
            )
          })
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
      </ListRailBody>
    </ListRail>
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
  // Title is the plain-English description (e.g. "Individual income tax return"),
  // not the form code — the code already shows in the TaxCodeBadge above, so
  // repeating "Form 1040" as both badge AND title was redundant (Yuqi). Mirrors
  // the detail hero's "{code} — {description}".
  const title = describeTaxCode(row.taxType).description ?? row.formName ?? row.taxType
  const StatusIcon = STATUS_ICON[row.status]

  return (
    <Link
      to={deadlineDetailHref({ obligationId: row.id, tab: activeTab })}
      state={{ obligationId: row.id }}
      aria-current={active ? 'page' : undefined}
      className={cn(
        // Mirror the alert rail (AlertListRail) so both detail-page navigators
        // read identically: group/rail dimming, py-4, light base-hover selection
        // — not a left accent bar (accent isn't the steady-selection colour).
        'group/rail flex gap-3 border-b border-divider-subtle px-[18px] py-4 outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset',
        active ? 'bg-state-base-hover' : 'hover:bg-state-base-hover-subtle',
      )}
    >
      {/* TimeColumn (rzzww `wdyv4`) — w-64 + text-sm date to match the alert
          rail; dims on unselected rows so the open deadline's date is focal. */}
      <div
        className={cn(
          'flex w-[64px] shrink-0 flex-col gap-0.5 transition-opacity',
          !active && 'opacity-55 group-hover/rail:opacity-100',
        )}
      >
        <span className="text-sm font-medium text-text-primary tabular-nums">
          {formatRailDate(row.currentDueDate)}
        </span>
        {showRelative ? (
          <span
            className={cn(
              // caption-xs to match the alert rail's relative-time line. 500,
              // not 600 — color alone carries the tone (never double-highlight).
              'text-caption-xs font-medium tabular-nums',
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
        <div
          className={cn(
            'flex items-center gap-2 pb-0.5 transition-opacity',
            !active && 'opacity-55 group-hover/rail:opacity-100',
          )}
        >
          <TaxCodeBadge code={row.taxType} size="compact" />
        </div>
        {/* Form title + status on ONE line (Yuqi #2): title takes the row,
            status reads as an icon and expands to icon + label on the active
            (currently-viewed) row. */}
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              // text-base / always font-medium, color by active — identical to
              // the alert rail title (was text-nav 15px + semibold-when-active).
              'line-clamp-2 min-w-0 flex-1 text-base font-medium leading-snug',
              active ? 'text-text-primary' : 'text-text-secondary',
            )}
          >
            {title}
          </span>
          <span className="flex shrink-0 items-center gap-1 pt-0.5" title={statusLabel}>
            <StatusIcon
              className={cn('size-3.5 shrink-0', STATUS_ICON_COLOR[row.status])}
              aria-hidden
            />
            {active ? (
              <span className="text-xs font-medium text-text-tertiary">{statusLabel}</span>
            ) : null}
          </span>
        </div>
        <span className="truncate text-xs text-text-tertiary">{row.clientName}</span>
      </div>
    </Link>
  )
}
