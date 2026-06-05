import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircleIcon,
  Clock3Icon,
  HistoryIcon,
  ListIcon,
  MapIcon,
  SatelliteDishIcon,
  SearchIcon,
  type LucideIcon,
} from 'lucide-react'

import type { PulseAffectedClient, PulseAlertPublic, PulseSourceHealth } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@duedatehq/ui/components/ui/popover'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { cn } from '@duedatehq/ui/lib/utils'

import { rpcErrorMessage } from '@/lib/rpc-error'
import { ShortcutHintChip } from '@/components/patterns/kbd'
import { PageHeader } from '@/components/patterns/page-header'
import { FilterTrigger } from '@/components/patterns/filter-trigger'
import { StatusBanner } from '@/components/patterns/status-banner'

import { useAlertDrawer } from './DrawerProvider'
import { useMorningSweep } from './MorningSweepContext'
import { AlertDetailDrawer } from './AlertDetailDrawer'
import { StateTilegram } from './components/StateTilegram'
import {
  useAlertsListInfiniteQueryOptions,
  useAlertsHistoryInfiniteQueryOptions,
  useAlertSourceHealthQueryOptions,
  useAlertsAffectedClients,
} from './api'
import { AlertCard } from './components/AlertCard'
import { PulseFormRevisedCard } from './components/PulseFormRevisedCard'
import { PulseAlertsMap } from './components/PulseAlertsMap'
import { ALERT_STATUS_ICON } from './components/AlertStatusBadge'
import { PulsingDot } from './components/PulsingDot'
import {
  isAlertImpactFilter,
  matchesAlertImpactFilter,
  ALERT_IMPACT_FILTER_OPTIONS,
  type AlertImpactFilter,
} from './lib/impact-filter'
import { alertImpactLevel } from './lib/impact-level'
import {
  ACTIVE_STATUS_FILTER_OPTIONS,
  CHANGE_KIND_FILTER_OPTIONS,
  HISTORY_STATUS_FILTER_OPTIONS,
  isChangeKindFilter,
  isStatusFilter,
  isTaxAreaFilter,
  matchesChangeKindFilter,
  matchesStatusFilter,
  matchesTaxAreaFilter,
  sourceLabel,
  TAX_AREA_FILTER_OPTIONS,
  type AlertChangeKindFilter,
  type AlertStatusFilter,
  type AlertTaxAreaFilter,
} from './lib/alert-filters'

// Status filters are scoped by surface: the active queue exposes only
// active-workflow states, while history exposes CPA-handled states.
const EMPTY_ALERTS: readonly PulseAlertPublic[] = []
const EMPTY_SOURCES: readonly PulseSourceHealth[] = []
const EMPTY_AFFECTED: PulseAffectedClient[] = []

interface AlertsListPageProps {
  embedded?: boolean
  /**
   * 2026-05-25 (Yuqi Alerts #2 — sub-page sweep): when true, the
   * page renders CPA-handled alert history — initial status filter
   * shows all handled statuses, the
   * "View history" cross-link in the header is hidden (we're
   * already on it), and the impact/source filters still work as
   * normal. The dedicated `/alerts/history` route mounts
   * this with `historyMode={true}` so the archive has its own
   * URL + sidebar entry instead of being a soft-filter on the
   * live page.
   */
  historyMode?: boolean
}

