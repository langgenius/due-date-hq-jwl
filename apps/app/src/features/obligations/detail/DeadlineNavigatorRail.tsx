import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowDownUpIcon, CheckIcon } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router'
import type { ObligationQueueDetailTab, ObligationQueueRow } from '@duedatehq/contracts'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

import {
  ListRail,
  ListRailBody,
  ListRailHead,
  ListRailSection,
  ListRailTitle,
  useRailArrival,
} from '@/components/patterns/list-rail'
import { QueryErrorState } from '@/components/patterns/query-error-state'
import { FilterTrigger } from '@/components/patterns/filter-trigger'
import { SingleSelectFilter } from '@/components/patterns/single-select-filter'
import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { SearchInput } from '@/components/primitives/search-input'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { describeTaxCode } from '@/lib/tax-codes'
import { DueCountdownText } from '@/components/primitives/due-date-label'
import { deadlineDetailHref } from '@/features/obligations/deadline-detail-url'
import { deadlineDetailStateOrigin, todayIsoDate } from '@/features/obligations/queue/helpers'
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
  days: number
  tone: 'late' | 'soon' | 'calm'
} {
  // Live today-based count (matches the detail's date cards/banner) so the rail
  // and the open deadline never disagree by a day on the server snapshot.
  // NOTE: `daysBetween` clamps to >= 0, so derive past/future from two calls.
  const dueIso = row.currentDueDate.slice(0, 10)
  const today = todayIsoDate()
  const overdue = daysBetween(dueIso, today) // today − due, 0 when not past
  const until = daysBetween(today, dueIso) // due − today, 0 when not future
  // Return the SIGNED day count (neg = late, 0 = today, pos = future) so the
  // wording comes from the canonical DueCountdownText (2026-07-22 sweep — the
  // rail used to hand-roll "Today"/"in Nd", diverging from its sibling rails).
  if (overdue > 0) return { days: -overdue, tone: 'late' }
  if (until === 0) return { days: 0, tone: 'soon' }
  return { days: until, tone: until <= 7 ? 'soon' : 'calm' }
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
  loadError = null,
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
  /** S1 (ux-flow audit 2026-07-02): when the backing `obligations.list`
   * query FAILED, the rail must not read "No deadlines match." — that copy
   * claims an empty result the server never returned. Non-null = show the
   * shared inline error + Retry instead of the empty state. */
  loadError?: { error: unknown; onRetry: () => void; retrying: boolean } | null
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

  // The rail count flips to "5 shown" only while a search/status filter is
  // narrowing the list — so the count is always informative and we drop the
  // standalone "N shown" line that just restated the title chip when nothing
  // was filtered (Yuqi 2026-06-16).
  //
  // 2026-07-02 (ux-flow S4 count drift): the resting label used to read
  // "N active", but this rail's rows are the table's own list query — ALL
  // statuses, filed and not-started included — and `totalCount` is only the
  // LOADED slice, so "27 active" sat beside the /deadlines header's "28" and
  // the sidebar's "12 open" as a third unexplained scope. Per the
  // data-consistency contract the chip now names its real source: "N in
  // list" once fully loaded (the same set + filters the table shows),
  // "N loaded" while more pages remain (an honest partial, never a fake
  // total).
  const isRailFiltered = search.trim().length > 0 || effectiveStatusFilter !== 'all'
  const countChipLabel = isRailFiltered
    ? t`${sortedRows.length} shown`
    : totalCount !== null
      ? hasMore
        ? t`${totalCount} loaded`
        : t`${totalCount} in list`
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
          placeholder={t`Filter by client or form`}
          className="min-w-0 flex-1"
        />
        {/* Status filter (Yuqi: "a better representation needed, to show it is
            about status"). The compact FilterTrigger always names what it
            filters — a steady "Status" label — and LEADS with a status glyph:
            a quiet generic mark at rest, the SELECTED status's `StatusMark` (in
            its canonical tone) once a stage is picked, so the trigger reads as
            its own status pill. The picked stage then shows behind the hairline
            in the accent value slot ("Status │ In review ⌄"). Mirrors the
            main /deadlines status picker's glyph-per-option vocabulary. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <FilterTrigger
                size="sm"
                className="shrink-0"
                aria-label={t`Filter by status`}
                active={effectiveStatusFilter !== 'all'}
                valueLabel={
                  effectiveStatusFilter !== 'all' ? (
                    <span className="max-w-[96px] truncate">
                      {statusLabels[effectiveStatusFilter]}
                    </span>
                  ) : undefined
                }
                // Reserve the value slot to the widest status label so the pill
                // stops resizing when a different status is picked.
                valueOptions={statusOptions.map(({ status }) => (
                  <span key={status} className="max-w-[96px] truncate">
                    {statusLabels[status]}
                  </span>
                ))}
              >
                <StatusMark
                  status={effectiveStatusFilter === 'all' ? 'pending' : effectiveStatusFilter}
                  className={cn(
                    'size-3.5 shrink-0',
                    effectiveStatusFilter === 'all'
                      ? 'text-text-tertiary'
                      : STATUS_ICON_COLOR[effectiveStatusFilter],
                  )}
                />
                <Trans>Status</Trans>
              </FilterTrigger>
            }
          />
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuItem className="gap-2" onClick={() => setStatusFilter('all')}>
              <span className="flex-1">
                <Trans>All statuses</Trans>
              </span>
              <span className="tabular-nums text-text-tertiary">{rows.length}</span>
              {effectiveStatusFilter === 'all' ? (
                <CheckIcon className="size-3.5 text-text-accent" aria-hidden />
              ) : null}
            </DropdownMenuItem>
            {statusOptions.map(({ status, count }) => (
              <DropdownMenuItem
                key={status}
                className="gap-2"
                onClick={() => setStatusFilter(status)}
              >
                {/* Status glyph leads each option, matching the main-list
                    status picker so the menu reads as a colour-coded
                    status chooser, not a flat label list. */}
                <StatusMark
                  status={status}
                  className={cn('size-3.5 shrink-0', STATUS_ICON_COLOR[status])}
                />
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
        {loadError && rows.length === 0 ? (
          // Failure ≠ empty: the list query errored, so "No deadlines match."
          // would be fiction. Shared inline error + Retry (refetches the list).
          <QueryErrorState
            size="inline"
            what={<Trans>deadlines</Trans>}
            error={loadError.error}
            onRetry={loadError.onRetry}
            retrying={loadError.retrying}
          />
        ) : sortedRows.length === 0 ? (
          // Zero-results is a recovery moment, not a dead-end: offer a one-click
          // way back to the full list (matches the page-level empties + the
          // sibling ObligationListRail / AlertListRail treatment).
          <div className="px-[18px] py-10 text-center">
            <p className="text-base text-text-tertiary">
              <Trans>No deadlines match.</Trans>
            </p>
            {search.trim().length > 0 ? (
              <TextLink
                variant="accent"
                size="sm"
                onClick={() => setSearch('')}
                className="mt-2 inline-block"
              >
                <Trans>Clear filter</Trans>
              </TextLink>
            ) : null}
          </div>
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
  const location = useLocation()
  const origin = deadlineDetailStateOrigin(location.state)
  const relative = relativeDueLabel(row)
  const showRelative = !RELATIVE_SUPPRESSED_STATUSES.has(row.status)
  // Arrival: scroll the opened deadline into view on the rail's first paint +
  // play the one-time arrival wash — parity with AlertListRail, so landing
  // here from /today (priority row, citation chip) or a shared URL always
  // shows WHICH row you arrived on (the rail used to leave it off-screen).
  const { ref, arrived } = useRailArrival<HTMLAnchorElement>(active)
  // Title is the plain-English description (e.g. "Individual income tax return"),
  // not the form code — the code already shows in the TaxCodeBadge above, so
  // repeating "Form 1040" as both badge AND title was redundant (Yuqi). Mirrors
  // the detail hero's "{code} — {description}".
  const title = describeTaxCode(row.taxType).description ?? row.formName ?? row.taxType

  return (
    <Link
      ref={ref}
      to={deadlineDetailHref({ obligationId: row.id, tab: activeTab, search: routeSearch })}
      // Thread the launch origin (e.g. "/" when opened from /today) through
      // rail hops so ✕/Esc still returns to the picker the user came from.
      state={{ obligationId: row.id, ...(origin ? { from: origin } : {}) }}
      aria-current={active ? 'page' : undefined}
      className={cn(
        // Mirror the alert rail (AlertListRail) so both detail-page navigators
        // read identically: group/rail dimming, py-4, light base-hover selection
        // — not a left accent bar (accent isn't the steady-selection colour).
        'group/rail flex gap-3 border-b border-divider-subtle px-[18px] py-4 outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset',
        active ? 'bg-state-base-hover' : 'hover:bg-state-base-hover-subtle',
        arrived && 'animate-arrival-wash',
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
              // caption-xs + tracking-title to match the alert rail's
              // relative-time line exactly. 500, not 600 — color alone carries
              // the tone (never double-highlight).
              'text-caption-xs font-medium tracking-title tabular-nums',
              relative.tone === 'late'
                ? 'text-text-destructive'
                : relative.tone === 'soon'
                  ? 'text-text-warning'
                  : 'text-text-tertiary',
            )}
          >
            <DueCountdownText days={relative.days} />
          </span>
        ) : null}
      </div>

      {/* Content (rzzww `NIkyc`) — gap-2 between badge row / title / client
          line, matching the alert rail's content column rhythm so the two
          detail navigators breathe identically. */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Badge row — dims on unselected items so the selected row's chip
            carries the colour, mirroring the alert rail's gap-1.5 chip row. */}
        <div
          className={cn(
            'flex items-center gap-1.5 transition-opacity',
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
        {/* Client line — the alert rail's bottom-meta slot, sized text-sm for
            density parity. Tertiary tone (not the alert's secondary): the
            client is quiet identity context here, not the row's headline. */}
        <span className="truncate text-sm text-text-tertiary">{row.clientName}</span>
      </div>
    </Link>
  )
}
