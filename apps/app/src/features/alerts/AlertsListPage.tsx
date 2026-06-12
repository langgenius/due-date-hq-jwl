import { useMemo, useState } from 'react'
import { Link } from 'react-router'
// Flat `useQuery` with a 50-item page (not a keyset-paginated infinite
// query); row-level Dismiss via `useMutation` + sonner toast.
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircleIcon,
  ArchiveIcon,
  CheckIcon,
  CircleCheckIcon,
  CoffeeIcon,
  FileCheckIcon,
  HistoryIcon,
  ListIcon,
  MapIcon,
  MegaphoneIcon,
  SatelliteDishIcon,
  SlidersHorizontalIcon,
  Undo2Icon,
  XIcon,
  type LucideIcon,
} from 'lucide-react'

import type { PulseAlertPublic, PulseSourceHealth } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@duedatehq/ui/components/ui/popover'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { cn } from '@duedatehq/ui/lib/utils'

import { EASE_APPLE, MOTION_DURATION } from '@/lib/motion'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatRelativeTime } from '@/lib/utils'
import { BulkConfirmDialog, BulkConfirmList } from '@/components/patterns/bulk-confirm-dialog'
import { EmptyState } from '@/components/patterns/empty-state'
import { ShortcutHintChip } from '@/components/patterns/kbd'
import { PageHeader } from '@/components/patterns/page-header'
import { FilterTrigger } from '@/components/patterns/filter-trigger'
import { SearchInput } from '@/components/primitives/search-input'
import { StatusBanner } from '@/components/patterns/status-banner'
import { FloatingActionBar } from '@/components/patterns/floating-action-bar'

import { MorningSweepPanel } from './MorningSweepDialog'