// Alerts — source-backed rule-change timeline.
// Uses the same hairline / mono language as the dashboard strip; no oversized
// cards, no chrome shadows.
export function AlertsListPage({ embedded = false, historyMode = false }: AlertsListPageProps) {
  const { t } = useLingui()
  const { openDrawer, alertId: openAlertId, closeDrawer } = useAlertDrawer()
  // 2026-05-26 (Yuqi thirtieth pass — responsiveness): auto-collapse
  // the sidebar to icons-only when the user opens an alert. Frees
  // ~200px of horizontal room for the panel layout on smaller
  // desktops (1280–1440px viewports especially benefit).
  //
  // 2026-05-26 (Yuqi sidebar mental-model pass — consistency fix):
  // the original implementation here called `toggleCollapsed()`
  // directly, which writes the new state to localStorage —
  // permanently flipping the user's persistent preference every
  // time they clicked an alert. That's a bug: the auto-collapse
  // should be TRANSIENT (drawer is open) and the user's preference
  // should be untouched. `AlertDetailDrawer` now handles the
  // auto-collapse properly via `setAutoCollapsed` (see that
  // component) — no wrapper needed here. Just open the drawer.
  const openDrawerAndCollapseSidebar = openDrawer
  const [statusFilter, setStatusFilter] = useState<AlertStatusFilter>('all')
  const [impactFilter, setImpactFilter] = useState<AlertImpactFilter>('all')
  const [changeKindFilter, setChangeKindFilter] = useState<AlertChangeKindFilter>('all')
  // 2026-06-05 (Tax area filter): single-select service-line filter. Each alert
  // carries a derived `taxAreas` array; 'all' shows everything (including alerts
  // the server could not classify into a bucket).
  const [taxAreaFilter, setTaxAreaFilter] = useState<AlertTaxAreaFilter>('all')
  // 2026-06-04 round 34 (Yuqi Pencil T3GhR "implement the function and
  // also the visual"): time-range filter ("Last 24 hours" / "Last
  // 7 days" / "All time"). Default: all_time so existing behavior
  // doesn't change for unaware callers. When set to last_24h /
  // last_7d, alerts older than the window are filtered out by
  // `filteredAlerts` below.
  const [timeRangeFilter, setTimeRangeFilter] = useState<'all_time' | 'last_24h' | 'last_7d'>(
    'all_time',
  )
  // 2026-06-04 round 42 (Yuqi punch list #4 — "yes please" to
  // wiring real Sort logic): three sort orders.
  //   • 'newest'         — publishedAt DESC (default; matches the
  //                        most recent edit-style scan)
  //   • 'oldest'         — publishedAt ASC  (work-through-backlog
  //                        scan)
  //   • 'highest_impact' — impact level DESC then publishedAt DESC.
  //                        HIGH IMPACT (most affected clients) first
  //                        so the biggest items rise.
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest_impact'>('newest')
  // 2026-06-04 round 35 (Yuqi "also missing the search bar"): inline
  // search field per Pencil T3GhR `JsUoN` — fills remaining width
  // in the filter row, free-text matches against alert.title +
  // alert.source case-insensitively.
  const [searchQuery, setSearchQuery] = useState('')
  // 2026-06-04 round 34 (Yuqi Pencil T3GhR "My morning sweep" saved
  // view): preset filter combination — Last 24 hours + Needs Action
  // status.
  //
  // 2026-06-04 round 38 (Yuqi item 10 — "My morning sweep can be beside
  // Sources, Alert history button"): the toggle moved from this page's
  // filter row to the route shell's actions cluster (`alerts.tsx`).
  // The on/off state lives in MorningSweepContext (Provider mounted in
  // `alerts.tsx`). Here we consume it to OVERRIDE the local filter
  // state when the preset is active — the user-facing filter pills
  // reflect what's actually being applied. When the context isn't
  // mounted (e.g. alerts.history) the hook returns null and we
  // fall back to local state untouched.
  const morningSweep = useMorningSweep()
  const effectiveTimeRangeFilter = morningSweep?.active ? 'last_24h' : timeRangeFilter
  const effectiveStatusFilter: AlertStatusFilter = morningSweep?.active ? 'active' : statusFilter
  // 2026-05-25 (Yuqi Alerts #9): state filter. v1 ships as a chip
  // strip (one chip per state with active alerts, count badge,
  // click-to-filter). The full SVG US map is a follow-on polish
  // round on top of this; the chip strip delivers the same filter
  // function with much less surface area. `null` = no filter
  // active.
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string | null>(null)
  // 2026-06-04 round 3 (Yuqi feedback "tackle map view"): view
  // toggle between the canonical list view and Pencil RMS9y's
  // state-heatmap. Map mode shows `<PulseAlertsMap>` above the
  // list; clicking a state tile sets the jurisdiction filter.
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  // 2026-06-05 (Load more): both surfaces paginate via keyset cursor. The
  // server returns one page at a time (publishedAt DESC); "Load more" appends
  // the next page and the client-side filters + sort below operate on the
  // full loaded set.
  const activeAlertsInfiniteOptions = useAlertsListInfiniteQueryOptions()
  const historyAlertsInfiniteOptions = useAlertsHistoryInfiniteQueryOptions()
  const alertsQuery = useInfiniteQuery(
    historyMode ? historyAlertsInfiniteOptions : activeAlertsInfiniteOptions,
  )
  const sourceHealthQuery = useQuery(useAlertSourceHealthQueryOptions())
  const alerts = useMemo(
    () => alertsQuery.data?.pages.flatMap((page) => page.alerts) ?? EMPTY_ALERTS,
    [alertsQuery.data?.pages],
  )
  const sourceHealth = sourceHealthQuery.data?.sources ?? EMPTY_SOURCES
  // Batch the affected-client rows for every alert in ONE request and hand each
  // card its slice, instead of every AlertCard firing its own `getDetail`.
  // Keyed off the full (stable) `alerts` set — not `filteredAlerts` — so
  // client-side filter changes don't refetch; cards just look up their id.
  const alertIds = useMemo(() => alerts.map((alert) => alert.id), [alerts])
  const affectedByAlert = useAlertsAffectedClients(alertIds)
  const statusFilterOptions = historyMode
    ? HISTORY_STATUS_FILTER_OPTIONS
    : ACTIVE_STATUS_FILTER_OPTIONS
  // Counts per jurisdiction (state) across the unfiltered alerts —
  // backs the chip strip below. Sorted by count desc then state code
  // asc so the highest-impact states float to the front; zero-count
  // states never appear (alerts.filter excludes them implicitly).
  const jurisdictionCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const alert of alerts) {
      map.set(alert.jurisdiction, (map.get(alert.jurisdiction) ?? 0) + 1)
    }
    return [...map.entries()].toSorted(([aCode, aCount], [bCode, bCount]) => {
      if (aCount !== bCount) return bCount - aCount
      return aCode.localeCompare(bCode)
    })
  }, [alerts])
  const filteredAlerts = useMemo(() => {
    const now = Date.now()
    // Use `effectiveTimeRangeFilter` / `effectiveStatusFilter` so the
    // MorningSweepContext preset can override local filter state when
    // the header button is active. When the context is null (no
    // provider mounted, e.g. history route), `effective*` collapses
    // back to local state — no change in behavior.
    const cutoffMs =
      effectiveTimeRangeFilter === 'last_24h'
        ? now - 24 * 60 * 60 * 1000
        : effectiveTimeRangeFilter === 'last_7d'
          ? now - 7 * 24 * 60 * 60 * 1000
          : null
    const trimmedQuery = searchQuery.trim().toLowerCase()
    return alerts.filter(
      (alert) =>
        matchesAlertImpactFilter(alert, impactFilter) &&
        matchesStatusFilter(alert.status, effectiveStatusFilter) &&
        matchesChangeKindFilter(alert.changeKind, changeKindFilter) &&
        matchesTaxAreaFilter(alert.taxAreas, taxAreaFilter) &&
        (jurisdictionFilter === null || alert.jurisdiction === jurisdictionFilter) &&
        (cutoffMs === null || new Date(alert.publishedAt).getTime() >= cutoffMs) &&
        (trimmedQuery === '' ||
          alert.title.toLowerCase().includes(trimmedQuery) ||
          alert.source.toLowerCase().includes(trimmedQuery)),
    )
  }, [
    alerts,
    changeKindFilter,
    effectiveStatusFilter,
    effectiveTimeRangeFilter,
    impactFilter,
    jurisdictionFilter,
    searchQuery,
    taxAreaFilter,
  ])
  // 2026-06-04 round 42 (Yuqi punch list #4): real sort logic.
  // The list renderer reads `sortedAlerts` instead of
  // `filteredAlerts` so the Sort by dropdown actually reorders
  // the cards.
  const sortedAlerts = useMemo(() => {
    const tierRank = (a: PulseAlertPublic) => {
      // 2026-06-05: rank by REAL client impact (matchedCount +
      // needsReviewCount via `alertImpactLevel`), not inverted AI
      // confidence — so "Highest impact" agrees with the card badge
      // and the Impact filter. high → 3 (sorts first when we DESC by
      // rank), medium → 2, low → 1.
      const level = alertImpactLevel(a)
      if (level === 'high') return 3
      if (level === 'medium') return 2
      return 1
    }
    const next = [...filteredAlerts]
    if (sortOrder === 'oldest') {
      next.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
    } else if (sortOrder === 'highest_impact') {
      next.sort((a, b) => {
        const diff = tierRank(b) - tierRank(a)
        if (diff !== 0) return diff
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      })
    } else {
      // 'newest' (default) — publishedAt DESC.
      next.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    }
    return next
  }, [filteredAlerts, sortOrder])
  const isEmpty = !alertsQuery.isLoading && alerts.length === 0
  const isFilteredEmpty = !alertsQuery.isLoading && alerts.length > 0 && filteredAlerts.length === 0
  const filtersActive =
    impactFilter !== 'all' ||
    statusFilter !== 'all' ||
    changeKindFilter !== 'all' ||
    taxAreaFilter !== 'all' ||
    jurisdictionFilter !== null ||
    timeRangeFilter !== 'all_time' ||
    searchQuery.trim() !== ''

  // 2026-05-25 (Yuqi /alerts #9 — drawer → page panel): when
  // an alert is open, the page splits into a left column (header,
  // filters, alert list) + a right column (the inline alert-detail
  // panel). When no alert is open the page renders as a single
  // column. Mirrors the /deadlines + obligation-drawer pattern. The
  // panel is only rendered in `historyMode=false || true` — both
  // routes can review an alert in place.
  const panelOpen = openAlertId !== null
  return (
    // 2026-05-25 (Yuqi panel polish): when an alert is open, the
    // page becomes a fixed-height (h-full) flex container so the
    // split-column inner can scroll independently inside its own
    // bounds — the page itself no longer scrolls vertically. This
    // kills the "scroll on the left AND scroll on the right"
    // double-scroll Yuqi flagged. When no alert is open the page
    // keeps its natural auto-height (the table below paginates so
    // there's nothing to scroll past anyway).
    <div
      className={
        embedded
          ? // 2026-05-26 (Yuqi /alerts third pass #6): embedded
            // mount now propagates `h-full min-h-0` so the right
            // panel (mode="panel" AlertDetailDrawer) can stretch
            // to fill the parent route shell's height and the
            // panel handles its own internal scroll. Without this
            // the embedded shell collapsed to content-height and
            // the panel only occupied the height of the tallest
            // alert card.
            'flex h-full min-h-0 flex-col gap-6'
          : panelOpen
            ? // 2026-05-26 (audit P0 #10 — width unified, height
              // still panel-aware): panel-open branch keeps `h-full
              // min-h-0` so the split-column wrapper can manage its
              // own scroll bounds. The MAX-WIDTH alone was the
              // audit's complaint ("layout jumps left ~80 px when
              // an alert is clicked") — that's now fixed by holding
              // `max-w-[1440px]` in both panel states. Height
              // handling stays panel-aware: auto-height when the
              // list stands alone (route shell's natural scroll),
              // fixed-height when the panel is open (split-column
              // owns scroll inside its own bounds, no double-scroll).
              'mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6'
            : // 2026-05-26 (audit P0 #10 — width unified): list-only
              // branch promoted from `max-w-page-wide` (1100px) to
              // `max-w-[1440px]` to eliminate the 80px page-shift
              // on every alert click. List-only at 1440 has extra
              // horizontal whitespace versus 1100 — breathing room
              // around the alert cards, smaller cost than the
              // constant left-shift jolt.
              'mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6'
      }
    >
      {!embedded ? (
        // 2026-05-26 (Yuqi seventy-fourth pass — Alerts joins the
        // page-header family): the hand-rolled <header> retired in
        // favor of the canonical PageHeader primitive. Title +
        // canonical chip + PulsingDot inline (preserved — it
        // carries the "live signal" semantics specific to Alerts).
        // "View history" promoted from a text link → outline Button
        // shape so the action cluster reads as actions, not soft
        // links. Description survives via the primitive's description
        // prop, picking up the canonical text-[13px] leading-5
        // instead of the hand-rolled text-md.
        <PageHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Trans>Alerts</Trans>
              {!alertsQuery.isLoading ? (
                // 2026-06-04 (Yuqi feedback #2 "red does not make
                // sense here"): variant `secondary` → `outline` so
                // the count chip reads as a neutral total — not as
                // an urgency signal. PulsingDot below carries the
                // alert-state semantics; this chip is just the
                // alert count.
                <Badge variant="outline" size="lg" className="tabular-nums">
                  {alerts.length === 0 ? (
                    <Trans>0 ongoing</Trans>
                  ) : (
                    <Plural value={alerts.length} one="# ongoing" other="# ongoing" />
                  )}
                </Badge>
              ) : null}
              <PulsingDot
                tone={isEmpty ? 'success' : 'warning'}
                active
                label={
                  isEmpty ? t`No active alerts right now` : t`Active alerts waiting for review`
                }
              />
            </span>
          }
          description={t`Regulatory alerts that match your practice's clients. Review, batch-apply due-date changes or revisit closed changes.`}
          actions={
            <>
              {/* 2026-05-27 (Step 6 UX flows audit H1.4): shortcut
                  discoverability chip for /alerts toolbar. Alerts have
                  J/K row nav (per AlertsListPage hotkeys) but `?` was
                  undiscoverable. */}
              <ShortcutHintChip className="hidden md:inline-flex" />
              {/* 2026-06-04 round 3 (Yuqi feedback "tackle map
                  view"): two-button group toggling between List
                  and Map. Map shows `<PulseAlertsMap>` above the
                  list (Pencil RMS9y body split). */}
              <div
                role="group"
                aria-label={t`View mode`}
                className="inline-flex rounded-xl border border-divider-subtle bg-background-default p-0.5"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  className={cn(
                    'inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium outline-none transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                    viewMode === 'list'
                      ? 'bg-state-accent-hover text-text-accent'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  <ListIcon className="size-3" aria-hidden />
                  <Trans>List</Trans>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  aria-pressed={viewMode === 'map'}
                  className={cn(
                    'inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium outline-none transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                    viewMode === 'map'
                      ? 'bg-state-accent-hover text-text-accent'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  <MapIcon className="size-3" aria-hidden />
                  <Trans>Map</Trans>
                </button>
              </div>
              {/* 2026-06-04 (Yuqi feedback #4 "missing Sources
                  button"): Sources management entry-point added to
                  the actions cluster. */}
              <Button
                variant="outline"
                size="sm"
                render={<Link to="/rules/sources" />}
                aria-label={t`Manage alert sources`}
              >
                <SatelliteDishIcon data-icon="inline-start" />
                <Trans>Sources</Trans>
              </Button>
              {!historyMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link to="/alerts/history" />}
                  aria-label={t`View history`}
                >
                  <HistoryIcon data-icon="inline-start" />
                  <Trans>View history</Trans>
                </Button>
              ) : null}
            </>
          }
        />
      ) : null}

      {alertsQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Couldn't load alerts</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(alertsQuery.error) ??
              t`Check your network and try again. If this keeps happening, contact support.`}{' '}
            {/* 2026-05-27 (σ cross-route audit D5): raw underline button
                → canonical `<Button variant="link">`. Dashboard /
                clients / obligations Retry buttons all use this exact
                shape; Alerts was the only surface with a hand-rolled
                underline (no focus-visible ring, no accent color). */}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 align-baseline"
              onClick={() => void alertsQuery.refetch()}
            >
              <Trans>Retry</Trans>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* 2026-05-25 (Yuqi /alerts #9): split-column wrapper.
          When an alert is open, the list column shrinks to leave
          room for the inline panel on the right. When no alert is
          open, the list takes the full width — `panelOpen ? flex
          gap-4 : contents` collapses the wrapper away so the
          empty state and skeleton lay out exactly as they did
          before this refactor. */}
      {/* 2026-05-25 (Yuqi panel polish): when the panel is open
          the list column scrolls independently — `overflow-y-auto`
          contains the alert cards so long lists don't push the
          page down. Outer page is fixed-height (see root), so
          the panel column's own scroll-management on the right
          stays independent. No more double-scroll.
          2026-05-26 (Yuqi /alerts follow-up #2): dropped the
          `pr-1` gutter — it inset the scrollbar 4px from the
          column edge, which made the scrollbar look like it was
          floating "inside" the page chrome instead of hugging
          the column boundary. With `scrollbar-gutter: stable`
          the layout still doesn't jump on scroll appearance. */}
      {/* 2026-05-26 (Yuqi /alerts seventh pass — independent
          column scroll): the split-column wrapper is ALWAYS a
          row-flex with min-h-0/flex-1, and the list column ALWAYS
          carries its own overflow-y-auto. Previously the layout
          collapsed to `contents` when the panel was closed, which
          deferred scrolling to the route shell — Yuqi flagged that
          the two columns shouldn't scroll together as one block.
          With the shell now lockViewport'd at the route level, the
          list scrolls inside its column whether or not the panel
          is open, and the panel column manages its own internal
          scroll via the AlertDetailDrawer aside. */}
      {/* 2026-05-26 (Yuqi thirty-third pass): list/panel gap bumped
          gap-4 → gap-6 (16px → 24px). With the NEW chip pinned to
          the card's top-right corner and the panel pulled flush
          against its left edge, the previous 16px gap read as
          "stuff cropped at the seam." 24px gives both columns
          breathing room from the boundary. */}
      {/* 2026-05-26 (Yuqi forty-third pass — spacing unification):
          list column inter-card gap dropped from gap-4 (16px) →
          gap-3 (12px). Per canonical: "gap between cards = gap-3"
          (sibling cards in a list, not page-section spacing).
          The outer two-column gap-6 stays — that's the boundary
          between major page columns (list vs panel) and gap-6 is
          the canonical for major-section separation. */}
      <div className="flex min-h-0 flex-1 gap-6">
        {/* List column vertical rhythm — 2026-06-04 round 40 (Yuqi
            "更紧一点" / "tighter"): gap between filter row → status
            chips → cards list reduced `gap-3` (12px) → `gap-2`
            (8px). The 12px gap was creating three visually
            separate "sections" inside the list panel; 8px reads
            as a tighter stack of related controls + content. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto [scrollbar-gutter:stable]">
          {alertsQuery.isLoading ? (
            <SkeletonList sources={sourceHealth} />
          ) : isEmpty ? (
            <AlertsAllClearBanner sources={sourceHealth} />
          ) : (
            <>
              {/* 2026-05-25 (Yuqi Alerts #3): dropped the framed
              container around the filter row. The cards below
              already sit on the page surface without a frame —
              wrapping just the filters in a `border + bg + p-3`
              container made them look heavier than the actual
              alert content. Now the filters live inline with the
              page's outer padding, same rhythm as the header
              above and the list below. */}
              {jurisdictionCounts.length === 0 ? null : null}

              {/* 2026-06-04 round 39 (Yuqi 3-item filter-row feedback):
                  filter row restructured into a single dense strip.
                  Order LEFT → RIGHT:
                    1. Search (fixed `w-[260px]`, no longer flex-1).
                    2. Last 24 hours
                    3. Severity
                    4. Change types
                    5. Status
                    6. Source
                    7. State
                    8. Reset (ghost, only when filters active)
                    9. Sort by  (relocated INTO this row).
                  When the panel is open the row now wraps to the same
                  width as the alert list column, instead of preserving
                  the list-only strip width and creating a horizontal
                  scroll offset inside the left pane. The trailing
                  spacer is list-only; in split view it creates a large
                  blank slot between filters. */}
              <div
                className={cn(
                  'flex w-full min-w-0 flex-wrap items-center',
                  panelOpen ? 'gap-1.5' : 'gap-2',
                )}
              >
                {/* Search alerts — Item 3: first item, shorter width */}
                <label className="inline-flex h-10 w-[260px] shrink-0 items-center gap-2 rounded-xl border border-divider-regular bg-background-default px-4 outline-none transition-colors focus-within:ring-2 focus-within:ring-state-accent-active-alt">
                  <SearchIcon className="size-3.5 shrink-0 text-text-muted" aria-hidden />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t`Search alerts`}
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-text-primary outline-none placeholder:text-text-muted"
                    aria-label={t`Search alerts`}
                  />
                </label>

                {/* Last 24 hours — time-range filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <FilterTrigger
                        active={timeRangeFilter !== 'all_time'}
                        leadingIcon={Clock3Icon}
                        aria-label={t`Filter by time range`}
                      >
                        <span>
                          {timeRangeFilter === 'last_24h'
                            ? t`Last 24 hours`
                            : timeRangeFilter === 'last_7d'
                              ? t`Last 7 days`
                              : t`All time`}
                        </span>
                      </FilterTrigger>
                    }
                  />
                  <DropdownMenuContent align="start" className="min-w-[180px]">
                    <DropdownMenuRadioGroup
                      value={timeRangeFilter}
                      onValueChange={(value) => {
                        if (value === 'all_time' || value === 'last_24h' || value === 'last_7d') {
                          setTimeRangeFilter(value)
                        }
                      }}
                    >
                      <DropdownMenuRadioItem value="all_time">
                        <Trans>All time</Trans>
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="last_24h">
                        <Trans>Last 24 hours</Trans>
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="last_7d">
                        <Trans>Last 7 days</Trans>
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Severity — was "All impact" / per-tier label; now
                    uses static label "Severity" + valueLabel counter
                    so the chip reads "Severity / any" or "Severity /
                    high" exactly per Pencil T3GhR iOxIZ. */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <FilterTrigger
                        active={impactFilter !== 'all'}
                        valueLabel={impactFilter === 'all' ? t`any` : impactFilter}
                        aria-label={t`Filter by severity`}
                      >
                        <span>
                          <Trans>Severity</Trans>
                        </span>
                      </FilterTrigger>
                    }
                  />
                  <DropdownMenuContent align="start" className="min-w-[180px]">
                    <DropdownMenuRadioGroup
                      value={impactFilter}
                      onValueChange={(value) => {
                        if (typeof value === 'string' && isAlertImpactFilter(value))
                          setImpactFilter(value)
                      }}
                    >
                      {ALERT_IMPACT_FILTER_OPTIONS.map((option) => (
                        <DropdownMenuRadioItem key={option} value={option}>
                          {impactFilterLabel(option)}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Change types — label/value pattern. */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <FilterTrigger
                        active={changeKindFilter !== 'all'}
                        valueLabel={changeKindFilter === 'all' ? t`all` : changeKindFilter}
                        aria-label={t`Filter by change type`}
                      >
                        <span>
                          <Trans>Change types</Trans>
                        </span>
                      </FilterTrigger>
                    }
                  />
                  <DropdownMenuContent align="start" className="min-w-[180px]">
                    <DropdownMenuRadioGroup
                      value={changeKindFilter}
                      onValueChange={(value) => {
                        if (typeof value === 'string' && isChangeKindFilter(value))
                          setChangeKindFilter(value)
                      }}
                    >
                      {CHANGE_KIND_FILTER_OPTIONS.map((option) => (
                        <DropdownMenuRadioItem key={option} value={option}>
                          {changeKindFilterLabel(option)}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Status dropdown — HISTORY MODE ONLY. 2026-06-05:
                    removed from the active queue (Yuqi — "Status is
                    redundant"): there it overlapped the Severity filter,
                    and "My morning sweep" already forces
                    the "active" status under the hood. History keeps it
                    — its handled-state options (applied / dismissed /
                    reverted / reviewed / snoozed) are the only way to
                    slice the archive. The `statusFilter` state +
                    `effectiveStatusFilter` mechanism stay intact so
                    morning sweep is unaffected. */}
                {historyMode ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <FilterTrigger
                          active={statusFilter !== 'all'}
                          valueLabel={statusFilter === 'all' ? t`all` : statusFilter}
                          aria-label={t`Filter by alert status`}
                        >
                          <span>
                            <Trans>Status</Trans>
                          </span>
                        </FilterTrigger>
                      }
                    />
                    <DropdownMenuContent align="start" className="min-w-[180px]">
                      <DropdownMenuRadioGroup
                        value={statusFilter}
                        onValueChange={(value) => {
                          if (
                            typeof value === 'string' &&
                            isStatusFilter(value, statusFilterOptions)
                          )
                            setStatusFilter(value)
                        }}
                      >
                        {statusFilterOptions.map((option) => (
                          <DropdownMenuRadioItem key={option} value={option}>
                            {statusFilterLabel(option, historyMode)}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}

                {/* Tax area — 2026-06-05: single-select service-line filter
                    (Individual / Business income / Sales & use / Payroll /
                    Franchise / Information). Mirrors the Change types
                    dropdown; keeps alerts whose server-derived `taxAreas`
                    include the pick. Alerts that could not be classified
                    surface only under "all". */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <FilterTrigger
                        active={taxAreaFilter !== 'all'}
                        valueLabel={
                          taxAreaFilter === 'all' ? t`all` : taxAreaFilterLabel(taxAreaFilter)
                        }
                        aria-label={t`Filter by tax area`}
                      >
                        <span>
                          <Trans>Tax area</Trans>
                        </span>
                      </FilterTrigger>
                    }
                  />
                  <DropdownMenuContent align="start" className="min-w-[180px]">
                    <DropdownMenuRadioGroup
                      value={taxAreaFilter}
                      onValueChange={(value) => {
                        if (typeof value === 'string' && isTaxAreaFilter(value))
                          setTaxAreaFilter(value)
                      }}
                    >
                      {TAX_AREA_FILTER_OPTIONS.map((option) => (
                        <DropdownMenuRadioItem key={option} value={option}>
                          {taxAreaFilterLabel(option)}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 2026-06-05 (Yuqi — "all sources filter is too
                    granular"): the agency-level source dropdown
                    (e.g. "CA FTB", "IRS") was removed. State + Federal
                    filtering is fully covered by the "Any state" map
                    below, which keys off `alert.jurisdiction` (incl.
                    the FED tile). Free-text search still matches the
                    source string. */}

                {/* 2026-05-25 (Yuqi /alerts fifth pass — map
                    in dropdown): state-filter map lives behind a
                    Popover trigger instead of being always
                    visible. The trigger sits in the filter row
                    next to the four Selects; its label reflects
                    the active state ("CA · 4 alerts" / "Any
                    state"). Clicking opens the tilegram in a
                    popover panel; clicking a tile applies the
                    filter and closes the popover. */}
                {jurisdictionCounts.length > 0 ? (
                  <StateFilterPopover
                    jurisdictionCounts={jurisdictionCounts}
                    activeState={jurisdictionFilter}
                    onSelect={(code) =>
                      setJurisdictionFilter(jurisdictionFilter === code ? null : code)
                    }
                  />
                ) : null}

                {/* Reset — 2026-06-04 round 42 (Yuqi list-2 #1 —
                    "reset is close to Any state dropdown, not
                    besides sort by. if nothing is selected, reset
                    not shown"). Only mounts when `filtersActive`. */}
                {filtersActive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setImpactFilter('all')
                      setStatusFilter('all')
                      setChangeKindFilter('all')
                      setTaxAreaFilter('all')
                      setJurisdictionFilter(null)
                      setTimeRangeFilter('all_time')
                      setSearchQuery('')
                    }}
                  >
                    <Trans>Reset</Trans>
                  </Button>
                ) : null}

                {/* Round 39: in the full-width list, a flex spacer
                    pushes Sort by to the trailing edge while keeping
                    filter pills left-anchored. In split view the row
                    wraps, so the spacer is omitted to avoid large
                    intra-toolbar gaps. */}
                {panelOpen ? null : <span className="flex-1" aria-hidden />}

                {/* Sort by — 2026-06-04 round 42 (Yuqi #4 — wire
                    real sort logic). Three options matching the
                    sortOrder enum. Current value is shown inline
                    on the trigger so the dropdown reads "Sort by
                    Newest first" / "Sort by Oldest first" / "Sort
                    by Highest impact" without opening. */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <FilterTrigger noLeadingIcon aria-label={t`Sort alerts`}>
                        <span className="text-text-tertiary">
                          <Trans>Sort by</Trans>
                        </span>
                        <span>
                          {sortOrder === 'oldest' ? (
                            <Trans>Oldest first</Trans>
                          ) : sortOrder === 'highest_impact' ? (
                            <Trans>Highest impact</Trans>
                          ) : (
                            <Trans>Newest first</Trans>
                          )}
                        </span>
                      </FilterTrigger>
                    }
                  />
                  <DropdownMenuContent align="end" className="min-w-[200px]">
                    <DropdownMenuRadioGroup
                      value={sortOrder}
                      onValueChange={(value) => {
                        if (
                          value === 'newest' ||
                          value === 'oldest' ||
                          value === 'highest_impact'
                        ) {
                          setSortOrder(value)
                        }
                      }}
                    >
                      <DropdownMenuRadioItem value="newest">
                        <Trans>Newest first</Trans>
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="oldest">
                        <Trans>Oldest first</Trans>
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="highest_impact">
                        <Trans>Highest impact</Trans>
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* 2026-06-04 round 3 (Yuqi feedback "tackle map view"):
                  when viewMode === 'map', render the state heatmap
                  above the alert list. Map tile clicks set the
                  jurisdictionFilter so the list below narrows to
                  the selected state. Per Pencil RMS9y the map
                  body sits at the top of the content area; the
                  alert detail panel (this list) follows below. */}
              {viewMode === 'map' ? (
                <div className="rounded-2xl border border-divider-subtle bg-background-default p-4">
                  <PulseAlertsMap
                    alerts={alerts}
                    selectedJurisdiction={jurisdictionFilter}
                    onSelect={(j) => setJurisdictionFilter(j)}
                  />
                </div>
              ) : null}

              {isFilteredEmpty ? (
                <FilteredEmptyState />
              ) : (
                /* 2026-06-04 round 42 (Yuqi consistency audit
                   follow-up #2 — "the gap between alert card should
                   be smaller. each alert is closer to the next
                   one"): inter-card gap `gap-4` (16px) → `gap-2`
                   (8px). With the cards now using clean white
                   chrome + subtle hover ring, tighter stacking
                   reads as a denser list — same pattern as
                   /deadlines rows. */
                <div className="flex flex-col gap-2">
                  {sortedAlerts.map((alert) => {
                    // 2026-06-04 round 26 (Yuqi Pencil ZkXFr — "Form
                    // Revised" card variant exact recreation):
                    // alerts whose change-kind is `form_instruction`
                    // render through PulseFormRevisedCard, which
                    // surfaces the form-version diff + transition
                    // window + schema-diff link as a structured
                    // facts panel that the generic AlertCard
                    // can't carry. All other change-kinds keep
                    // using the canonical AlertCard.
                    if (alert.changeKind === 'form_instruction') {
                      return (
                        <PulseFormRevisedCard
                          key={alert.id}
                          alert={alert}
                          onReview={() => openDrawerAndCollapseSidebar(alert.id)}
                        />
                      )
                    }
                    return (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        affectedClients={affectedByAlert.get(alert.id) ?? EMPTY_AFFECTED}
                        active={alert.id === openAlertId}
                        compactClients={panelOpen}
                        showReadiness={!historyMode}
                        onReview={() => openDrawerAndCollapseSidebar(alert.id)}
                      />
                    )
                  })}
                </div>
              )}

              {/* 2026-06-05 (Load more): keyset-paginated next page. Shows
                  whenever the server reports another page, regardless of the
                  active client-side filters — same affordance the audit log
                  uses. The active queue polls every 60s, so a refetch reloads
                  all loaded pages consistently (stable publishedAt cursor). */}
              {alertsQuery.hasNextPage ? (
                <div className="flex justify-center pt-1 pb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void alertsQuery.fetchNextPage()}
                    disabled={alertsQuery.isFetchingNextPage}
                    aria-label={t`Load more alerts`}
                  >
                    {alertsQuery.isFetchingNextPage ? (
                      <Trans>Loading…</Trans>
                    ) : (
                      <Trans>Load more</Trans>
                    )}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
        {/* Right column — inline AlertDetailDrawer rendered in
            panel mode. Splits the page when an alert is open;
            closing the panel collapses the wrapper back to a
            single column. */}
        {/* 2026-05-26 (Yuqi forty-fifth pass — close as dissolve,
            not slide-down):
              OPEN: paper rises from below into the open slot
              (~780ms, the "feels deliberate" arrival).
              CLOSE: paper just FADES (opacity 1→0, no y-translation)
              while the slot closes underneath. Quick and quiet —
              reads as the panel "dissolving" rather than mirroring
              the slide-up reverse. */}
        <AnimatePresence initial={false}>
          {panelOpen ? (
            <motion.div
              key="alert-detail-panel"
              initial={{ width: 0 }}
              animate={{
                width: '60%',
                transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] },
              }}
              exit={{
                width: 0,
                transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
              }}
              className="flex min-h-0 shrink-0 self-stretch overflow-hidden"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{
                  y: 0,
                  transition: { duration: 0.64, ease: [0.32, 0.72, 0, 1], delay: 0.14 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] },
                }}
                className="flex h-full w-full min-w-0"
              >
                <AlertDetailDrawer mode="panel" alertId={openAlertId} onClose={closeDrawer} />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Loading shimmer that matches the heartbeat language: warning-tone pulsing
// dot on the lead row, then two ghost rows with mono shimmer bars. No solid
// gray blocks — the page should look like it's listening, not waiting.

// 2026-05-25 (Yuqi /alerts fifth pass — map in dropdown):
// state-filter popover. Trigger sits inline with the other
// filter dropdowns; opens a Popover containing the
// StateTilegram. Trigger label reflects the active filter so
// the row reads as "AZ · 3 alerts" / "Any state" without having
// to open the panel.
function StateFilterPopover({
  jurisdictionCounts,
  activeState,
  onSelect,
}: {
  jurisdictionCounts: Array<[string, number]>
  activeState: string | null
  onSelect: (code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const { t } = useLingui()
  const activeCount = activeState
    ? (jurisdictionCounts.find(([code]) => code === activeState)?.[1] ?? 0)
    : 0
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <FilterTrigger active={Boolean(activeState)} aria-label={t`Filter by state`}>
            {activeState ? (
              <>
                {/* 2026-05-29 (Yuqi /clients round 1 — "remove the state
                    icon everywhere"): SVG StateBadge dropped; the
                    2-letter code with the FilterTrigger's active
                    surface already telegraphs the active filter. */}
                <span className="font-medium">{activeState}</span>
                <span className="tabular-nums text-text-accent/70">
                  <Plural value={activeCount} one="# alert" other="# alerts" />
                </span>
              </>
            ) : (
              <span>
                <Trans>Any state</Trans>
              </span>
            )}
          </FilterTrigger>
        }
      />
      <PopoverContent align="start" alignOffset={0} sideOffset={4} className="w-auto p-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="uppercase tracking-wide text-text-tertiary">
              <Trans>Filter by state</Trans>
            </span>
            {activeState ? (
              <button
                type="button"
                onClick={() => {
                  onSelect(activeState)
                  setOpen(false)
                }}
                className="cursor-pointer rounded-sm text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
              >
                <Trans>Clear</Trans>
              </button>
            ) : null}
          </div>
          <StateTilegram
            counts={new Map(jurisdictionCounts)}
            activeState={activeState}
            onSelect={(code) => {
              onSelect(code)
              setOpen(false)
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function FilteredEmptyState() {
  return (
    <StatusBanner indicator={<PulsingDot tone="disabled" />}>
      <Trans>No alerts match these filters.</Trans>
    </StatusBanner>
  )
}

function impactFilterLabel(filter: AlertImpactFilter): React.ReactNode {
  if (filter === 'all') return <Trans>All impact</Trans>
  if (filter === 'needs_action') return <Trans>Needs action</Trans>
  if (filter === 'needs_review') return <Trans>Needs review</Trans>
  if (filter === 'no_matches') return <Trans>No matches</Trans>
  return <Trans>Closed</Trans>
}

// 2026-05-26 (Yuqi /alerts thirteenth pass): each non-`all`
// filter renders a leading lucide icon — the canonical alert-status
// vocabulary (CircleCheckBig / AlarmClock / Undo2 / FileCheck) is
// duplicated here so the dropdown rows read as "[icon] Label" and
// the active trigger label gets the icon too. Filter values map to
// the real PulseFirmAlertStatus 1:1 except for `active` → `matched`.
const STATUS_FILTER_ICON: Record<AlertStatusFilter, LucideIcon | null> = {
  all: null,
  active: ALERT_STATUS_ICON.matched,
  snoozed: ALERT_STATUS_ICON.snoozed,
  applied: ALERT_STATUS_ICON.applied,
  partially_applied: ALERT_STATUS_ICON.partially_applied,
  reviewed: ALERT_STATUS_ICON.reviewed,
  reverted: ALERT_STATUS_ICON.reverted,
  dismissed: ALERT_STATUS_ICON.dismissed,
}

function statusFilterText(filter: AlertStatusFilter, historyMode: boolean): React.ReactNode {
  if (filter === 'all')
    return historyMode ? <Trans>All handled</Trans> : <Trans>All statuses</Trans>
  if (filter === 'active') return <Trans>Active</Trans>
  if (filter === 'partially_applied') return <Trans>Partially applied</Trans>
  if (filter === 'applied') return <Trans>Applied</Trans>
  if (filter === 'dismissed') return <Trans>Dismissed</Trans>
  if (filter === 'reverted') return <Trans>Reverted</Trans>
  if (filter === 'reviewed') return <Trans>Reviewed</Trans>
  return <Trans>Snoozed</Trans>
}

function statusFilterLabel(filter: AlertStatusFilter, historyMode: boolean): React.ReactNode {
  const Icon = STATUS_FILTER_ICON[filter]
  return (
    <span className="inline-flex items-center gap-2">
      {Icon ? <Icon className="size-3.5 text-text-tertiary" aria-hidden /> : null}
      {statusFilterText(filter, historyMode)}
    </span>
  )
}

// Filter dropdown labels. These name the four collapsed buckets defined by
// `CHANGE_KIND_FILTER_GROUP_MEMBERS`, not the nine underlying kinds — the
// per-card chip (`PulseChangeKindChip`) still names the precise kind.
function changeKindFilterLabel(filter: AlertChangeKindFilter): React.ReactNode {
  if (filter === 'all') return <Trans>All change types</Trans>
  if (filter === 'deadlines') return <Trans>Deadlines</Trans>
  if (filter === 'rules') return <Trans>Rules & forms</Trans>
  if (filter === 'source') return <Trans>Source updates</Trans>
  return <Trans>Other changes</Trans>
}

// Tax-area filter labels — the six service-line buckets (+ "all"). Names the
// derived `taxAreas` values from @duedatehq/core/tax-area; the per-card chips
// still carry the precise form / jurisdiction.
function taxAreaFilterLabel(filter: AlertTaxAreaFilter): React.ReactNode {
  if (filter === 'all') return <Trans>All tax areas</Trans>
  if (filter === 'income_individual') return <Trans>Individual income</Trans>
  if (filter === 'income_business') return <Trans>Business income</Trans>
  if (filter === 'sales_use') return <Trans>Sales & use</Trans>
  if (filter === 'payroll_withholding') return <Trans>Payroll</Trans>
  if (filter === 'franchise') return <Trans>Franchise & fees</Trans>
  return <Trans>Information</Trans>
}

function SkeletonList({ sources }: { sources: readonly PulseSourceHealth[] }) {
  const label = sourceLabel(sources)
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      <span className="sr-only">
        <Trans>Loading alerts…</Trans>
      </span>
      <SkeletonRow tone="warning" active label={<Trans>Checking {label}…</Trans>} />
      <SkeletonRow tone="disabled" />
      <SkeletonRow tone="disabled" />
    </div>
  )
}

function SkeletonRow({
  tone,
  active = false,
  label,
}: {
  tone: 'warning' | 'disabled'
  active?: boolean
  label?: React.ReactNode
}) {
  return (
    <div
      data-skeleton="alert"
      className="flex h-14 items-center gap-3 rounded-md border border-divider-subtle bg-background-default px-3"
    >
      <PulsingDot tone={tone} active={active} />
      {label ? (
        <span className="text-base text-text-tertiary">{label}</span>
      ) : (
        // 2026-06-01: hand-rolled animate-pulse spans replaced with the
        // canonical Skeleton primitive (same bg-state-base-hover-alt
        // pulse). Pill rounding + motion-reduce override added via
        // className to preserve previous behavior; aria-hidden is
        // covered by the parent role=status / aria-live region.
        <>
          <Skeleton aria-hidden className="h-2 w-24 rounded-full motion-reduce:animate-none" />
          <span aria-hidden className="text-text-tertiary">
            ·
          </span>
          <Skeleton
            aria-hidden
            className="h-2 max-w-[280px] flex-1 rounded-full motion-reduce:animate-none"
          />
          <Skeleton
            aria-hidden
            className="ml-auto h-2 w-12 rounded-full motion-reduce:animate-none"
          />
        </>
      )}
    </div>
  )
}

// Named for what it actually renders ("we're watching, all clear") not
// for the EmptyState pattern — this is a status banner, not an empty
// state slot. Now using the shared `StatusBanner` primitive so
// AlertsListPage / ClientFactsWorkspace / Today's AlertsEmptyState
// all share the same dashed-border chrome.
//
// 2026-05-27 (Yuqi header unification pass): copy shortened from
// "All clear. We're watching official federal and state sources
// (101 sources); new matches will appear here." → "All clear. New
// matches will appear here." The "N sources" count is now
// promoted into the page header as a status chip, so repeating it here
// was redundant.
// The `sources` prop is retained on the signature for API
// stability but no longer reads its count.
//
// 2026-05-27 (Yuqi cross-route consistency): inline className lifted
// into the shared `StatusBanner` primitive at
// `apps/app/src/components/patterns/status-banner.tsx`.
function AlertsAllClearBanner({ sources }: { sources: readonly PulseSourceHealth[] }) {
  void sources
  return (
    <StatusBanner indicator={<PulsingDot tone="success" active />}>
      <Trans>All clear. New matches will appear here.</Trans>
    </StatusBanner>
  )
}
