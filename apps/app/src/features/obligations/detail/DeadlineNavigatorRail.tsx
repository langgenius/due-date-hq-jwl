import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowDownUpIcon, CheckIcon, ListFilterIcon } from 'lucide-react'
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
  ListRailTitle,
} from '@/components/patterns/list-rail'
import { FilterTrigger } from '@/components/patterns/filter-trigger'
import { SingleSelectFilter } from '@/components/patterns/single-select-filter'
import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { SearchInput } from '@/components/primitives/search-input'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { describeTaxCode } from '@/lib/tax-codes'
import { deadlineDetailHref } from '@/features/obligations/deadline-detail-url'
import { todayIsoDate } from '@/features/obligations/queue/helpers'
import { daysBetween } from '@/lib/utils'
import {
  LIFECYCLE_V2_STATUS_SETS,
  LIFECYCLE_V2_STATUSES,
  StatusMark,
  STATUS_ICON_COLOR,
  useLifecycleV2StatusLabels,
  type ObligationStatus,
} from '@/features/obligations/status-control'

// The 6 canonical lifecycle stages the filter offers (a subset of the raw
// ObligationStatus enum). The rail filter groups the 10 raw statuses into
// these stages via LIFECYCLE_V2_STATUS_SETS so the menu reads as the same
// 6-state taxonomy the rest of the product uses — not a flat enum dump.
type LifecycleV2Stage = (typeof LIFECYCLE_V2_STATUSES)[number]

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