import { useAlertDrawer } from './DrawerProvider'
import { useMorningSweep } from './MorningSweepContext'
import { AlertDetailDrawer } from './AlertDetailDrawer'
import { AlertListRail } from './components/AlertListRail'
import { StateTilegram } from './components/StateTilegram'
import {
  // Non-infinite query options. The infinite variants
  // `useAlertsListInfiniteQueryOptions` /
  // `useAlertsHistoryInfiniteQueryOptions` are still exported in api.ts
  // but not consumed here. `useAlertsInvalidation` backs the row-level
  // Dismiss mutation (re-fetches the list on success).
  useAlertsInvalidation,
  useAlertsListQueryOptions,
  useAlertsHistoryQueryOptions,
  useAlertSourceHealthQueryOptions,
  useAlertsAffectedClients,
  useAlertsPriorityQueueQueryOptions,
} from './api'
import { useAlertPermissions } from './lib/alert-permissions'
import type { AlertPriorityInfo } from './components/PulseAlertRow'
import { PulseAlertList } from './components/PulseAlertRow'
import { PulseAlertsMap } from './components/PulseAlertsMap'
import { ALERT_STATUS_ICON } from './components/AlertStatusBadge'
import { PulsingDot } from './components/PulsingDot'
import {
  matchesAlertImpactFilter,
  ALERT_IMPACT_FILTER_OPTIONS,
  type AlertImpactFilter,
} from './lib/impact-filter'
import { alertImpactCount } from './lib/impact-level'
import { isActiveAlert } from './components/pulse-alert-chrome'
import {
  ACTIVE_STATUS_FILTER_OPTIONS,
  CHANGE_KIND_FILTER_OPTIONS,
  HISTORY_STATUS_FILTER_OPTIONS,
  isStatusFilter,
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

interface AlertsListPageProps {
  embedded?: boolean
  /**
   * When true, the page renders CPA-handled alert history — initial
   * status filter shows all handled statuses, the "View history"
   * cross-link in the header is hidden (we're already on it), and the
   * impact/source filters still work as normal. The dedicated
   * `/alerts/history` route mounts this with `historyMode={true}` so the
   * archive has its own URL + sidebar entry instead of being a
   * soft-filter on the live page.
   */
  historyMode?: boolean
}

// Alerts — source-backed rule-change timeline.
// Uses the same hairline / mono language as the dashboard strip; no oversized
// cards, no chrome shadows.
export function AlertsListPage({ embedded = false, historyMode = false }: AlertsListPageProps) {
  const { t } = useLingui()
  const { openDrawer, alertId: openAlertId, closeDrawer } = useAlertDrawer()
  // Opening an alert auto-collapses the sidebar to icons-only, freeing
  // ~200px for the panel layout on smaller desktops (1280–1440px).
  // This must NOT call `toggleCollapsed()` directly — that writes to
  // localStorage and would permanently flip the user's persistent
  // preference on every click. The auto-collapse should be TRANSIENT
  // (only while the drawer is open) and the user's preference untouched.
  // `AlertDetailDrawer` handles it via `setAutoCollapsed` (see that
  // component), so no wrapper is needed here — just open the drawer.
  const openDrawerAndCollapseSidebar = openDrawer
  const [statusFilter, setStatusFilter] = useState<AlertStatusFilter>('all')
  const [impactFilter, setImpactFilter] = useState<AlertImpactFilter>('all')
  const [changeKindFilter, setChangeKindFilter] = useState<AlertChangeKindFilter>('all')
  // Single-select service-line filter. Each alert carries a derived
  // `taxAreas` array; 'all' shows everything (including alerts the server
  // could not classify into a bucket).
  const [taxAreaFilter, setTaxAreaFilter] = useState<AlertTaxAreaFilter>('all')
  // Time-range filter ("Last 24 hours" / "Last 7 days" / "All time").
  // Default all_time so existing behavior doesn't change for unaware
  // callers. When set to last_24h / last_7d, alerts older than the window
  // are filtered out by `filteredAlerts` below.
  const [timeRangeFilter, setTimeRangeFilter] = useState<'all_time' | 'last_24h' | 'last_7d'>(
    'all_time',
  )
  // Three sort orders.
  //   • 'newest'         — publishedAt DESC (default; matches the
  //                        most recent edit-style scan)
  //   • 'oldest'         — publishedAt ASC  (work-through-backlog
  //                        scan)
  //   • 'highest_impact' — impact level DESC then publishedAt DESC.
  //                        HIGH IMPACT (most affected clients) first
  //                        so the biggest items rise.
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest_impact'>('newest')
  // Inline search field — free-text matches against alert.title +
  // alert.source case-insensitively.
  const [searchQuery, setSearchQuery] = useState('')
  // "My morning sweep" saved view — preset filter combination (Last 24
  // hours + Needs Action status). The toggle lives in the route shell's
  // actions cluster (`alerts.tsx`); its on/off state lives in
  // MorningSweepContext (Provider mounted in `alerts.tsx`). Here we
  // consume it to OVERRIDE the local filter state when the preset is
  // active — the user-facing filter pills reflect what's actually being
  // applied. When the context isn't mounted (e.g. alerts.history) the
  // hook returns null and we fall back to local state untouched.
  const morningSweep = useMorningSweep()
  const effectiveTimeRangeFilter = morningSweep?.active ? 'last_24h' : timeRangeFilter
  const effectiveStatusFilter: AlertStatusFilter = morningSweep?.active ? 'active' : statusFilter
  // State filter — a chip strip (one chip per state with active alerts,
  // count badge, click-to-filter). `null` = no filter active.
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string | null>(null)
  // View toggle between the list view and the state-heatmap. Map mode
  // shows `<PulseAlertsMap>` above the list; clicking a state tile sets
  // the jurisdiction filter.
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  // Toggles the per-row ACTION suggestion line. Default on.
  const [showSuggestedAction, setShowSuggestedAction] = useState(true)
  // The active queue splits alerts into two work queues by actionMode —
  //   • 'active' = `due_date_overlay` alerts (they apply a due-date change →
  //     actionable work).
  //   • 'review' = `review_only` alerts (informational, just need a look).
  // Active-only affordance (history has its own handled-status filter).
  // Review leads the toggle AND is the default queue — reviewing pending
  // changes is the higher-priority action; Active (apply due-date changes)
  // follows.
  const [workQueue, setWorkQueue] = useState<'active' | 'review'>('review')

  // Local selection set of alert ids. Drives the per-row checkboxes, the
  // BulkSelectStrip's tri-state "Select all", and the floating
  // BulkActionBar. Selection is a LIST-mode + active-surface affordance
  // only — history rows are already-handled and the map view has its own
  // compact rows.
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())
  const selectionEnabled = !historyMode && viewMode === 'list'
  // The floating bar's Dismiss routes through the standardized
  // confirmation dialog (BulkConfirmDialog) instead of firing the batch
  // mutation straight away. Dismiss archives N alerts off the active
  // board, so a one-step "are you sure + here's what you're dismissing"
  // preview is the right guard — the same modal family /deadlines +
  // /rules use.
  const [dismissConfirmOpen, setDismissConfirmOpen] = useState(false)

  // The row-level Dismiss button in PulseAlertRow flows through
  // `setReasonState`, which opens the reason dialog (rendered below) and
  // on confirm fires the orpc mutation. Mutation orpc keys are
  // `orpc.pulse.*` because the contract namespace is `pulse`.
  // Per-row Dismiss direct-fires (no-reason dismiss); the drawer carries
  // the full reason-prompt flow if a CPA wants it.
  const invalidateAlerts = useAlertsInvalidation()
  // Single-row Dismiss is reversible from History, so the success toast
  // offers an inline Undo that re-activates the alert via
  // `orpc.pulse.reactivate` — lightweight, non-blocking (no confirm
  // modal, unlike bulk dismiss).
  const reactivateAlertMutation = useMutation(
    orpc.pulse.reactivate.mutationOptions({
      onSuccess: () => {
        toast.success(t`Alert restored`)
        invalidateAlerts()
      },
      onError: (err) => {
        toast.error(t`Couldn't restore alert`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  const dismissAlertMutation = useMutation(
    orpc.pulse.dismiss.mutationOptions({
      onSuccess: (_data, variables) => {
        toast.success(t`Alert dismissed`, {
          action: {
            label: t`Undo`,
            onClick: () => reactivateAlertMutation.mutate({ alertId: variables.alertId }),
          },
        })
        invalidateAlerts()
      },
      onError: (err) => {
        toast.error(t`Couldn't dismiss alert`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  // True batch endpoints — one round-trip + one toast for N selected
  // alerts. The server reports any alerts it couldn't action in
  // `failedIds`.
  const bulkDismissMutation = useMutation(
    orpc.pulse.bulkDismiss.mutationOptions({
      onSuccess: (result) => {
        if (result.failedIds.length > 0) {
          toast.warning(
            t`Dismissed ${result.alerts.length} — ${result.failedIds.length} couldn't be dismissed`,
          )
        } else {
          toast.success(t`Dismissed ${result.alerts.length} alerts`)
        }
        invalidateAlerts()
      },
      onError: (err) => {
        toast.error(t`Couldn't dismiss alerts`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )

  // A flat 50-item query per surface. Client-side filters + sort below
  // operate on the loaded set; no pagination chrome. No origin filter:
  // catch-up rows (origin='catchup', materialized at signup for changes
  // published before the firm joined) render as the SAME cards in the same
  // stream and split into Review/Active with everyone else — they just never
  // count as "new" (splash/brief) and never email, which the backend's origin
  // semantics already guarantee.
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
  // `useAlertsAffectedClients(alertIds)` is invoked for its side effect
  // of seeding the per-alert detail query cache; the returned map is
  // unused (client-name rendering lives in the drawer). Keep the hook
  // call — dropping it would lose the prefetch — but don't bind the
  // return value.
  useAlertsAffectedClients(alertIds)

  // Smart-priority inset data per row comes from the priority queue.
  // Gated on `canViewPriorityQueue` so firms without the permission (and
  // tests that don't mock the endpoint) never fire it. The map keys each
  // alert id to its score + reasons; rows without a queue entry simply
  // hide the inset + the "Why?" pill.
  const permissions = useAlertPermissions()
  const priorityQueueQuery = useQuery(
    useAlertsPriorityQueueQueryOptions(100, permissions.canViewPriorityQueue && !historyMode),
  )
  const priorityById = useMemo(() => {
    const map = new Map<string, AlertPriorityInfo>()
    for (const item of priorityQueueQuery.data?.items ?? []) {
      map.set(item.alert.id, {
        level: item.level,
        score: item.priorityScore,
        reasons: item.priorityReasons,
      })
    }
    return map
  }, [priorityQueueQuery.data])

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
        // Active list splits by work queue. History shows handled alerts of
        // both modes, so the queue split is suppressed there.
        (historyMode || (workQueue === 'active' ? isActiveAlert(alert) : !isActiveAlert(alert))) &&
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
    historyMode,
    impactFilter,
    jurisdictionFilter,
    searchQuery,
    taxAreaFilter,
    workQueue,
  ])
  // Per-queue counts for the segmented toggle labels. Counted off the
  // loaded set so the badge reflects what's available, independent of the
  // other in-list filters.
  const workQueueCounts = useMemo(
    () => ({
      active: alerts.filter((alert) => isActiveAlert(alert)).length,
      review: alerts.filter((alert) => !isActiveAlert(alert)).length,
    }),
    [alerts],
  )
  // The list renderer reads `sortedAlerts` instead of `filteredAlerts` so
  // the Sort by dropdown actually reorders the cards.
  const sortedAlerts = useMemo(() => {
    const next = [...filteredAlerts]
    if (sortOrder === 'oldest') {
      next.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
    } else if (sortOrder === 'highest_impact') {
      // Rank by the actual impacted-client count (matchedCount +
      // needsReviewCount — the same number the "Affects N clients" row line
      // and the High Impact badge use), not the coarse high/med/low tier.
      // Ties broken by recency.
      next.sort((a, b) => {
        const diff = alertImpactCount(b) - alertImpactCount(a)
        if (diff !== 0) return diff
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      })
    } else {
      // 'newest' (default) — publishedAt DESC.
      next.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    }
    return next
  }, [filteredAlerts, sortOrder])

  // The three alerts hitting the most clients, ranked by the same impact
  // count the sort uses. Zero-impact alerts never qualify (an advisory
  // with no matched clients isn't "high impact" just for placing in a
  // short list). Independent of the current sort order so the flag is
  // stable.
  const highImpactIds = useMemo(() => {
    const ranked = filteredAlerts
      .filter((a) => alertImpactCount(a) > 0)
      .toSorted(
        (a, b) =>
          alertImpactCount(b) - alertImpactCount(a) ||
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      )
      .slice(0, 3)
    return new Set(ranked.map((a) => a.id))
  }, [filteredAlerts])
  // Selection is pruned to the currently-loaded alert ids so a filter
  // change that hides a selected row also drops it from the action bar.
  const selectedCount = useMemo(
    () => sortedAlerts.reduce((count, alert) => count + (selectedIds.has(alert.id) ? 1 : 0), 0),
    [sortedAlerts, selectedIds],
  )
  const clearSelection = () => setSelectedIds(new Set())
  const toggleSelected = (alertId: string, next: boolean) => {
    setSelectedIds((current) => {
      const updated = new Set(current)
      if (next) updated.add(alertId)
      else updated.delete(alertId)
      return updated
    })
  }
  const toggleSelectAll = (next: boolean) => {
    setSelectedIds(next ? new Set(sortedAlerts.map((alert) => alert.id)) : new Set())
  }

  // Dismiss calls the batch endpoint (`orpc.pulse.bulkDismiss`) — N
  // selected alerts resolve in one round-trip + one toast, with any
  // un-actionable alerts reported back in `failedIds`. "Apply all"
  // remains unwired: Apply requires per-alert source-verification (the
  // highest-liability path — see AlertDetailDrawer F-041 gate).
  // Opens the confirmation modal instead of dismissing immediately.
  const requestBulkDismiss = () => {
    if (selectedIds.size === 0) return
    setDismissConfirmOpen(true)
  }
  const confirmBulkDismiss = () => {
    if (selectedIds.size === 0) return
    bulkDismissMutation.mutate({ alertIds: [...selectedIds] })
    clearSelection()
  }
  // Alerts currently selected, resolved to their display rows so the
  // confirmation modal can preview titles (capped at 5 + "N more").
  const selectedAlerts = useMemo(
    () => sortedAlerts.filter((alert) => selectedIds.has(alert.id)),
    [sortedAlerts, selectedIds],
  )
  // Protective claim windows whose action deadline closes within 60 days —
  // dismissing one hides the alert but the legal window still shuts, and
  // there is no recovery after it passes. The confirm dialog calls this out
  // by name so a bulk dismiss can't silently bury an unrecoverable deadline.
  const closingSelectedWindows = useMemo(
    () => closingProtectiveWindows(selectedAlerts),
    [selectedAlerts],
  )

  // Single reset handler reused by the toolbar Reset button and the
  // filtered-empty state's "Clear filters" escape hatch — so the empty
  // state always has a way out, not just a dead end.
  const resetFilters = () => {
    // Morning sweep is a preset filter — Reset clears it like any other facet.
    morningSweep?.deactivate()
    setImpactFilter('all')
    setStatusFilter('all')
    setChangeKindFilter('all')
    setTaxAreaFilter('all')
    setJurisdictionFilter(null)
    setTimeRangeFilter('all_time')
    setSearchQuery('')
  }

  const isEmpty = !alertsQuery.isLoading && alerts.length === 0
  const isFilteredEmpty = !alertsQuery.isLoading && alerts.length > 0 && filteredAlerts.length === 0
  const filtersActive =
    (morningSweep?.active ?? false) ||
    impactFilter !== 'all' ||
    statusFilter !== 'all' ||
    changeKindFilter !== 'all' ||
    taxAreaFilter !== 'all' ||
    jurisdictionFilter !== null ||
    timeRangeFilter !== 'all_time' ||
    searchQuery.trim() !== ''

  // When an alert is open, the page splits into a left column (header,
  // filters, alert list) + a right column (the inline alert-detail
  // panel). When no alert is open the page renders as a single column.
  // Mirrors the /deadlines + obligation-drawer pattern. Both routes
  // (history or not) can review an alert in place.
  const panelOpen = openAlertId !== null
  return (
    // When an alert is open, the page becomes a fixed-height (h-full)
    // flex container so the split-column inner can scroll independently
    // inside its own bounds — the page itself no longer scrolls
    // vertically, which avoids a double-scroll (left AND right). When no
    // alert is open the page keeps its natural auto-height (the table
    // below paginates so there's nothing to scroll past anyway).
    <div
      className={
        embedded
          ? // Embedded mount propagates `h-full min-h-0` so the right
            // panel (mode="panel" AlertDetailDrawer) can stretch to fill
            // the parent route shell's height and handle its own internal
            // scroll. Without this the embedded shell collapsed to
            // content-height and the panel only occupied the height of
            // the tallest alert card.
            'flex h-full min-h-0 flex-col gap-6'
          : panelOpen
            ? // Panel-open branch keeps `h-full min-h-0` so the
              // split-column wrapper can manage its own scroll bounds.
              // `max-w-[1440px]` is held in both panel states so the
              // layout doesn't jump left ~80px when an alert is clicked.
              // Height handling stays panel-aware: auto-height when the
              // list stands alone (route shell's natural scroll),
              // fixed-height when the panel is open (split-column owns
              // scroll inside its own bounds, no double-scroll).
              'mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6'
            : // List-only branch holds `max-w-[1440px]` (not 1100px) to
              // eliminate the 80px page-shift on every alert click.
              // List-only at 1440 has extra horizontal whitespace versus
              // 1100 — breathing room around the alert cards, a smaller
              // cost than the constant left-shift jolt.
              'mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6'
      }
    >
      {!embedded ? (
        // The canonical PageHeader primitive. The inline PulsingDot is
        // preserved — it carries the "live signal" semantics specific to
        // Alerts.
        <PageHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Trans>Alerts</Trans>
              {!alertsQuery.isLoading ? (
                // The count chip + the LIVE chip are a matched PAIR: both
                // ride the Badge primitive at `size="lg"` (h-6) so they
                // sit at the exact same height, and both use the quiet
                // `secondary` tint so neither reads as an urgency signal
                // or a tappable button — the difference between them is
                // content, not chrome. (Yuqi #3: "8 active 和 LIVE badge
                // 高度应该一样，但是 style 不一样".)
                <>
                  <Badge variant="secondary" size="lg" className="tabular-nums">
                    {alerts.length === 0 ? (
                      <Trans>0 ongoing</Trans>
                    ) : (
                      <Plural value={alerts.length} one="# ongoing" other="# ongoing" />
                    )}
                  </Badge>
                  {/* LIVE chip — the live-signal semantics that used to
                      ride a bare floating PulsingDot now live INSIDE a
                      matched-height Badge, so the dot keeps its
                      heartbeat-tone meaning while the chip aligns with
                      the count pill beside it. */}
                  <Badge
                    variant="secondary"
                    size="lg"
                    className="gap-1.5 font-semibold tracking-wide uppercase"
                  >
                    <PulsingDot
                      tone={isEmpty ? 'success' : 'warning'}
                      active
                      label={
                        isEmpty
                          ? t`No active alerts right now`
                          : t`Active alerts waiting for review`
                      }
                    />
                    <Trans>Live</Trans>
                  </Badge>
                </>
              ) : null}
            </span>
          }
          description={t`Regulatory alerts that match your practice's clients. Review, batch-apply due-date changes or revisit closed changes.`}
          actions={
            <>
              {/* Shortcut discoverability chip. Alerts have J/K row nav
                  (per AlertsListPage hotkeys) but `?` was
                  undiscoverable. */}
              <ShortcutHintChip className="hidden md:inline-flex" />
              {/* Toggle between List and Map. Map shows
                  `<PulseAlertsMap>` above the list. */}
              <Segmented
                ariaLabel={t`View mode`}
                value={viewMode}
                onValueChange={setViewMode}
                options={[
                  { value: 'list', label: <Trans>List</Trans>, icon: ListIcon },
                  { value: 'map', label: <Trans>Map</Trans>, icon: MapIcon },
                ]}
              />
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
              t`Try again in a moment. If it keeps failing, contact support.`}{' '}
            {/* Canonical `<Button variant="link">` — Dashboard / clients
                / obligations Retry buttons all use this exact shape (it
                carries the focus-visible ring + accent color a
                hand-rolled underline lacks). */}
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

      {/* Split-column wrapper: ALWAYS a row-flex with min-h-0/flex-1, and
          the list column ALWAYS carries its own overflow-y-auto. The
          shell is lockViewport'd at the route level, so the list scrolls
          inside its column whether or not the panel is open, and the
          panel column manages its own internal scroll via the
          AlertDetailDrawer aside — the two columns never scroll together
          as one block (no double-scroll). The gap-6 between major page
          columns is the canonical major-section separation; it collapses
          to 0 when the panel is open (the rail hugs the panel edge). */}
      <div className={cn('flex min-h-0 flex-1', panelOpen ? '' : 'gap-6')}>
        {/* When an alert is open the page becomes the full-page detail
            layout — the left side is the fixed 380px compact alert RAIL
            (its own head / All·Unresolved / search), NOT the full card
            list. The card list stays mounted-but-hidden so its filter and
            scroll state survive closing the detail. */}
        {panelOpen ? (
          // Below lg (1024) the split DISSOLVES: the rail hides and the
          // detail takes the full width — drill-in navigation, with the
          // panel's "Alerts /" breadcrumb as the way back (alerts
          // responsive contract; at 1024 the rigid 380px rail squeezed
          // the detail to 562px, at 768 to an unusable 306px).
          <div className="hidden h-full shrink-0 lg:block">
            <AlertListRail
              alerts={sortedAlerts}
              activeId={openAlertId}
              onSelect={openDrawer}
              onCloseDetail={closeDrawer}
              {...(!historyMode
                ? {
                    workQueue,
                    onWorkQueueChange: setWorkQueue,
                    workQueueCounts,
                  }
                : {})}
            />
          </div>
        ) : null}
        {/* List column vertical rhythm: `gap-2` (8px) between filter row
            → status chips → cards list. A 12px gap created three visually
            separate "sections" inside the list panel; 8px reads as a
            tighter stack of related controls + content. */}
        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto [scrollbar-gutter:stable]',
            panelOpen && 'hidden',
          )}
        >
          {alertsQuery.isLoading ? (
            <SkeletonList sources={sourceHealth} />
          ) : (
            // Filter chrome ALWAYS renders post-load; the empty banner
            // takes over ONLY the list/map area below it. Same chrome a
            // firm with alerts sees, so the page structure is consistent
            // even at zero data (a new firm isn't left with just a banner
            // and no filter row / view-mode toggle / dropdowns).
            <>
              {/* No framed container around the filter row. The cards
              below already sit on the page surface without a frame —
              wrapping just the filters in a `border + bg + p-3` container
              made them look heavier than the actual alert content. The
              filters live inline with the page's outer padding, same
              rhythm as the header above and the list below. */}

              {/* The filter row ALWAYS renders post-load — same chrome
                  whether the drawer is open, closed, the user is in map
                  view, or the firm has zero alerts. `flex-wrap` keeps the
                  row on a single line whenever it fits and only reflows to
                  a second line on narrower viewports, so there is never a
                  horizontal scrollbar (filters that scroll out of view get
                  forgotten); `gap-y-2` spaces the wrapped rows. `shrink-0`
                  on the row keeps the vertical-flex parent from
                  compressing its height to zero. The row is sticky to the
                  top of the scrolling list column so search + filters stay
                  reachable while paging through alerts; `bg-background-inset`
                  (the page wash) + padding keep the cards reading cleanly
                  as they scroll underneath and `z-20` sits above the
                  rows. */}
              <div className="sticky top-0 z-20 flex shrink-0 flex-wrap items-center gap-2 gap-y-2 bg-background-inset pb-3">
                {/* The search field is responsive — 180px on small
                    screens, stepping up to 200 at sm — so the filter
                    cluster keeps more room to stay on one line on narrower
                    viewports. It stays h-9 (36px) to match the
                    FilterTrigger pills + View toggle it shares the toolbar
                    row with, so the cluster stays aligned. Its focus ring
                    is INSET so the surrounding `overflow-y-auto` list
                    column can't clip it (an outset ring-2 was getting
                    cropped at the column's top/left edge). */}
                {/* The primary work-queue switch leads the toolbar on the
                    active list — Active = actionable due-date alerts,
                    Review = review-only. Counts ride in the labels.
                    Suppressed in history (which slices by handled status
                    instead). */}
                {!historyMode ? (
                  <Segmented
                    // `text-base` (14px) across the toolbar controls — the
                    // primitive's 11–12px default read undersized next to
                    // the 14px checkbox label sharing the row (Yuqi #4).
                    className="h-9 shrink-0 [&>button]:h-8 [&>button]:text-base"
                    ariaLabel={t`Alert work queue`}
                    value={workQueue}
                    onValueChange={setWorkQueue}
                    options={[
                      {
                        value: 'review',
                        label: (
                          <span className="inline-flex items-center gap-1.5">
                            <Trans>Review</Trans>
                            <span className="tabular-nums text-text-tertiary">
                              {workQueueCounts.review}
                            </span>
                          </span>
                        ),
                      },
                      {
                        value: 'active',
                        label: (
                          <span className="inline-flex items-center gap-1.5">
                            <Trans>Active</Trans>
                            <span className="tabular-nums text-text-tertiary">
                              {workQueueCounts.active}
                            </span>
                          </span>
                        ),
                      },
                    ]}
                  />
                ) : null}

                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={t`Search alerts`}
                  className="w-[180px] shrink-0 sm:w-[200px]"
                />

                {/* Morning-sweep preset chip — deliberately OUTSIDE the
                    panelOpen gate so the override's exit stays visible when
                    the detail panel or map is open. "Show me" only ever turns
                    the pin on; this chip (plus Reset and any explicit Time
                    choice) is how it turns off. */}
                {morningSweep?.active ? (
                  <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-state-accent-border bg-state-accent-hover px-3 text-base font-medium text-text-accent">
                    <CoffeeIcon className="size-3.5" aria-hidden />
                    <Trans>Morning sweep · last 24h</Trans>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      type="button"
                      onClick={morningSweep.deactivate}
                      aria-label={t`Clear morning sweep`}
                      className="size-5 hover:bg-state-accent-hover-alt"
                    >
                      <XIcon className="size-3" aria-hidden />
                    </Button>
                  </span>
                ) : null}

                {/* When the detail panel is open, every filter control
                    AFTER the Search hides — see the closing `)}` below.

                    Toolbar order (Yuqi batch 3 #1/#8): NARROWING controls
                    lead, left-to-right — [Queue toggle] [Search] [Filters]
                    [State] [Clear] — then the spacer, then the DISPLAY
                    controls flush right — [Suggested action] [Sort] [view
                    icons]. One labeled toggle per row: the List/Map switch
                    is icon-only at the far end so it reads as a view
                    switcher, not a second queue toggle. */}
                {panelOpen ? null : (
                  <>
                    {/* Avoid a greedy `flex-1` spacer between the
                    Search/View cluster and the dropdowns: in a `flex-wrap`
                    row a growing spacer eats the rest of line 1, forcing
                    the whole dropdown cluster onto a second line (and Sort
                    onto a third by itself on narrow viewports). Without
                    it, the controls flow left-to-right and Sort stays
                    adjacent to its sibling filters, wrapping as one
                    group. */}

                    {/* Severity / Change types / Tax area + Time are
                        consolidated into ONE "Filters" popover (each as a
                        labeled pill section); the trigger count includes
                        an active time filter. State and Sort stay separate
                        as their own controls. */}
                    <AlertFiltersPopover
                      timeRangeFilter={effectiveTimeRangeFilter}
                      onTimeRangeChange={(value) => {
                        // The user's explicit time choice takes over from the
                        // sweep preset — the popover never silently no-ops.
                        morningSweep?.deactivate()
                        setTimeRangeFilter(value)
                      }}
                      impactFilter={impactFilter}
                      onImpactChange={setImpactFilter}
                      changeKindFilter={changeKindFilter}
                      onChangeKindChange={setChangeKindFilter}
                      taxAreaFilter={taxAreaFilter}
                      onTaxAreaChange={setTaxAreaFilter}
                    />

                    {/* Status dropdown — HISTORY MODE ONLY. In the active
                    queue it was redundant: it overlapped the Severity
                    filter, and "My morning sweep" already forces the
                    "active" status under the hood. History keeps it — its
                    handled-state options (applied / dismissed / reverted /
                    reviewed) are the only way to slice the archive. The
                    `statusFilter` + `effectiveStatusFilter` mechanism
                    stays intact so morning sweep is unaffected. */}
                    {historyMode ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <FilterTrigger
                              active={statusFilter !== 'all'}
                              valueLabel={statusFilter === 'all' ? t`all` : statusFilter}
                              aria-label={t`Filter by alert status`}
                              className="text-base"
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

                    {/* State-filter map lives behind a Popover trigger
                    instead of being always visible. Its label reflects
                    the active state ("CA · 4 alerts" / "Any state");
                    clicking opens the tilegram and clicking a tile applies
                    the filter and closes the popover. */}
                    {jurisdictionCounts.length > 0 ? (
                      <StateFilterPopover
                        jurisdictionCounts={jurisdictionCounts}
                        activeState={jurisdictionFilter}
                        onSelect={(code) =>
                          setJurisdictionFilter(jurisdictionFilter === code ? null : code)
                        }
                      />
                    ) : null}

                    {/* Clear filters appears ONLY when there's something to
                    clear (Yuqi /alerts #4 "hide clear filters on default") —
                    a permanently-disabled ghost was resting-state clutter. It
                    sits at the END of the narrowing cluster so its appearance
                    never shifts the controls before it. */}
                    {filtersActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetFilters}
                        className="text-base"
                      >
                        <Trans>Clear filters</Trans>
                      </Button>
                    ) : null}

                    {/* Spacer — narrowing cluster left, display cluster
                        right (Yuqi batch 3 #8). */}
                    <span className="hidden flex-1 lg:block" aria-hidden />

                    {/* Display settings — quiet 13px label (Yuqi batch 3
                        #2: 更小), then Sort, then the icon-only view
                        switcher. */}
                    <label className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 px-1 text-sm text-text-secondary select-none">
                      <Checkbox
                        checked={showSuggestedAction}
                        onCheckedChange={(next) => setShowSuggestedAction(next)}
                      />
                      <Trans>Suggested action</Trans>
                    </label>

                    {/* Sort by — three options matching the sortOrder
                    enum. The current value is shown inline on the trigger
                    so the dropdown reads "Sort by Newest" / "Oldest" /
                    "Impact" without opening. Fixed `w-[200px]` so the
                    trigger doesn't reflow every time the selection
                    changes, with the label + value left-aligned and the
                    chevron pinned right. */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <FilterTrigger
                            noLeadingIcon
                            aria-label={t`Sort alerts`}
                            className="w-[200px] justify-start text-left text-base"
                          >
                            <span className="text-text-tertiary">
                              <Trans>Sort by</Trans>
                            </span>
                            {/* `mr-auto` on the value pushes the trailing
                                chevron to the right edge of the
                                fixed-width chip while the label + value
                                stay left-aligned. */}
                            <span className="mr-auto">
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

                    {/* View switcher — icon-only Segmented at the far end.
                        One labeled toggle per toolbar (the queue switch);
                        this one reads as a view affordance, not a second
                        queue (Yuqi batch 3 #1). */}
                    <Segmented
                      className="h-9 shrink-0 [&>button]:h-8"
                      ariaLabel={t`View mode`}
                      value={viewMode}
                      onValueChange={setViewMode}
                      options={[
                        { value: 'list', label: null, icon: ListIcon, ariaLabel: t`List view` },
                        { value: 'map', label: null, icon: MapIcon, ariaLabel: t`Map view` },
                      ]}
                    />
                  </>
                )}
              </div>

              {/* In Map view the content area becomes a side-by-side
                  split:
                    • LEFT (~66% width): the state heatmap in a gray-50
                      `rounded-xl` padded panel. Map tile clicks set the
                      jurisdictionFilter so the list narrows to the
                      selected state.
                    • RIGHT (~34% width): a compact alert list with an
                      "ACTIVE ALERTS" mono-uppercase header; rows render
                      in compact mode so 4–5 are visible without scrolling.
                  In LIST mode the map UI doesn't render and the full-card
                  list takes the whole content column. */}
              <MorningSweepPanel />

              {viewMode === 'map' ? (
                // Below xl (1280) the side-by-side map ‖ 460px list stacks
                // vertically — the fixed rail left the map ~500px at 1024
                // (alerts responsive contract). Map on top, compact list
                // below.
                <div className="flex min-h-0 flex-1 flex-col gap-6 xl:flex-row">
                  {/* TOP/LEFT: map grid in gray-50 panel */}
                  <div className="flex flex-1 flex-col overflow-hidden rounded-xl bg-background-section p-6">
                    <PulseAlertsMap
                      alerts={alerts}
                      selectedJurisdiction={jurisdictionFilter}
                      onSelect={(j) => setJurisdictionFilter(j)}
                    />
                  </div>
                  {/* BOTTOM/RIGHT: active alerts panel (compact rows) */}
                  <div className="flex w-full shrink-0 flex-col gap-2 overflow-y-auto xl:w-[460px]">
                    <div className="flex items-center justify-between border-b border-divider-subtle pb-3">
                      <span className="text-xs font-bold tracking-eyebrow text-text-muted uppercase">
                        <Trans>Active alerts</Trans>
                        <span className="ml-2 tabular-nums">{sortedAlerts.length}</span>
                      </span>
                    </div>
                    {isFilteredEmpty ? (
                      <FilteredEmptyState
                        onClearFilters={resetFilters}
                        sweepActive={morningSweep?.active ?? false}
                      />
                    ) : (
                      // The right rail renders the SAME PulseAlertList
                      // rows as the main list (forced `compact` for the
                      // ~420px width) — one row design across list + map.
                      // Bulk-selection is off here (the map rail is a
                      // navigator, not a bulk surface).
                      <PulseAlertList
                        alerts={sortedAlerts}
                        openAlertId={openAlertId}
                        onReview={openDrawerAndCollapseSidebar}
                        compact
                        showAction={showSuggestedAction}
                        // The map navigator rail renders flat (no date
                        // headers).
                        grouped={false}
                        highImpactIds={highImpactIds}
                        selectable={false}
                        priorityById={priorityById}
                        {...(!historyMode
                          ? {
                              onDismiss: (alertId: string) =>
                                dismissAlertMutation.mutate({ alertId }),
                            }
                          : {})}
                      />
                    )}
                  </div>
                </div>
              ) : isEmpty || (isFilteredEmpty && !filtersActive) ? (
                // The genuinely empty alerts surface owns the area with
                // the prominent empty state. History mode gets its own
                // copy + "what gets recorded" legend. An empty work QUEUE
                // (Active/Review toggle) with no real filters also shows
                // this prominent "you're caught up" state, not the terse
                // "no alerts match these filters" line — that terse
                // filtered state is reserved for when actual filters are
                // narrowing.
                <AlertsEmptyState historyMode={historyMode} sources={sourceHealth} />
              ) : isFilteredEmpty ? (
                <FilteredEmptyState
                  onClearFilters={resetFilters}
                  sweepActive={morningSweep?.active ?? false}
                />
              ) : (
                <PulseAlertList
                  alerts={sortedAlerts}
                  openAlertId={openAlertId}
                  onReview={openDrawerAndCollapseSidebar}
                  showAction={showSuggestedAction}
                  // Day-group headers only make sense chronologically, so
                  // drop them when the list is ordered by impact (a flat
                  // ranked list); every other sort keeps the day bands.
                  grouped={sortOrder !== 'highest_impact'}
                  highImpactIds={highImpactIds}
                  // Bulk-selection + smart-priority insets. Selection is
                  // active-surface + list-view only; priority insets come
                  // from the priority queue.
                  selectable={selectionEnabled}
                  selectedIds={selectedIds}
                  onToggleSelected={toggleSelected}
                  onSelectAll={toggleSelectAll}
                  priorityById={priorityById}
                  // The hover-only Dismiss button in each PulseAlertRow
                  // routes through the dismiss mutation → toast. This
                  // handler is SUPPRESSED in `historyMode`: history rows
                  // are already-handled alerts (applied/dismissed/
                  // reverted) and should not re-dismiss. With the handler
                  // undefined the row only renders the Review button (the
                  // conditional `{onDismiss ? … : null}` does the hiding).
                  // Restoring/un-applying an alert is a drawer-only action
                  // because it requires the reason + audit ledger entry.
                  {...(!historyMode
                    ? {
                        onDismiss: (alertId: string) => dismissAlertMutation.mutate({ alertId }),
                      }
                    : {})}
                />
              )}
            </>
          )}
        </div>
        {/* Right column — inline AlertDetailDrawer rendered in
            panel mode. Splits the page when an alert is open;
            closing the panel collapses the wrapper back to a
            single column. */}
        {/* Close as a dissolve, not a slide-down:
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
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: { duration: MOTION_DURATION.surface, ease: EASE_APPLE },
              }}
              exit={{
                opacity: 0,
                transition: { duration: MOTION_DURATION.exit, ease: EASE_APPLE },
              }}
              // The detail pane FILLS the width left of the fixed 380px
              // rail.
              className="flex min-h-0 min-w-0 flex-1 self-stretch overflow-hidden"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{
                  y: 0,
                  // DELIBERATE motion-grammar outlier (2026-06-11 sweep):
                  // the 0.64s paper-rise is the celebratory arrival, kept
                  // off-scale on purpose (matches the deadline drawer's
                  // DETAIL_PANEL_INNER_RISE_ANIM).
                  transition: { duration: 0.64, ease: EASE_APPLE, delay: 0.14 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: MOTION_DURATION.exit, ease: EASE_APPLE },
                }}
                className="flex h-full w-full min-w-0"
              >
                {(() => {
                  // Thread the sorted-list ordering so the drawer's top
                  // bar can page prev/next + show "N of M". The index is
                  // into the same `sortedAlerts` the list renders, so
                  // paging matches the visible order.
                  const openIndex = sortedAlerts.findIndex((alert) => alert.id === openAlertId)
                  return (
                    <AlertDetailDrawer
                      mode="panel"
                      alertId={openAlertId}
                      onClose={closeDrawer}
                      {...(openIndex >= 0
                        ? {
                            position: { index: openIndex, total: sortedAlerts.length },
                            ...(openIndex > 0
                              ? {
                                  onPrev: () => openDrawer(sortedAlerts[openIndex - 1]!.id),
                                }
                              : {}),
                            ...(openIndex < sortedAlerts.length - 1
                              ? {
                                  onNext: () => openDrawer(sortedAlerts[openIndex + 1]!.id),
                                }
                              : {}),
                          }
                        : {})}
                    />
                  )
                })()}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Floating BulkActionBar (Pencil g5kKJQ `saDv7`) — dark pill
          anchored to the bottom-center of the viewport while one or
          more alerts are selected. "N selected / of M dispatches"
          read-out, then the action cluster. Dismiss is wired to the
          batch mutation; Apply all stays present-but-disabled (bulk
          apply needs per-alert verification). Assign + Export were
          removed — they had no backend and no explanation, so they
          read as dead UI. */}
      {selectionEnabled && selectedCount > 0 ? (
        <BulkActionBar
          selectedCount={selectedCount}
          totalCount={sortedAlerts.length}
          onDismiss={requestBulkDismiss}
          onClear={clearSelection}
        />
      ) : null}

      {/* Bulk dismiss confirmation (Pencil X4t2E — destructive
          pattern). Previews the alerts being archived so the CPA can
          double-check the selection before it leaves the active board. */}
      <BulkConfirmDialog
        open={dismissConfirmOpen}
        onOpenChange={setDismissConfirmOpen}
        tone="destructive"
        icon={ArchiveIcon}
        title={<Trans>Dismiss {selectedCount} alerts?</Trans>}
        description={
          <Trans>
            Dismissed alerts move off the active board into history. Restore them from the History
            tab.
          </Trans>
        }
        confirmLabel={<Trans>Dismiss alerts</Trans>}
        confirmDisabled={bulkDismissMutation.isPending}
        onConfirm={confirmBulkDismiss}
      >
        {closingSelectedWindows.length > 0 ? (
          <ClosingWindowWarning count={closingSelectedWindows.length} />
        ) : null}
        <BulkConfirmList
          label={<Trans>Selected ({selectedCount})</Trans>}
          items={selectedAlerts.map((alert) => ({ id: alert.id, primary: alert.title }))}
        />
      </BulkConfirmDialog>
    </div>
  )
}

// Protective claim windows close for good — a dismissed alert is recoverable
// from history, the missed legal deadline is not.
const CLOSING_WINDOW_HORIZON_MS = 60 * 24 * 60 * 60 * 1000

function closingProtectiveWindows(alerts: readonly PulseAlertPublic[]): PulseAlertPublic[] {
  const horizon = Date.now() + CLOSING_WINDOW_HORIZON_MS
  return alerts.filter(
    (alert) =>
      alert.changeKind === 'protective_claim_window' &&
      alert.actionDeadline !== null &&
      new Date(alert.actionDeadline).getTime() <= horizon,
  )
}

function ClosingWindowWarning({ count }: { count: number }) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon className="size-4" aria-hidden />
      <AlertTitle>
        <Plural
          value={count}
          one="# protective claim window closes within 60 days"
          other="# protective claim windows close within 60 days"
        />
      </AlertTitle>
      <AlertDescription>
        <Trans>
          Dismissing hides the alert, but the filing window still closes — it can't be recovered
          after the deadline passes.
        </Trans>
      </AlertDescription>
    </Alert>
  )
}

// The alerts bulk bar renders through the canonical `<FloatingActionBar>`
// (tone="elevated") — the SAME bottom-center floating command pill
// /deadlines, /rules, and /clients use. The bar keeps its alerts-specific
// content (selection read-out + Dismiss + Clear); only the shell is
// shared. Separators use role="separator" so the primitive's elevated
// styling tints them.
function BulkActionBar({
  selectedCount,
  totalCount,
  onDismiss,
  onClear,
}: {
  selectedCount: number
  totalCount: number
  onDismiss: () => void
  onClear: () => void
}) {
  const { t } = useLingui()
  return (
    <FloatingActionBar tone="elevated" ariaLabel={t`Bulk actions`}>
      {/* Selection read-out */}
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-lg bg-state-accent-solid">
          <CheckIcon className="size-3.5 text-white" aria-hidden />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold">
            <Plural value={selectedCount} one="# selected" other="# selected" />
          </span>
          <span className="text-sm text-text-inverted/60">
            <Trans>of {totalCount} alerts</Trans>
          </span>
        </div>
      </div>

      <span role="separator" className="h-8 w-px shrink-0" aria-hidden />

      {/* Action cluster. There is deliberately no "Apply all" button: a
          true bulk apply needs per-alert source verification (F-041), so
          there is no backend for it — a dead control is worse than its
          absence. Bulk apply happens per-alert from each detail panel;
          the bar keeps only the wired batch action (Dismiss) + Clear. */}
      <div className="flex items-center gap-1.5">
        <Button variant="inverted-ghost" size="sm" onClick={onDismiss}>
          <ArchiveIcon className="size-3.5" aria-hidden />
          <Trans>Dismiss</Trans>
        </Button>
      </div>

      <span role="separator" className="h-8 w-px shrink-0" aria-hidden />

      <Button
        variant="inverted-ghost"
        size="icon-sm"
        onClick={onClear}
        aria-label={t`Clear selection`}
      >
        <XIcon className="size-3.5" aria-hidden />
      </Button>
    </FloatingActionBar>
  )
}

// Loading shimmer that matches the heartbeat language: warning-tone pulsing
// dot on the lead row, then two ghost rows with mono shimmer bars. No solid
// gray blocks — the page should look like it's listening, not waiting.

// State-filter popover. The trigger sits inline with the other filter
// dropdowns and opens a Popover containing the StateTilegram. Its label
// reflects the active filter so the row reads as "AZ · 3 alerts" /
// "State" without having to open the panel.
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
          <FilterTrigger
            active={Boolean(activeState)}
            aria-label={t`Filter by state`}
            className="text-base"
          >
            {activeState ? (
              <>
                {/* No SVG StateBadge — the 2-letter code with the
                    FilterTrigger's active surface already telegraphs the
                    active filter. */}
                <span className="font-medium">{activeState}</span>
                <span className="tabular-nums text-text-accent/70">
                  <Plural value={activeCount} one="# alert" other="# alerts" />
                </span>
              </>
            ) : (
              <span>
                {/* At-rest label is "State" (not "Any state") so the chip
                    reads consistently with the other filter triggers
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
              <TextLink
                variant="accent"
                onClick={() => {
                  onSelect(activeState)
                  setOpen(false)
                }}
              >
                <Trans>Clear</Trans>
              </TextLink>
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

function FilteredEmptyState({
  onClearFilters,
  sweepActive = false,
}: {
  onClearFilters: () => void
  sweepActive?: boolean
}) {
  return (
    <StatusBanner indicator={<PulsingDot tone="disabled" />}>
      {/* Give the dead-end empty state a way out — reuse the toolbar's
          reset handler so filtered-to-nothing isn't a trap. While the
          morning-sweep pin is on, say WHY the list is empty (the 24h window)
          instead of the misleading "you're caught up" hero. */}
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {sweepActive ? (
          <Trans>No alerts in the last 24 hours.</Trans>
        ) : (
          <Trans>No alerts match these filters.</Trans>
        )}
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          {sweepActive ? <Trans>Show all alerts</Trans> : <Trans>Clear filters</Trans>}
        </Button>
      </span>
    </StatusBanner>
  )
}

/**
 * The consolidated filter control. One trigger ("Filters" + a count of
 * active facets) opens a popover with the single-select facets — Severity,
 * Change type, Tax area — each rendered as a labeled pill row, so the
 * filter row reads as Search · List/Map · Filters · State · Sort.
 */
type TimeRangeFilter = 'all_time' | 'last_24h' | 'last_7d'
const TIME_RANGE_FILTER_OPTIONS: readonly TimeRangeFilter[] = ['all_time', 'last_24h', 'last_7d']

function AlertFiltersPopover({
  timeRangeFilter,
  onTimeRangeChange,
  impactFilter,
  onImpactChange,
  changeKindFilter,
  onChangeKindChange,
  taxAreaFilter,
  onTaxAreaChange,
}: {
  timeRangeFilter: TimeRangeFilter
  onTimeRangeChange: (value: TimeRangeFilter) => void
  impactFilter: AlertImpactFilter
  onImpactChange: (value: AlertImpactFilter) => void
  changeKindFilter: AlertChangeKindFilter
  onChangeKindChange: (value: AlertChangeKindFilter) => void
  taxAreaFilter: AlertTaxAreaFilter
  onTaxAreaChange: (value: AlertTaxAreaFilter) => void
}) {
  const { t } = useLingui()
  // The active count includes the time filter so the trigger badge
  // reflects an applied "Last 24h / 7d" too.
  const activeCount =
    (timeRangeFilter !== 'all_time' ? 1 : 0) +
    (impactFilter !== 'all' ? 1 : 0) +
    (changeKindFilter !== 'all' ? 1 : 0) +
    (taxAreaFilter !== 'all' ? 1 : 0)
  return (
    <Popover>
      <PopoverTrigger
        render={
          <FilterTrigger
            active={activeCount > 0}
            // The consolidated Filters entry leads the filter cluster and
            // carries the gray `saved` fill at rest so it reads as a real
            // control, not another quiet pill (Yuqi batch 3 #7: "more
            // obvious"). Active filters switch to the accent wash.
            variant={activeCount > 0 ? 'filter' : 'saved'}
            leadingIcon={SlidersHorizontalIcon}
            valueLabel={activeCount > 0 ? String(activeCount) : undefined}
            aria-label={t`Filters`}
            className="text-base font-medium text-text-primary"
          >
            <span>
              <Trans>Filters</Trans>
            </span>
          </FilterTrigger>
        }
      />
      <PopoverContent align="start" className="w-[264px] p-3">
        <div className="flex flex-col gap-3.5">
          <FilterPillSection
            label={t`Time`}
            value={timeRangeFilter}
            options={TIME_RANGE_FILTER_OPTIONS}
            getLabel={timeRangeFilterLabel}
            onSelect={onTimeRangeChange}
          />
          <FilterPillSection
            label={t`Severity`}
            value={impactFilter}
            options={ALERT_IMPACT_FILTER_OPTIONS}
            getLabel={impactFilterLabel}
            onSelect={onImpactChange}
          />
          <FilterPillSection
            label={t`Change type`}
            value={changeKindFilter}
            options={CHANGE_KIND_FILTER_OPTIONS}
            getLabel={changeKindFilterLabel}
            onSelect={onChangeKindChange}
          />
          <FilterPillSection
            label={t`Tax area`}
            value={taxAreaFilter}
            options={TAX_AREA_FILTER_OPTIONS}
            getLabel={taxAreaFilterLabel}
            onSelect={onTaxAreaChange}
          />
          {activeCount > 0 ? (
            <TextLink
              variant="accent"
              className="self-start"
              onClick={() => {
                onTimeRangeChange('all_time')
                onImpactChange('all')
                onChangeKindChange('all')
                onTaxAreaChange('all')
              }}
            >
              <Trans>Clear these filters</Trans>
            </TextLink>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * One facet inside the Filters popover — an uppercase section label over a
 * wrap of selectable pills (single-select; the active pill takes the accent
 * wash). Generic over the facet's string union so each section reuses its
 * existing option array + humanized label helper.
 */
function FilterPillSection<T extends string>({
  label,
  value,
  options,
  getLabel,
  onSelect,
}: {
  label: string
  value: T
  options: readonly T[]
  getLabel: (option: T) => React.ReactNode
  onSelect: (option: T) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption-xs font-bold tracking-eyebrow-tight text-text-muted uppercase">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => {
          const active = option === value
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              aria-pressed={active}
              className={cn(
                'inline-flex h-7 cursor-pointer items-center rounded-lg border px-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                active
                  ? 'border-state-accent-border bg-state-accent-hover text-text-accent'
                  : 'border-divider-subtle text-text-secondary hover:bg-state-base-hover',
              )}
            >
              {getLabel(option)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function timeRangeFilterLabel(filter: TimeRangeFilter): React.ReactNode {
  if (filter === 'last_24h') return <Trans>Last 24 hours</Trans>
  if (filter === 'last_7d') return <Trans>Last 7 days</Trans>
  return <Trans>Any time</Trans>
}

function impactFilterLabel(filter: AlertImpactFilter): React.ReactNode {
  if (filter === 'all') return <Trans>All impact</Trans>
  if (filter === 'needs_action') return <Trans>Needs action</Trans>
  if (filter === 'needs_review') return <Trans>Needs review</Trans>
  if (filter === 'no_matches') return <Trans>No matches</Trans>
  return <Trans>Closed</Trans>
}

// Each non-`all` filter renders a leading lucide icon — the canonical
// alert-status vocabulary (CircleCheckBig / Undo2 / FileCheck) is
// duplicated here so the dropdown rows read as "[icon] Label" and the
// active trigger label gets the icon too. Filter values map to the real
// PulseFirmAlertStatus 1:1 except for `active` → `matched`.
const STATUS_FILTER_ICON: Record<AlertStatusFilter, LucideIcon | null> = {
  all: null,
  active: ALERT_STATUS_ICON.matched,
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
  return <Trans>Reviewed</Trans>
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
  // The skeleton mirrors the PulseAlertList chrome — same outer
  // `rounded-xl border-divider-regular` frame, a subgroup-style header
  // band on top, then 3 alert-row skeletons that mirror the actual row
  // shape (time rail + main column with meta strip + title + bottom
  // shelf). This keeps the page from visibly "jumping" when alerts
  // arrive.
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col rounded-xl border border-divider-regular bg-background-default"
    >
      <span className="sr-only">
        <Trans>Loading alerts…</Trans>
      </span>

      {/* Header band — mirrors the day-group divider tokens */}
      <div className="flex items-center justify-between border-b border-divider-subtle bg-background-subtle px-5 py-2 text-sm font-semibold tracking-eyebrow-tight text-text-tertiary uppercase">
        <span className="inline-flex items-center gap-1.5">
          <PulsingDot tone="warning" active />
          <Trans>Checking {label}…</Trans>
        </span>
        <Skeleton aria-hidden className="h-2 w-20 rounded-full" />
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
        <Skeleton aria-hidden className="h-3 w-12 rounded-full" />
        <Skeleton aria-hidden className="h-2 w-10 rounded-full" />
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Meta strip — severity + state + form chip placeholders */}
        <div className="flex items-center gap-2">
          <Skeleton aria-hidden className="h-[22px] w-12 rounded" />
          <Skeleton aria-hidden className="h-[22px] w-14 rounded" />
          <Skeleton aria-hidden className="h-[22px] w-20 rounded-sm" />
          <span className="flex-1" aria-hidden />
          <Skeleton aria-hidden className="h-3 w-24 rounded-full" />
        </div>

        {/* Title row */}
        <Skeleton aria-hidden className="h-4 w-3/4 rounded-full" />

        {/* Bottom shelf — clients + conf */}
        <div className="mt-1 flex items-center gap-2 border-t border-divider-subtle pt-2">
          <Skeleton aria-hidden className="h-3 w-24 rounded-full" />
          <span className="text-divider-regular" aria-hidden>
            ·
          </span>
          <Skeleton aria-hidden className="h-3 w-14 rounded-full" />
        </div>
      </div>
    </div>
  )
}

// Prominent empty state for the genuinely-empty alerts + history
// surfaces. Active mode derives the freshest source check for the sub
// copy; history mode adds the "what gets recorded" legend.
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
            Once you decide on alerts (apply / review / dismiss) they'll show up here as an
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
      title={<Trans>No alerts right now</Trans>}
      description={
        lastChecked ? (
          <Trans>
            When IRS, CA FTB, or another monitored source publishes a change, it will land here.
            Last checked {formatRelativeTime(lastChecked)}.
          </Trans>
        ) : (
          <Trans>
            When IRS, CA FTB, or another monitored source publishes a change, it will land here.
          </Trans>
        )
      }
    />
  )
}

function AlertsHistoryRecordLegend() {
  const items = [
    { key: 'apply', icon: CircleCheckIcon, label: <Trans>Apply</Trans> },
    { key: 'review', icon: FileCheckIcon, label: <Trans>Review</Trans> },
    { key: 'dismiss', icon: XIcon, label: <Trans>Dismiss</Trans> },
    { key: 'revert', icon: Undo2Icon, label: <Trans>Revert</Trans> },
  ]
  return (
    // Pencil rR9X1 `Steps`: heading + gray pill row. The EmptyState footer
    // wrapper (gap-6 column + mt-2) already supplies the separation from the
    // CTA above, so no extra padding-top here.
    <div className="flex flex-col items-center gap-2">
      <p className="text-column-label text-text-muted uppercase">
        <Trans>What gets recorded</Trans>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {items.map(({ key, icon: ChipIcon, label }) => (
          <Badge key={key} variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs font-medium">
            <ChipIcon className="size-3 text-text-secondary" aria-hidden />
            {label}
          </Badge>
        ))}
      </div>
    </div>
  )
}
