import { useMemo, useState } from 'react'
import { Link } from 'react-router'
// 2026-06-05 (Yuqi post-merge call — "flat list, not Load More"):
// reverted main's keyset-paginated `useInfiniteQuery` back to our
// flat `useQuery` with a 50-item page. Rounds 70-85 + 77 wired
// row-level Snooze / Dismiss via `useMutation` + sonner toast.
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlarmClockIcon,
  AlertCircleIcon,
  CircleCheckIcon,
  Clock3Icon,
  HistoryIcon,
  ListIcon,
  MapIcon,
  MegaphoneIcon,
  SatelliteDishIcon,
  SearchIcon,
  Settings2Icon,
  Undo2Icon,
  XIcon,
  type LucideIcon,
} from 'lucide-react'

import type { PulseAlertPublic, PulseSourceHealth } from '@duedatehq/contracts'
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

import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatRelativeTime } from '@/lib/utils'
import { EmptyState } from '@/components/patterns/empty-state'
import { ShortcutHintChip } from '@/components/patterns/kbd'
import { PageHeader } from '@/components/patterns/page-header'
import { FilterTrigger } from '@/components/patterns/filter-trigger'
import { StatusBanner } from '@/components/patterns/status-banner'

// 2026-06-05 (merge with origin/main): the MorningSweepPanel +
// aiConfidenceTier imports below were added in our rounds 70-85
// (the "My morning sweep" surface). Main didn't have either — so
// the imports stay as HEAD additions on top of main.
import { MorningSweepPanel } from './MorningSweepDialog'