// Canonical urgency order for the rail's "Sort by Status" ranking
// (action-needed first), mirroring the queue's ordering. NOTE: this is the
// raw-status SORT order only — the filter MENU collapses to the 6 v2 stages
// (LIFECYCLE_V2_STATUSES) so a CPA picks from the same 6-state taxonomy used
// everywhere else, not all 10 raw statuses.
const STATUS_SORT_ORDER: readonly ObligationStatus[] = [
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
  routeSearch = '',
  activeObligationId,
  activeTab,
  totalCount,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  rows: readonly ObligationQueueRow[]
  /** The page URL's search string (`location.search`) — threaded into each row's
   * deep-link href so a rail hop preserves the active status filter (Yuqi bug:
   * switching rows used to drop ?status and Close returned to the unfiltered
   * list). Distinct from the rail's own `search` box state below. */
  routeSearch?: string
  activeObligationId: string | null
  activeTab: ObligationQueueDetailTab
  totalCount: number | null
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
}) {
  const { t } = useLingui()
  // v2 merged labels: in_progress/review/extended → "In review", done/paid →
  // "Filed", pending/not_applicable → "Not started". Drives BOTH the row chips
  // and the filter menu so a filter pick ("In review") matches every row label.
  const statusLabels = useLifecycleV2StatusLabels()
  const [search, setSearch] = useState('')
  // Optional client-side status filter over the loaded rail rows. `all` shows
  // everything; otherwise only rows whose status maps to the chosen v2 stage
  // (via LIFECYCLE_V2_STATUS_SETS). Composes with search.
  const [statusFilter, setStatusFilter] = useState<LifecycleV2Stage | 'all'>('all')
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

  // v2 STAGES present in the loaded set, with rolled-up counts, in canonical
  // order — the menu only offers stages that actually exist in the rail. Each
  // raw status maps to exactly one stage via LIFECYCLE_V2_STATUS_SETS, so the
  // counts sum to the total and "In review 10" matches 10 rows labelled "In
  // review" (was a flat 10-status dump that read as "too complicated").
  const statusOptions = useMemo(() => {
    const counts = new Map<LifecycleV2Stage, number>()
    for (const row of rows) {
      const stage = LIFECYCLE_V2_STATUSES.find((s) =>
        (LIFECYCLE_V2_STATUS_SETS[s] as readonly ObligationStatus[]).includes(row.status),
      )
      if (stage) counts.set(stage, (counts.get(stage) ?? 0) + 1)
    }
    return LIFECYCLE_V2_STATUSES.filter((stage) => counts.has(stage)).map((stage) => ({
      status: stage,
      count: counts.get(stage) ?? 0,
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
      if (
        effectiveStatusFilter !== 'all' &&
        !(LIFECYCLE_V2_STATUS_SETS[effectiveStatusFilter] as readonly ObligationStatus[]).includes(
          row.status,
        )
      )
        return false
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
          return STATUS_SORT_ORDER.indexOf(a.status) - STATUS_SORT_ORDER.indexOf(b.status)
        default:
          // Due date — soonest internal due first (ISO strings sort lexically).
          return a.currentDueDate.localeCompare(b.currentDueDate)
      }
    })
  }, [filteredRows, sortKey])

  // The rail count reads "28 active" at rest and flips to "5 shown" only while
  // a search/status filter is narrowing the list — so the count is always
  // informative and we drop the standalone "N shown" line that just restated
  // the title chip when nothing was filtered (Yuqi 2026-06-16).
  const isRailFiltered = search.trim().length > 0 || effectiveStatusFilter !== 'all'
  const countChipLabel = isRailFiltered
    ? t`${sortedRows.length} shown`
    : totalCount !== null
      ? t`${totalCount} active`
      : null

  return (
    // Rail is the xl/lg companion
    // column; below lg the master-detail collapses to detail-only (rail hidden,
    // so the detail gets full width — the crumb's "Deadlines" link returns to
    // the table). Width 340 (lg) → 380 (xl).
    <ListRail className="hidden w-[340px] lg:flex xl:w-[380px]">
      {/* ListHead — title + count chip + Sort control on ONE line (rzzww
          `mCfAZ`). 2026-06-16 (Yuqi): Sort moved up here to mirror the
          Jurisdictions rail's "Show" control, which let us drop the separate
          rank row (its "N shown" count folded into the chip; its
          "Soonest internal due date first" note was just restating the sort). */}
      <ListRailHead className="justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ListRailTitle>
            <Trans>Deadlines</Trans>
          </ListRailTitle>
          {countChipLabel !== null ? (
            <span className="shrink-0 rounded-full bg-background-subtle px-2 py-0.5 text-caption-xs font-medium tabular-nums text-text-tertiary">
              {countChipLabel}
            </span>
          ) : null}
        </div>
        {/* Compact SingleSelectFilter (size="sm") — the rail's narrow form of
            the same Sort pill used on /deadlines + /alerts toolbars, via the
            first-class h-7 variant rather than a per-caller className override. */}
        <SingleSelectFilter
          label={<Trans>Sort by</Trans>}
          ariaLabel={t`Change sort order`}
          leadingIcon={ArrowDownUpIcon}
          size="sm"
          align="end"
          active
          className="shrink-0"
          menuClassName="min-w-[180px]"
          value={sortKey}
          options={sortOptions.map((option) => ({ value: option.key, label: option.label }))}
          onValueChange={(next) => setSortKey(next)}
        />
      </ListRailHead>

      {/* FilterRow — client-side search + optional status filter over the
          loaded rows (rzzww `kEi6B`). */}
      <ListRailSection className="gap-1.5">
        <SearchInput
          variant="compact"
          value={search}
          onChange={setSearch}
          placeholder={t`Filter deadlines`}
          className="min-w-0 flex-1"
        />
        {/* Optional status filter. Trigger surfaces the active status label so
            it's clear the rail is filtered; "All statuses" clears it. */}
        {/* Compact FilterTrigger (size="sm") — replaces the old hand-rolled
            button so the rail status filter speaks the pill vocabulary too. It
            collapses to icon-only at rest (no children) and names the active
            status when filtered; a FilterTrigger (not SingleSelectFilter)
            because the trigger has no static label slot — it's icon → value. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <FilterTrigger
                size="sm"
                className="shrink-0"
                aria-label={t`Filter by status`}
                leadingIcon={ListFilterIcon}
                active={effectiveStatusFilter !== 'all'}
              >
                {effectiveStatusFilter !== 'all' ? (
                  <span className="max-w-[110px] truncate">
                    {statusLabels[effectiveStatusFilter]}
                  </span>
                ) : null}
              </FilterTrigger>
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
                  <CapsFieldLabel
                    as="div"
                    variant="group"
                    className="sticky top-0 z-[1] border-b border-divider-subtle bg-background-subtle px-[18px] py-1.5"
                  >
                    {row.clientName}
                  </CapsFieldLabel>
                ) : null}
                <DeadlineNavigatorRow
                  row={row}
                  active={row.id === activeObligationId}
                  activeTab={activeTab}
                  routeSearch={routeSearch}
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
  routeSearch,
  statusLabel,
}: {
  row: ObligationQueueRow
  active: boolean
  activeTab: ObligationQueueDetailTab
  routeSearch: string
  statusLabel: string
}) {
  const relative = relativeDueLabel(row)
  const showRelative = !RELATIVE_SUPPRESSED_STATUSES.has(row.status)
  // Title is the plain-English description (e.g. "Individual income tax return"),
  // not the form code — the code already shows in the TaxCodeBadge above, so
  // repeating "Form 1040" as both badge AND title was redundant (Yuqi). Mirrors
  // the detail hero's "{code} — {description}".
  const title = describeTaxCode(row.taxType).description ?? row.formName ?? row.taxType

  return (
    <Link
      to={deadlineDetailHref({ obligationId: row.id, tab: activeTab, search: routeSearch })}
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
            <StatusMark
              status={row.status}
              className={cn('size-3.5 shrink-0', STATUS_ICON_COLOR[row.status])}
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