import { useAlertDrawer } from './DrawerProvider'
import { useMorningSweep } from './MorningSweepContext'
import { AlertDetailDrawer } from './AlertDetailDrawer'
import { StateTilegram } from './components/StateTilegram'
import {
  // 2026-06-05 (Yuqi post-merge call — "flat list, not Load More"):
  // reverted to the non-infinite query options. The infinite
  // variants `useAlertsListInfiniteQueryOptions` /
  // `useAlertsHistoryInfiniteQueryOptions` from origin/main are
  // still exported in api.ts; they're just not consumed here.
  // `useAlertsInvalidation` stays for the round 77 row-level
  // Snooze / Dismiss mutations (re-fetches the list on success).
  useAlertsInvalidation,
  useAlertsListQueryOptions,
  useAlertsHistoryQueryOptions,
  useAlertSourceHealthQueryOptions,
  useAlertsAffectedClients,
} from './api'
import { AlertCard } from './components/AlertCard'
import { PulseAlertList } from './components/PulseAlertRow'
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
// 2026-06-05 (pre-CI green-up): `EMPTY_AFFECTED` const had no
// consumer after rounds 70-85 dropped per-card affected-client
// rendering — the batched detail flow returns its own empty array.

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

  // 2026-06-04 round 77 (Yuqi "wire to real"): row-level Snooze +
  // Dismiss buttons in PulseAlertRow flow through `setReasonState`
  // which opens the reason dialog (rendered below) and on confirm
  // fires the corresponding orpc mutation.
  //
  // (Pre-rename naming was `usePulseInvalidation` /
  // `dismissAlertMutation`. Renamed to `useAlertsInvalidation`
  // post directory rename; mutation orpc keys are still
  // `orpc.pulse.*` because the contract namespace is `pulse`.)
  //
  // 2026-06-05 (merge with origin/main): invalidation now resets
  // both infinite queries' first pages — the canonical recovery
  // path after a snooze / dismiss. `closeReasonDialog` retired
  // the inline reason dialog scaffold and kept the direct-fire
  // 24h snooze / no-reason dismiss; the drawer carries the full
  // reason-prompt flow if a CPA wants it.
  type ReasonAction = 'snooze' | 'dismiss'
  const [reasonState, setReasonState] = useState<{
    action: ReasonAction
    alertId: string
  } | null>(null)
  void reasonState // referenced in render
  const invalidateAlerts = useAlertsInvalidation()
  const closeReasonDialog = () => setReasonState(null)
  const dismissAlertMutation = useMutation(
    orpc.pulse.dismiss.mutationOptions({
      onSuccess: () => {
        toast.success(t`Alert dismissed`)
        invalidateAlerts()
        closeReasonDialog()
      },
      onError: (err) => {
        toast.error(t`Couldn't dismiss alert`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const snoozeAlertMutation = useMutation(
    orpc.pulse.snooze.mutationOptions({
      onSuccess: () => {
        toast.success(t`Alert snoozed for 24h`)
        invalidateAlerts()
        closeReasonDialog()
      },
      onError: (err) => {
        toast.error(t`Couldn't snooze alert`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  void dismissAlertMutation
  void snoozeAlertMutation

  // 2026-06-05 (Yuqi post-merge call — "flat list, not Load More"):
  // back to a flat 50-item query per surface. Client-side filters +
  // sort below operate on the loaded set; no pagination chrome.
  const activeAlertsQueryOptions = useAlertsListQueryOptions(50)
  const historyAlertsQueryOptions = useAlertsHistoryQueryOptions(50)
  const alertsQuery = useQuery(historyMode ? historyAlertsQueryOptions : activeAlertsQueryOptions)
  const sourceHealthQuery = useQuery(useAlertSourceHealthQueryOptions())
  const alerts = alertsQuery.data?.alerts ?? EMPTY_ALERTS
  const sourceHealth = sourceHealthQuery.data?.sources ?? EMPTY_SOURCES
  // Batch the affected-client rows for every alert in ONE request and hand each
  // card its slice, instead of every AlertCard firing its own `getDetail`.
  // Keyed off the full (stable) `alerts` set — not `filteredAlerts` — so
  // client-side filter changes don't refetch; cards just look up their id.
  const alertIds = useMemo(() => alerts.map((alert) => alert.id), [alerts])
  // 2026-06-05 (pre-CI green-up): `useAlertsAffectedClients(alertIds)`
  // is invoked for its side effect of seeding the per-alert detail
  // query cache, but the returned map went unused after rounds 70-85
  // moved client-name rendering to the drawer. Keep the hook call
  // — dropping it would lose the prefetch — but don't bind the
  // return value.
  useAlertsAffectedClients(alertIds)
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
          ) : (
            // 2026-06-04 round 56 (Yuqi "where is the filter row?"):
            // earlier this branch was `isEmpty ? <AllClearBanner /> :
            // <>filter row + map + cards</>` — which meant a new firm
            // with no alerts yet saw ONLY the success banner, with no
            // filter row, no view-mode toggle, no source / state
            // dropdowns. The page felt amputated. Filter chrome now
            // ALWAYS renders post-load; the empty banner takes over
            // ONLY the list/map area below it. Same chrome a firm
            // with alerts sees, so the page structure is consistent
            // even at zero data.
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

              {/* 2026-05-25 (Yuqi panel polish — minimal filters):
                  when the panel is open the filter row collapses
                  to a single non-wrapping line that scrolls
                  horizontally if there's overflow. The list
                  column is narrower in split-view (~half width)
                  so wrapping the 4 selects to 2-3 rows would eat
                  most of the visible vertical space above the
                  alerts list. `shrink-0` on each trigger keeps
                  each filter at its natural width inside the
                  scroller. When no panel is open, the row still
                  flex-wraps as before. */}
              {/* 2026-05-26 (Yuqi /rules/pulse third pass #5): when
                  the panel is open, the filter row now WRAPS to a
                  second line instead of scrolling horizontally.
                  Horizontal scroll on a filter strip is a poor
                  affordance — filters that scroll out of view are
                  filters the CPA forgets exist. `flex-wrap` lets
                  the row reflow naturally; the source filter is
                  the narrowest one now (#4) so 3-4 chips usually
                  fit on a single line at 520px+ panel widths. */}
              {/* 2026-05-26 (Yuqi twentieth pass #2): when panel is
                  open the filter row stays on ONE line — `flex-nowrap`
                  + each filter trigger hugs its content (drop the
                  fixed `w-[130px]` widths, fall back to natural
                  width). When panel is closed, return to `flex-wrap`
                  so the row can reflow on narrow viewports. */}
              {/* 2026-06-04 round 57 (Yuqi "who told you"): the
                  round-46 "hide filter row when the detail panel is
                  up" rule was my own inference from a question, not
                  an instruction. Reverted. The filter row now
                  ALWAYS renders post-load — same chrome whether the
                  drawer is open, closed, the user is in map view,
                  or the firm has zero alerts. Predictable page
                  structure beats clever collapse behavior. */}
              {/* 2026-06-04 round 66 (Yuqi "where are the
                  dropdowns?" with screenshot of /alerts showing no
                  filter row): the round-49 `flex-nowrap` +
                  `overflow-hidden` combo was the culprit. With the
                  list column's outer `flex-1 min-h-0 min-w-0
                  overflow-y-auto` parent, the filter row was a
                  fixed-content non-shrinking strip inside a
                  column that could compute a width too narrow for
                  one line — and `overflow-hidden` then CLIPPED the
                  entire row out of view because each flex child
                  carries `shrink-0`, so they all overflowed to the
                  right and got hidden. Two changes:
                    • `flex-nowrap` → `flex-wrap` so the row
                      gracefully reflows to a second line on narrow
                      viewports instead of being silently clipped.
                      The round-49 "should never wrap" rule was for
                      a panel-open scenario; with the filter row
                      ALWAYS visible (round 57) and the panel column
                      now claiming its 60% via motion.div, wrapping
                      is the right fallback.
                    • Drop `overflow-hidden` — was the actual hide.
                  Also added `shrink-0` on the row itself so the
                  vertical-flex parent never compresses its height
                  to zero if the rest of the column tries to
                  expand. */}
              {/* 2026-06-04 round 68 (Yuqi "when the right panel is
                  open, you should collpase those dropdown … or only
                  leave with the search bar"): the filter row now
                  takes a `panelOpen` branch. When the detail panel
                  is up, the column shrinks to ~40% of the viewport
                  and the original row of 5+ dropdowns + view toggle
                  + sort cannot fit on one line without wrapping
                  into a 3-row monster of chrome. So when panelOpen
                  we render ONLY the Search field — every other
                  filter control hides via `hidden`. When the panel
                  closes the full row comes back. Cheap to implement
                  (CSS-only on each control) and 0 state churn
                  versus a full collapse-to-popover redesign. */}
              {/* 2026-06-04 round 71 (Yuqi #15 "should be in one
                  line and responsive. never in two lines"): flex
                  layout flipped from `flex-wrap` → `flex-nowrap`
                  with `overflow-x-auto` so the row always reads as
                  a single line. At viewports too narrow to fit
                  every dropdown, the row scrolls horizontally —
                  responsive without wrapping. Combined with #14
                  (source filter dropped) and #13 ("any" labels
                  shorter), the row fits one line on most viewports
                  ≥1280px without ever needing the scroll.
                  Tradeoff: at very narrow widths the trailing
                  controls (View toggle + Sort) scroll off-screen.
                  Acceptable — those are secondary affordances,
                  and the chrome stays consistent versus the
                  prior wrapping behavior. */}
              <div className="flex shrink-0 flex-nowrap items-center gap-2 overflow-x-auto">
                {/* 2026-06-04 round 39 (Yuqi 3-item filter-row feedback):
                    filter row restructured into a single dense strip.
                    Order LEFT → RIGHT:
                      1. Search (fixed `w-[260px]`, no longer flex-1).
                         Item 3 — "at the front, the first item,
                         shorter width". Search anchors the row.
                      2. Last 24 hours
                      3. Severity
                      4. Change types
                      5. State
                      6. flex-1 spacer
                      7. Sort by  ← Item 2 — relocated INTO this row
                         from the chip+sort row below.
                      8. Reset (ghost)
                    The previous chip+sort wrapper row (with
                    `justify-between`) was removed — Item 1 "remove
                    this". The status chips (Needs Action / Needs
                    Review / Closed) now sit alone on their own
                    row, no Sort-by sibling, no justify-between
                    wrapper. */}

                {/* Search alerts — Item 3: first item, shorter width.
                    2026-06-04 round 66: now the row is `flex-wrap`,
                    we no longer need the round-49 `shrink + min-w-[160px]`
                    compromise that was meant to keep the search field
                    visible while the row clipped — go back to a
                    fixed `w-[260px] shrink-0`. The row reflows on
                    narrow viewports via the parent's flex-wrap. */}
                {/* Search — round 83 #16 ("slightly smaller"):
                    h-10 → h-9 to match the now-shorter
                    FilterTrigger and View-toggle siblings. */}
                <label className="inline-flex h-9 w-[260px] shrink-0 items-center gap-2 rounded-xl border border-divider-regular bg-background-default px-4 outline-none transition-colors focus-within:ring-2 focus-within:ring-state-accent-active-alt">
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

                {/* Round 68: when the detail panel is open, every
                    filter control AFTER the Search hides — see the
                    closing `)}` ~280 lines down. */}
                {panelOpen ? null : (
                  <>
                    {/* Round 83 (Yuqi #8 "order: search, list/map,
                    gap, all time, …"): View mode toggle relocated
                    from after the spacer to RIGHT AFTER the Search
                    field. The flex-1 spacer that used to live
                    above the dropdowns is the "gap" the user
                    referenced — the canonical layout is now
                    Search + ViewToggle (left cluster) ‖ Time +
                    Severity + ChangeType + Status + State + Sort
                    (right cluster). */}
                    <div
                      role="group"
                      aria-label={t`View mode`}
                      className="inline-flex h-9 shrink-0 items-center rounded-xl border border-divider-regular bg-transparent p-0.5"
                    >
                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        aria-pressed={viewMode === 'list'}
                        className={cn(
                          'inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium outline-none transition-colors',
                          'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                          viewMode === 'list'
                            ? 'bg-state-accent-hover text-text-accent'
                            : 'text-text-secondary hover:text-text-primary',
                        )}
                      >
                        <ListIcon className="size-3.5" aria-hidden />
                        <Trans>List</Trans>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('map')}
                        aria-pressed={viewMode === 'map'}
                        className={cn(
                          'inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium outline-none transition-colors',
                          'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                          viewMode === 'map'
                            ? 'bg-state-accent-hover text-text-accent'
                            : 'text-text-secondary hover:text-text-primary',
                        )}
                      >
                        <MapIcon className="size-3.5" aria-hidden />
                        <Trans>Map</Trans>
                      </button>
                    </div>

                    {/* Spacer — pushes the dropdown cluster to the
                    right edge per #8. */}
                    <span className="flex-1" aria-hidden />

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
                            if (
                              value === 'all_time' ||
                              value === 'last_24h' ||
                              value === 'last_7d'
                            ) {
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
                            // 2026-06-04 round 71 (Yuqi #13 "any -
                            // remove"): drop the "any" value-label
                            // when no severity is selected. The chip
                            // now reads "Severity" alone at rest; the
                            // current value renders only when one is
                            // actually picked.
                            // Round 83 (Yuqi #20 "when a filter is
                            // selected, the selected item is showing
                            // the code form - like 'needs_action',
                            // instead of Needs action"): humanize via
                            // `impactFilterLabel`. Same `<Trans>`
                            // labels the dropdown items use.
                            valueLabel={
                              impactFilter === 'all' ? undefined : impactFilterLabel(impactFilter)
                            }
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
                            // Round 83 #20: humanize via changeKindFilterLabel
                            valueLabel={
                              changeKindFilter === 'all'
                                ? undefined
                                : changeKindFilterLabel(changeKindFilter)
                            }
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
                      {/* 2026-06-05 (merge with origin/main): HEAD had a
                      duplicate Status trigger here, leftover from when
                      Status sat in this slot before the historyMode
                      wrapper above moved it. Main introduced the
                      service-line Tax area filter in this slot — the
                      surrounding DropdownMenuContent below already
                      drives `taxAreaFilter`, so this is the correct
                      trigger. Status stays history-only above. */}
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

                    {/* 2026-06-04 round 71 (Yuqi #14 "Filter by source -
                    remove this") + 2026-06-05 (Yuqi — "all sources
                    filter is too granular"): SourceFilterPopover
                    removed from the filter row. The underlying
                    `sourceFilter` state stays (Reset still clears it;
                    the search field still acts as a publisher
                    narrower via free-text on `alert.source`) but the
                    agency-level dropdown chip ("CA FTB", "IRS") is
                    gone — least-used pill, crowded the round 71
                    one-line constraint, and main's State/Federal
                    coverage via the "Any state" map below already
                    keys off `alert.jurisdiction` (incl. the FED tile)
                    for the same narrowing intent. */}

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

                    {/* Round 83 (Yuqi #8 reorder) supersedes round 39's
                    flex-1 spacer + Sort-by-on-the-right pattern: the
                    spacer and View toggle moved to the position
                    immediately after the Search field (round 83
                    `Yuqi #8 …` block above). The trailing edge of
                    the row no longer needs a pusher — the row is
                    `flex-nowrap overflow-x-auto` and Sort sits at
                    the natural right end of the content flow. */}

                    {/* Sort by — 2026-06-04 round 42 (Yuqi #4 — wire
                    real sort logic). Three options matching the
                    sortOrder enum. Current value is shown inline
                    on the trigger so the dropdown reads "Sort by
                    Newest first" / "Sort by Oldest first" / "Sort
                    by Highest impact" without opening. */}
                    {/* Round 83 (Yuqi #18 "sort by button width does
                    not change. Newest, Impact, Affected clients."):
                    fixed `w-[200px]` so the trigger doesn't reflow
                    every time the selection changes (Newest first
                    has 12 chars, Highest impact has 14, etc.).
                    Also short-labels: "Newest", "Impact", "Affected
                    clients" — per Yuqi's spelling. */}
                    {/* Round 84 (Yuqi #2 "Newest align to the left.
                    text align to the left"): dropped
                    `justify-between`. Both "Sort by" and the
                    selected value now stack on the LEFT edge of
                    the fixed 200px chip with the chevron pinned
                    right. */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <FilterTrigger
                            noLeadingIcon
                            aria-label={t`Sort alerts`}
                            className="w-[200px] justify-start text-left"
                          >
                            <span className="text-text-tertiary">
                              <Trans>Sort by</Trans>
                            </span>
                            <span>
                              {sortOrder === 'oldest' ? (
                                <Trans>Oldest</Trans>
                              ) : sortOrder === 'highest_impact' ? (
                                <Trans>Impact</Trans>
                              ) : (
                                <Trans>Newest</Trans>
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

                    {/* Round 42: Reset relocated UP next to
                    StateFilterPopover (see above). No longer sits
                    here. */}
                  </>
                )}
              </div>

              {/* 2026-06-04 round 3 (Yuqi feedback "tackle map view"):
                  when viewMode === 'map', render the state heatmap
                  above the alert list. Map tile clicks set the
                  jurisdictionFilter so the list below narrows to
                  the selected state. Per Pencil RMS9y the map
                  body sits at the top of the content area; the
                  alert detail panel (this list) follows below. */}
              {/* 2026-06-04 round 55 (Yuqi "work on the map view —
                  inspect Pencil RMS9y"): map view restructured to the
                  side-by-side body split Pencil specifies:
                    • LEFT (`MapPh`, ~66% width): map grid in a
                      gray-50 `rounded-2xl` padded panel. Per Pencil
                      `w2IzH` — bg #f9fafb, cornerRadius 14, padding
                      24. Translates to `bg-background-section
                      rounded-2xl p-6`.
                    • RIGHT (`PanelPh`, ~34% width, min-width 360px):
                      compact alert list with an "ACTIVE ALERTS"
                      mono-uppercase label header. Alerts render in
                      compact mode (title + impact + time + state)
                      so each row is ~120px and 4–5 are visible
                      without scrolling.
                  In LIST mode, the original stacked layout is
                  preserved — map UI doesn't render and the full-card
                  list takes the whole content column. The split only
                  activates when the user picks Map view. */}
              <MorningSweepPanel />

              {viewMode === 'map' ? (
                <div className="flex min-h-0 flex-1 gap-6">
                  {/* LEFT: map grid in gray-50 panel */}
                  <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-background-section p-6">
                    <PulseAlertsMap
                      alerts={alerts}
                      selectedJurisdiction={jurisdictionFilter}
                      onSelect={(j) => setJurisdictionFilter(j)}
                    />
                  </div>
                  {/* RIGHT: active alerts panel (compact rows) */}
                  <div className="flex w-[420px] shrink-0 flex-col gap-2 overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-divider-subtle pb-3">
                      <span className="font-mono text-[11px] font-bold tracking-[0.8px] text-text-muted uppercase">
                        <Trans>Active alerts</Trans>
                        <span className="ml-2 tabular-nums">{sortedAlerts.length}</span>
                      </span>
                    </div>
                    {isFilteredEmpty ? (
                      <FilteredEmptyState />
                    ) : (
                      <div className="flex flex-col gap-2">
                        {sortedAlerts.map((alert) => {
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
                              active={alert.id === openAlertId}
                              compactClients
                              showReadiness={false}
                              onReview={() => openDrawerAndCollapseSidebar(alert.id)}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : isEmpty ? (
                // 2026-06-07 (design replication O3s4ie / rR9X1): the genuinely
                // empty alerts surface now owns the area with the prominent
                // empty state (was a one-line status banner). History mode gets
                // its own copy + "what gets recorded" legend.
                <AlertsEmptyState historyMode={historyMode} sources={sourceHealth} />
              ) : isFilteredEmpty ? (
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
                /* 2026-06-04 round 61 (Yuqi Pencil i90PZ — "update
                   alert page to i90PZ. 100% REPLICATED"): list now
                   renders day-grouped `PulseAlertRow` rows per
                   Pencil's day-header (`wlgGV`) + alert-card
                   (`ZkXFr`) stack. The AlertCard (née
                   `PulseAlertCard`) JSX is gone from this branch
                   — kept in the map-view branch above for the
                   side-by-side compact list, and in the imports
                   for /today summary tiles that use a different
                   card primitive. */
                <PulseAlertList
                  alerts={sortedAlerts}
                  openAlertId={openAlertId}
                  onReview={openDrawerAndCollapseSidebar}
                  // 2026-06-04 round 77 (Yuqi "wire to real"):
                  // hover-only Snooze + Dismiss buttons in each
                  // PulseAlertRow route through the same
                  // `setReasonState` flow the existing
                  // AlertCard onSnooze/onDismiss callers
                  // use — reason dialog → mutation → toast.
                  // Round 82 (Yuqi "Alert history actions are
                  // not correct" + "do not defer"): these
                  // handlers are SUPPRESSED in `historyMode`.
                  // History rows are already-handled alerts
                  // (applied/dismissed/snoozed/reverted); they
                  // should not re-snooze or re-dismiss. With
                  // both handlers undefined the row only
                  // renders the Review button (round 77's
                  // conditional `{onSnooze ? … : null}` does
                  // the hiding). Restoring/un-applying an alert
                  // is a drawer-only action because it requires
                  // the reason + audit ledger entry.
                  {...(!historyMode
                    ? {
                        onSnooze: (alertId: string) =>
                          setReasonState({ action: 'snooze', alertId }),
                        onDismiss: (alertId: string) =>
                          setReasonState({ action: 'dismiss', alertId }),
                      }
                    : {})}
                />
              )}

              {/* 2026-06-05 (Yuqi post-merge call — "flat list,
                  not Load More"): main's keyset "Load more" button
                  removed. The 50-item flat page is the surface. */}
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
                {/* Round 83 (Yuqi #8 "state (not any state)" + #20
                    "code form"): trigger label cleaned up. "Any
                    state" → "State" so the at-rest chip reads
                    consistently with the other filter triggers
                    ("Severity" / "Change types" / "Status"). */}
                <Trans>State</Trans>
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
  // 2026-06-04 round 85 (Yuqi follow-up audit): skeleton rebuilt
  // to mirror the round-72+ PulseAlertList chrome — same outer
  // `rounded-[12px] border-divider-regular` frame, a subgroup-style
  // header band on top, then 3 alert-row skeletons that mirror
  // the actual row shape (time rail + main column with meta strip
  // + title + bottom shelf). Previously the loading skeleton was
  // a stack of 56px hairline rows that bore no resemblance to the
  // real rendered rows, so the page visibly "jumped" when alerts
  // arrived.
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col rounded-[12px] border border-divider-regular bg-background-default"
    >
      <span className="sr-only">
        <Trans>Loading alerts…</Trans>
      </span>

      {/* Header band — mirrors the day-group divider tokens */}
      <div className="flex items-center justify-between border-b border-divider-subtle bg-background-subtle px-5 py-2 text-[12px] font-semibold tracking-[0.5px] text-text-tertiary uppercase">
        <span className="inline-flex items-center gap-1.5">
          <PulsingDot tone="warning" active />
          <Trans>Checking {label}…</Trans>
        </span>
        <Skeleton aria-hidden className="h-2 w-20 rounded-full motion-reduce:animate-none" />
      </div>

      <SkeletonAlertRow />
      <SkeletonAlertRow />
      <SkeletonAlertRow />
    </div>
  )
}

function SkeletonAlertRow() {
  return (
    <div
      data-skeleton="alert"
      className="flex gap-[10px] border-b border-divider-subtle px-5 py-3 last:border-b-0"
    >
      {/* Time rail — 100px column matching PulseAlertRow */}
      <div className="flex w-[100px] shrink-0 flex-col gap-1.5">
        <Skeleton aria-hidden className="h-3 w-12 rounded-full motion-reduce:animate-none" />
        <Skeleton aria-hidden className="h-2 w-10 rounded-full motion-reduce:animate-none" />
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Meta strip — severity + state + form chip placeholders */}
        <div className="flex items-center gap-2">
          <Skeleton
            aria-hidden
            className="h-[22px] w-12 rounded-[4px] motion-reduce:animate-none"
          />
          <Skeleton
            aria-hidden
            className="h-[22px] w-14 rounded-[4px] motion-reduce:animate-none"
          />
          <Skeleton
            aria-hidden
            className="h-[22px] w-20 rounded-[5px] motion-reduce:animate-none"
          />
          <span className="flex-1" aria-hidden />
          <Skeleton aria-hidden className="h-3 w-24 rounded-full motion-reduce:animate-none" />
        </div>

        {/* Title row */}
        <Skeleton aria-hidden className="h-4 w-3/4 rounded-full motion-reduce:animate-none" />

        {/* Bottom shelf — clients + conf */}
        <div className="mt-1 flex items-center gap-2 border-t border-divider-subtle pt-2">
          <Skeleton aria-hidden className="h-3 w-24 rounded-full motion-reduce:animate-none" />
          <span className="text-divider-regular" aria-hidden>
            ·
          </span>
          <Skeleton aria-hidden className="h-3 w-14 rounded-full motion-reduce:animate-none" />
        </div>
      </div>
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
// 2026-06-07 (design replication O3s4ie / rR9X1): prominent empty state for the
// genuinely-empty alerts + history surfaces. Replaces the prior one-line
// AlertsAllClearBanner. Active mode derives the freshest source check for the
// sub copy; history mode adds the "what gets recorded" legend.
function AlertsEmptyState({
  historyMode,
  sources,
}: {
  historyMode: boolean
  sources: readonly PulseSourceHealth[]
}) {
  if (historyMode) {
    return (
      <EmptyState
        variant="prominent"
        // Pencil rR9X1: history empty uses the quieter gray icon-circle
        // (72px #f9fafb + #98a2b2 icon) and a 22px title, distinct from the
        // active surface's blue circle. `fill` makes the card own the area.
        iconTone="neutral"
        fill
        icon={HistoryIcon}
        title={<Trans>No history yet</Trans>}
        description={
          <Trans>
            Once you decide on alerts (apply / dismiss / snooze) they'll show up here as an
            immutable record. Last 60 days of activity will appear automatically.
          </Trans>
        }
        cta={
          // Pencil rR9X1: dark filled "Go to alerts" primary (not outline).
          <Button render={<Link to="/alerts" />}>
            <MegaphoneIcon data-icon="inline-start" />
            <Trans>Go to alerts</Trans>
          </Button>
        }
        footer={<AlertsHistoryRecordLegend />}
      />
    )
  }
  const lastChecked = sources.reduce<string | null>((latest, source) => {
    if (!source.lastCheckedAt) return latest
    return !latest || source.lastCheckedAt > latest ? source.lastCheckedAt : latest
  }, null)
  return (
    <EmptyState
      variant="prominent"
      // Pencil O3s4ie: the active empty card owns the whole content area
      // (canvas frame is 600px tall, vertically centered).
      fill
      icon={MegaphoneIcon}
      title={<Trans>No alerts — you're caught up</Trans>}
      description={
        lastChecked ? (
          <Trans>
            When CA FTB, IRS, or another monitored source publishes a change, it will land here.
            Last check: {formatRelativeTime(lastChecked)}.
          </Trans>
        ) : (
          <Trans>
            When CA FTB, IRS, or another monitored source publishes a change, it will land here.
          </Trans>
        )
      }
      cta={
        <Button variant="link" size="sm" render={<Link to="/rules/sources" />}>
          <Settings2Icon data-icon="inline-start" />
          <Trans>Configure sources</Trans>
        </Button>
      }
    />
  )
}

function AlertsHistoryRecordLegend() {
  const items = [
    { key: 'apply', icon: CircleCheckIcon, label: <Trans>Apply</Trans> },
    { key: 'dismiss', icon: XIcon, label: <Trans>Dismiss</Trans> },
    { key: 'snooze', icon: AlarmClockIcon, label: <Trans>Snooze</Trans> },
    { key: 'revert', icon: Undo2Icon, label: <Trans>Revert</Trans> },
  ]
  return (
    // Pencil rR9X1 `Steps`: heading + gray pill row. The EmptyState footer
    // wrapper (gap-6 column + mt-2) already supplies the separation from the
    // CTA above, so no extra padding-top here.
    <div className="flex flex-col items-center gap-2">
      <p className="text-[11px] font-semibold tracking-[0.5px] text-text-muted uppercase">
        <Trans>What gets recorded</Trans>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {items.map(({ key, icon: ChipIcon, label }) => (
          <span
            key={key}
            className="inline-flex items-center gap-1.5 rounded-full bg-background-section px-3 py-1.5 text-xs font-medium text-text-secondary"
          >
            <ChipIcon className="size-3 text-text-secondary" aria-hidden />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
