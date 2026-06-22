import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
// Flat `useQuery` with a 50-item page (not a keyset-paginated infinite
// query); row-level Dismiss via `useMutation` + sonner toast.
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion } from 'motion/react'
import {
  CircleAlertIcon,
  ArchiveIcon,
  CheckIcon,
  ChevronDownIcon,
  CoffeeIcon,
  EyeIcon,
  HistoryIcon,
  ListIcon,
  MapIcon,
  SatelliteDishIcon,
  SlidersHorizontalIcon,
  XIcon,
  ZapIcon,
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

import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { EASE_APPLE, MOTION_DURATION } from '@/lib/motion'
import { orpc } from '@/lib/rpc'
import {
  isInteractiveEventTarget,
  useAppHotkey,
  useKeyboardShortcutsBlocked,
} from '@/components/patterns/keyboard-shell'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatRelativeTime } from '@/lib/utils'
import { BulkConfirmDialog, BulkConfirmList } from '@/components/patterns/bulk-confirm-dialog'
import { EmptyState } from '@/components/patterns/empty-state'
import { ShortcutHintChip } from '@/components/patterns/kbd'
import { PageHeader } from '@/components/patterns/page-header'
import { FilterTrigger } from '@/components/patterns/filter-trigger'
import { SearchInput } from '@/components/primitives/search-input'
import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { ToggleChip } from '@/components/primitives/toggle-chip'
import { StatusBanner } from '@/components/patterns/status-banner'
import {
  FloatingActionBar,
  FLOATING_ACTION_BAR_SCROLL_PADDING,
} from '@/components/patterns/floating-action-bar'

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
  useAlertSourceHealthQueryOptions,
  useAlertsAffectedClients,
  useAlertsPriorityQueueQueryOptions,
} from './api'
import { useAlertPermissions } from './lib/alert-permissions'
import type { AlertPriorityInfo } from './components/PulseAlertRow'
import { PulseAlertList } from './components/PulseAlertRow'
import { PulseAlertsMap } from './components/PulseAlertsMap'
import { PulsingDot } from './components/PulsingDot'
import {
  matchesAlertImpactFilter,
  ALERT_IMPACT_FILTER_OPTIONS,
  type AlertImpactFilter,
} from './lib/impact-filter'
import { alertImpactCount, alertImpactLevel } from './lib/impact-level'
import { alertNeedsAction } from './components/pulse-alert-chrome'
import {
  CHANGE_KIND_FILTER_SELECTABLE,
  matchesChangeKindSelection,
  matchesStatusFilter,
  matchesTaxAreaSelection,
  sourceLabel,
  TAX_AREA_FILTER_SELECTABLE,
  type AlertChangeKindFilterGroup,
  type AlertChangeKindSelection,
  type AlertStatusFilter,
  type AlertTaxAreaSelection,
} from './lib/alert-filters'
import type { TaxArea } from '@duedatehq/contracts'

// Status filters are scoped by surface: the active queue exposes only
// active-workflow states, while history exposes CPA-handled states.
const EMPTY_ALERTS: readonly PulseAlertPublic[] = []
const EMPTY_SOURCES: readonly PulseSourceHealth[] = []

interface AlertsListPageProps {
  embedded?: boolean
}

// Alerts — source-backed rule-change timeline.
// Uses the same hairline / mono language as the dashboard strip; no oversized
// cards, no chrome shadows.
//
// This renders the ACTIVE alert board only. Closed-alert history lives in a
// dedicated component — `/alerts/history` → `AlertHistoryView` — so don't add
// history behavior here (the old `historyMode` branch was excised 2026-06-16).
export function AlertsListPage({ embedded = false }: AlertsListPageProps) {
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
  // Multi-select change-type filter (img-125): the facet is a checkbox
  // popover, so its applied state is an ARRAY of change-kind groups. An empty
  // array = "all" (no narrowing), matching the previous single-select default.
  const [changeKindFilter, setChangeKindFilter] = useState<AlertChangeKindSelection>([])
  // Multi-select service-line filter. Each alert carries a derived
  // `taxAreas` array; an empty selection shows everything (including alerts
  // the server could not classify into a bucket).
  const [taxAreaFilter, setTaxAreaFilter] = useState<AlertTaxAreaSelection>([])
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
  // 2026-06-15 (Yuqi "collapse search into an icon, expand when clicked"): the
  // toolbar search rests as an icon button and expands into the field on click;
  // it stays open while it carries a query and collapses on blur when empty, so
  // the toolbar stays uncluttered.
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
  //
  // A `?queue=active|review` deep-link seeds the initial tab (lazy init, read
  // once on mount) so callers can land the user in a specific queue — e.g.
  // /today's "Alerts" brief pill targets `?queue=review` so it always opens
  // the review queue rather than relying on the unspoken default. Anything
  // other than 'active' falls back to review.
  const [searchParams] = useSearchParams()
  // 2026-06-21 (Yuqi): the Review/Active MODE toggle is gone — the list is a
  // single unified triage view ("Needs action" queue + "For your awareness"
  // digest), see [[project_alerts_triage_model]]. The only optional narrowing
  // left is collapsing the awareness digest into a "focus" view. The legacy
  // `?queue=` deep-link maps onto that: `active` → land focused (digest
  // collapsed); anything else (incl. /today's `?queue=review`) → land with
  // everything open, so no inbound link breaks.
  const [awarenessCollapsed, setAwarenessCollapsed] = useState(
    () => searchParams.get('queue') === 'active',
  )

  // Local selection set of alert ids. Drives the per-row checkboxes, the
  // BulkSelectStrip's tri-state "Select all", and the floating
  // BulkActionBar. Selection is a LIST-mode + active-surface affordance
  // only — history rows are already-handled and the map view has its own
  // compact rows.
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())
  const selectionEnabled = viewMode === 'list'
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
        // Dismiss event — resolve the dismissed alert from the loaded set for
        // its non-PII jurisdiction + impact level. Omit if it isn't found.
        const dismissed = alerts.find((alert) => alert.id === variables.alertId)
        if (dismissed) {
          track(ANALYTICS_EVENTS.alertDismissed, {
            jurisdiction: dismissed.jurisdiction,
            impact_level: alertImpactLevel(dismissed),
          })
        }
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

  // Id of the alert whose single-row dismiss is in flight (or null). Threaded
  // into PulseAlertList so THAT row's Dismiss button disables + spins while the
  // mutation runs — a CPA on a slow link can't double-fire (2026-06-22 audit).
  const dismissingId = dismissAlertMutation.isPending
    ? (dismissAlertMutation.variables?.alertId ?? null)
    : null

  // A flat 50-item query per surface. Client-side filters + sort below
  // operate on the loaded set; no pagination chrome. No origin filter:
  // catch-up rows (origin='catchup', materialized at signup for changes
  // published before the firm joined) render as the SAME cards in the same
  // stream and split into Review/Active with everyone else — they just never
  // count as "new" (splash/brief) and never email, which the backend's origin
  // semantics already guarantee.
  const alertsQuery = useQuery(useAlertsListQueryOptions(50))
  const sourceHealthQuery = useQuery(useAlertSourceHealthQueryOptions())
  const alerts = alertsQuery.data?.alerts ?? EMPTY_ALERTS
  const sourceHealth = sourceHealthQuery.data?.sources ?? EMPTY_SOURCES
  // Failing monitored sources are the one source-health fact worth surfacing in
  // the header — a CPA needs to know if a feed they rely on has gone dark. The
  // healthy/paused ratio stays silent (absence = all-clear, per the list's own
  // grammar). Real data: pulse source-health status (img-151, scoped to errors).
  const sourceErrorCount = sourceHealth.filter(
    (s) => s.healthStatus === 'degraded' || s.healthStatus === 'failing',
  ).length

  // (The open-alert → queue-tab sync effect was removed with the Review/Active
  // toggle — there is no mode to sync; both zones are always visible.)
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
    useAlertsPriorityQueueQueryOptions(100, permissions.canViewPriorityQueue),
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
        // No work-queue split here anymore — the unified list shows every alert
        // that matches the facets/search; the Needs-action / For-your-awareness
        // zones (rendered below) split the result by `isActiveAlert`.
        matchesAlertImpactFilter(alert, impactFilter) &&
        matchesStatusFilter(alert.status, effectiveStatusFilter) &&
        matchesChangeKindSelection(alert.changeKind, changeKindFilter) &&
        matchesTaxAreaSelection(alert.taxAreas, taxAreaFilter) &&
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

  // Two-zone triage split (Yuqi 2026-06-21, [[project_alerts_triage_model]]):
  //   • actionAlerts ("Needs action") = the isActiveAlert set — applies a date
  //     change OR touches clients. A PRIORITY QUEUE: most-impacted first, then
  //     recent, INDEPENDENT of the Sort control (the queue always leads with the
  //     biggest exposure; the urgency pills mark the urgent rows). Errs toward
  //     inclusion so it never hides real work.
  //   • awarenessAlerts ("For your awareness") = the FYI rest — a chronological
  //     DIGEST that keeps the day bands + honours the Sort control.
  // Both derive from `sortedAlerts`, so the active facets/search apply in each.
  const actionAlerts = useMemo(() => {
    const now = Date.now()
    // 2026-06-21 (Yuqi "deadline urgency should outrank reach"): the action zone
    // leads with imminent/overdue DEADLINES, then client reach, then recency. A
    // closing window (e.g. a protective-claim deadline) outranks a higher-reach
    // alert whose filing is months out. Deadlines beyond the 60-day horizon do
    // NOT pull rank — they sort by reach with everyone else — so a far-future
    // filing never jumps ahead of high-impact work.
    const DEADLINE_HORIZON_MS = 60 * 24 * 60 * 60 * 1000
    const deadlineRank = (alert: PulseAlertPublic) => {
      if (!alert.actionDeadline) return Number.POSITIVE_INFINITY
      const ms = new Date(alert.actionDeadline).getTime() - now
      if (ms < 0) return -1 // overdue → most urgent
      return ms <= DEADLINE_HORIZON_MS ? ms : Number.POSITIVE_INFINITY
    }
    return sortedAlerts
      .filter((alert) => alertNeedsAction(alert))
      .toSorted((a, b) => {
        const da = deadlineRank(a)
        const db = deadlineRank(b)
        if (da !== db) return da - db
        const reach = alertImpactCount(b) - alertImpactCount(a)
        if (reach !== 0) return reach
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      })
  }, [sortedAlerts])
  const awarenessAlerts = useMemo(
    () => sortedAlerts.filter((alert) => !alertNeedsAction(alert)),
    [sortedAlerts],
  )
  // The visible top-to-bottom order = action queue, then awareness digest. Drives
  // detail prev/next paging + the rail + the map navigator so every surface pages
  // in the same order the eye reads.
  const triageOrdered = useMemo(
    () => [...actionAlerts, ...awarenessAlerts],
    [actionAlerts, awarenessAlerts],
  )

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
  // "Dismiss all" on the For-your-awareness band — sweeps the FYI digest in one
  // move (the anti-junk-drawer affordance promised by the triage model). Selects
  // every awareness alert, then routes through the SAME bulk-dismiss
  // confirmation as a manual selection, so the CPA still previews what's leaving.
  const dismissAllAwareness = () => {
    if (awarenessAlerts.length === 0) return
    setSelectedIds(new Set(awarenessAlerts.map((alert) => alert.id)))
    setDismissConfirmOpen(true)
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
    setChangeKindFilter([])
    setTaxAreaFilter([])
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
    changeKindFilter.length > 0 ||
    taxAreaFilter.length > 0 ||
    jurisdictionFilter !== null ||
    timeRangeFilter !== 'all_time' ||
    searchQuery.trim() !== ''

  // When an alert is open, the page splits into a left column (header,
  // filters, alert list) + a right column (the inline alert-detail
  // panel). When no alert is open the page renders as a single column.
  // Mirrors the /deadlines + obligation-drawer pattern. Both routes
  // (history or not) can review an alert in place.
  const panelOpen = openAlertId !== null

  // Route keyboard nav (2026-06-22 audit) — /alerts had NO route-scope
  // shortcuts, unlike its peer lists (/deadlines J/K, /rules). The list's
  // "active" alert is the one whose detail panel is open, so J/K step the open
  // selection through `triageOrdered` (the visible action-first order — same list
  // the panel's prev/next arrows page, so keyboard + arrows + the eye all agree).
  // With nothing open, J opens the first alert and K the last — so the keyboard
  // can enter the list cold. Apply (A) / Dismiss (D) keep living on the open
  // detail panel (AlertDetailDrawer's own keydown), so they never collide with
  // these J/K route bindings.
  const shortcutsBlocked = useKeyboardShortcutsBlocked()
  const keyboardEnabled = !embedded && !shortcutsBlocked && triageOrdered.length > 0
  const moveActiveAlert = useCallback(
    (direction: 1 | -1) => {
      if (triageOrdered.length === 0) return
      const currentIndex = triageOrdered.findIndex((alert) => alert.id === openAlertId)
      const nextIndex =
        currentIndex === -1
          ? // Nothing open: J (down) lands on the first row, K (up) on the last.
            direction === 1
            ? 0
            : triageOrdered.length - 1
          : Math.min(triageOrdered.length - 1, Math.max(0, currentIndex + direction))
      const nextId = triageOrdered[nextIndex]?.id
      if (nextId) openDrawerAndCollapseSidebar(nextId)
    },
    [triageOrdered, openAlertId, openDrawerAndCollapseSidebar],
  )
  useAppHotkey(
    'J',
    (event) => {
      if (isInteractiveEventTarget(event.target)) return
      moveActiveAlert(1)
    },
    {
      enabled: keyboardEnabled,
      requireReset: true,
      meta: {
        id: 'alerts.next-alert',
        name: 'Next alert',
        description: 'Open the next alert down the list.',
        category: 'alerts',
        scope: 'route',
      },
    },
  )
  useAppHotkey(
    'K',
    (event) => {
      if (isInteractiveEventTarget(event.target)) return
      moveActiveAlert(-1)
    },
    {
      enabled: keyboardEnabled,
      requireReset: true,
      meta: {
        id: 'alerts.previous-alert',
        name: 'Previous alert',
        description: 'Open the previous alert up the list.',
        category: 'alerts',
        scope: 'route',
      },
    },
  )

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
            // the tallest alert card. (List-only width centering is handled at
            // the route's RulesPageShell `contentClassName`, which caps the
            // title + content together — see routes/alerts.tsx.)
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
              // eliminate the 80px page-shift on every alert click. (Note: the
              // /alerts route mounts this `embedded`, so this branch is the
              // off-route fallback; the centered reading measure for /alerts is
              // handled on the list column itself below.)
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
                    {/* Key the value span on the live count so it REMOUNTS
                        when alerts come/go, re-firing the once-only quiet
                        opacity pulse (`.animate-stat-bump`) — same micro-bump
                        the StatBand numbers use. Opacity-only, no layout shift;
                        the Badge chrome itself stays mounted. */}
                    <span
                      key={alerts.length}
                      className="animate-stat-bump motion-reduce:animate-none"
                    >
                      {alerts.length === 0 ? (
                        <Trans>0 ongoing</Trans>
                      ) : (
                        <Plural value={alerts.length} one="# ongoing" other="# ongoing" />
                      )}
                    </span>
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
                  {/* Source-error chip — only when a monitored source is
                      degraded/failing. Destructive tint + links to /rules/sources
                      so the CPA can act. Silent when all sources are healthy. */}
                  {sourceErrorCount > 0 ? (
                    <Badge
                      variant="destructive"
                      size="lg"
                      className="gap-1 tabular-nums"
                      render={<Link to="/rules/sources" />}
                    >
                      <Plural
                        value={sourceErrorCount}
                        one="# source error"
                        other="# source errors"
                      />
                    </Badge>
                  ) : null}
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
                nativeButton={false}
                render={<Link to="/rules/sources" />}
                aria-label={t`Manage alert sources`}
              >
                <SatelliteDishIcon data-icon="inline-start" />
                <Trans>Sources</Trans>
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link to="/alerts/history" />}
                aria-label={t`View history`}
              >
                <HistoryIcon data-icon="inline-start" />
                <Trans>View history</Trans>
              </Button>
            </>
          }
        />
      ) : null}

      {alertsQuery.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
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
              alerts={triageOrdered}
              activeId={openAlertId}
              onSelect={openDrawer}
              onCloseDetail={closeDrawer}
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
            // Reserve clearance for the floating bulk bar while a selection
            // exists, so the last cards scroll clear of it instead of being
            // occluded (the bar shows on the same condition below).
            selectionEnabled && selectedCount > 0 && FLOATING_ACTION_BAR_SCROLL_PADDING,
            // 2026-06-15 (Yuqi "alert page max width vs deadlines — drop it"):
            // the list fills the shell's wide width (max-w-page-expanded) for
            // parity with /deadlines; no inner reading-measure cap. (Re-confirmed
            // 2026-06-22: the "messy" read is the row internals, not the width.)
            // The rail+detail layout is untouched (panelOpen hides this column).
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
              {/* 2026-06-22 (Yuqi "remove the left/right padding — universal"):
                  the toolbar, zone bands, rows + day bands all share ONE `px-5`
                  content gutter (Yuqi 2026-06-22 "padding on left and right"): the
                  earlier flush-with-title pass had zeroed it, leaving the right
                  cluster jammed against the edge with no gutter. The gutter is back
                  on every list element so the content edge is consistent and padded;
                  the band BGs still bleed full-width, so the bands stay aligned with
                  the title — only the content insets. */}
              <div className="sticky top-0 z-20 flex shrink-0 flex-wrap items-center gap-2 gap-y-2 bg-background-inset px-5 pb-3">
                {/* The search field is responsive — 180px on small
                    screens, stepping up to 200 at sm — so the filter
                    cluster keeps more room to stay on one line on narrower
                    viewports. It stays h-9 (36px) to match the
                    FilterTrigger pills + View toggle it shares the toolbar
                    row with, so the cluster stays aligned. Its focus ring
                    is INSET so the surrounding `overflow-y-auto` list
                    column can't clip it (an outset ring-2 was getting
                    cropped at the column's top/left edge). */}
                {/* 2026-06-21 (Yuqi): both the Review/Active MODE toggle and the
                    "Suggested action" checkbox left the toolbar — the toggle
                    because the list is now a unified triage view (zone bands
                    render below), and the suggested-action toggle moved into the
                    Filters popover's "Display" section (it was orphaned alone on
                    the left). With no reading-controls group left, the finding
                    controls now flow from the LEFT, aligned with the zone bands +
                    rows at `px-5`; the old right-clustering spacer is dropped.
                    See [[project_alerts_triage_model]]. */}

                {/* Permanent search FIELD anchoring the toolbar's LEFT (Yuqi
                    2026-06-22 "stick the filter right, something on the left"): a
                    real input gives the left substance to balance the right-anchored
                    finding-controls cluster — a collapsed magnifier alone left a
                    lone icon against a wide void. `flex-1` lets it fill toward the
                    cluster (capped so it stays a search bar, not a banner). This
                    overrides the hover-collapse search canon HERE: that pattern
                    keeps a CROWDED toolbar tidy, but this toolbar was too empty. */}
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={t`Filter alerts`}
                  ariaLabel={t`Filter alerts`}
                  className="min-w-0 flex-1 sm:max-w-[420px]"
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

                    Toolbar order (Yuqi /alerts #3, 2026-06-12): READING
                    controls left — [Queue toggle] [Suggested action] —
                    they decide what the rows ARE; then the spacer, then
                    the FINDING controls clustered right — [Search]
                    [Filters] [State] [Clear] [Sort] [view icons]. One
                    labeled toggle per row: the List/Map switch is
                    icon-only at the far end so it reads as a view
                    switcher, not a second queue toggle. */}
                {panelOpen ? null : (
                  // 2026-06-22 (Yuqi "the filter is too loose — does not align or
                  // stick to anything; stick it to the right, something on the
                  // left"): the finding controls cluster on the RIGHT as one group
                  // (`ml-auto`), with the search anchoring the LEFT — so the toolbar
                  // spans its width between two anchors instead of the filters
                  // floating left-of-center with a lone view toggle far right.
                  // Reverses the 2026-06-21 "controls flow from the left" call.
                  // `ml-auto` on the wrapper (not a greedy `flex-1` spacer) keeps
                  // flex-wrap clean: on narrow viewports the whole group drops to a
                  // second line under the search instead of fragmenting.
                  <div className="ml-auto flex flex-wrap items-center gap-2">
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
                      onImpactChange={(value) => {
                        setImpactFilter(value)
                        // Filter-change event — `impact` is the new impact
                        // facet, `status` the active status scope in effect
                        // (the active board's status is driven by the work
                        // queue / sweep preset; both are non-PII enums).
                        track(ANALYTICS_EVENTS.alertsFiltered, {
                          impact: value,
                          status: effectiveStatusFilter,
                        })
                      }}
                      changeKindFilter={changeKindFilter}
                      onChangeKindChange={setChangeKindFilter}
                      taxAreaFilter={taxAreaFilter}
                      onTaxAreaChange={setTaxAreaFilter}
                      showSuggestedAction={showSuggestedAction}
                      onShowSuggestedActionChange={setShowSuggestedAction}
                    />

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
                    <AnimatePresence initial={false}>
                      {filtersActive ? (
                        <motion.div
                          key="clear-filters"
                          className="inline-flex shrink-0 overflow-hidden"
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetFilters}
                            className="text-base"
                          >
                            <Trans>Clear filters</Trans>
                          </Button>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    {/* Sort by — three options matching the sortOrder
                    enum. The current value rides the FilterTrigger's
                    canonical `Label │ Value ⌄` slot (Stripe two-tone pill,
                    2026-06-12) so the trigger reads "Sort by │ Newest"
                    without opening, in the same grammar as Filters/State. */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <FilterTrigger
                            noLeadingIcon
                            aria-label={t`Sort alerts`}
                            className="text-base"
                            valueLabel={
                              // 2026-06-21 (Yuqi /alerts #3 "fixed width
                              // button"): the value sits in a fixed-min-width,
                              // left-aligned slot so the trigger doesn't resize
                              // when the sort flips Newest↔Oldest↔Impact — the
                              // differing glyph widths used to nudge the
                              // view-mode toggle beside it on every change.
                              <span className="inline-block min-w-[3.5rem] text-left">
                                {sortOrder === 'oldest' ? (
                                  <Trans>Oldest</Trans>
                                ) : sortOrder === 'highest_impact' ? (
                                  <Trans>Impact</Trans>
                                ) : (
                                  <Trans>Newest</Trans>
                                )}
                              </span>
                            }
                          >
                            <span>
                              <Trans>Sort by</Trans>
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

                    {/* View switcher — icon-only Segmented, last in the right-side
                        finding-controls group (the group's `ml-auto` does the
                        right-anchoring now, so no per-control push here). */}
                    <Segmented
                      size="lg"
                      className="shrink-0"
                      ariaLabel={t`View mode`}
                      value={viewMode}
                      onValueChange={setViewMode}
                      options={[
                        { value: 'list', label: null, icon: ListIcon, ariaLabel: t`List view` },
                        { value: 'map', label: null, icon: MapIcon, ariaLabel: t`Map view` },
                      ]}
                    />
                  </div>
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
                      {/* 2026-06-21 (Yuqi /alerts #4): "Active alerts" collided
                          with the Active work-queue tab — the count here is just
                          the alerts currently shown (Review or Active), so the
                          label read "ACTIVE ALERTS 5" while sitting on the Review
                          queue. Neutralized to "Alerts". */}
                      <CapsFieldLabel as="span" variant="group" className="text-text-tertiary">
                        <Trans>Alerts</Trans>
                        <span className="ml-2 tabular-nums">{triageOrdered.length}</span>
                      </CapsFieldLabel>
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
                        // Action-first order (Yuqi 2026-06-21): the map navigator
                        // leads with what needs action, then the FYI digest.
                        alerts={triageOrdered}
                        openAlertId={openAlertId}
                        onReview={openDrawerAndCollapseSidebar}
                        compact
                        showAction={showSuggestedAction}
                        // The map navigator rail renders flat (no date
                        // headers).
                        grouped={false}
                        selectable={false}
                        priorityById={priorityById}
                        onDismiss={(alertId: string) => dismissAlertMutation.mutate({ alertId })}
                        dismissingId={dismissingId}
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
                <AlertsEmptyState sources={sourceHealth} />
              ) : isFilteredEmpty ? (
                <FilteredEmptyState
                  onClearFilters={resetFilters}
                  sweepActive={morningSweep?.active ?? false}
                />
              ) : (
                // Unified two-zone triage list (Yuqi 2026-06-21,
                // [[project_alerts_triage_model]]): the "Needs action" priority
                // queue leads at full weight; the collapsible "For your awareness"
                // digest follows, demoted. No mode toggle — you read everything by
                // default. 2026-06-22 (Yuqi "serious problem with sections — so
                // loose"): zones butt together (gap-0) so the banded section headers
                // + flush rows read as ONE continuous table, not two floating cards.
                <div className="flex flex-col">
                  {/* NEEDS ACTION — the priority queue. Always rendered (even at
                      zero) so the "you're caught up" beat has a home. */}
                  <section className="group/zone flex flex-col">
                    {/* Sticky (top-12, below the toolbar) so "Needs action" stays
                        pinned while you scroll a long queue. 2026-06-22 (Yuqi "put
                        the zone titles into header design with a background"): the
                        zone header is now a banded section header — the same
                        `bg-background-subtle` + `border-b` chrome as the day bands —
                        so it reads as a structural table header, not floating text,
                        and the opaque band occludes rows scrolling underneath. */}
                    <div className="sticky top-12 z-10 flex items-center gap-2.5 border-b border-state-warning-hover-alt bg-state-warning-hover px-5 py-2">
                      {/* Zone-level select-all (the action zone is flat, so it has
                          no per-day band to host one). Hover-revealed like the row
                          checkboxes unless a selection is already underway. */}
                      {selectionEnabled && actionAlerts.length > 0 ? (
                        <Checkbox
                          checked={actionAlerts.every((a) => selectedIds.has(a.id))}
                          indeterminate={
                            actionAlerts.some((a) => selectedIds.has(a.id)) &&
                            !actionAlerts.every((a) => selectedIds.has(a.id))
                          }
                          onCheckedChange={(next) => {
                            for (const a of actionAlerts) toggleSelected(a.id, next)
                          }}
                          aria-label={t`Select all alerts that need action`}
                          className={cn(
                            'size-[18px] rounded transition-opacity',
                            selectedCount > 0
                              ? 'opacity-100'
                              : 'opacity-0 group-hover/zone:opacity-100 focus-visible:opacity-100',
                          )}
                        />
                      ) : null}
                      {/* Sibling zone header skeleton — icon badge · label · count ·
                          purpose line — shared with "For your awareness". The action
                          zone wears a WARNING band (amber `bg-state-warning-hover`):
                          the urgent queue gets the page's one chromatic section
                          header — which separates it from the awareness zone (neutral
                          gray) and the day subgroups (white) — at amber, not red.
                          2026-06-22 design-critique: red read as chronic-alarm and
                          competed with the row HIGH chips; amber keeps the section
                          prominent while red stays reserved for true urgency (canon).
                          Badge = solid amber + inverted icon (the strong accent),
                          count = white chip / amber text, label = primary ink
                          (chromatic accent lives in containers, not text). */}
                      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-state-warning-solid text-text-inverted">
                        <ZapIcon className="size-3.5" aria-hidden />
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-text-primary">
                            <Trans>Needs action</Trans>
                          </span>
                          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background-default px-1.5 text-xs font-medium tabular-nums text-text-warning">
                            {actionAlerts.length}
                          </span>
                        </div>
                        <span className="text-xs text-text-secondary">
                          <Trans>Review and apply to affected clients</Trans>
                        </span>
                      </div>
                    </div>
                    {actionAlerts.length > 0 ? (
                      <PulseAlertList
                        alerts={actionAlerts}
                        openAlertId={openAlertId}
                        onReview={openDrawerAndCollapseSidebar}
                        showAction={showSuggestedAction}
                        // The action zone is a flat priority queue (most-impacted
                        // first); day bands belong to the chronological digest.
                        grouped={false}
                        selectable={selectionEnabled}
                        selectedIds={selectedIds}
                        onToggleSelected={toggleSelected}
                        onSelectAll={toggleSelectAll}
                        priorityById={priorityById}
                        onDismiss={(alertId: string) => dismissAlertMutation.mutate({ alertId })}
                        dismissingId={dismissingId}
                      />
                    ) : (
                      // The queue drained. The awareness digest still shows below,
                      // so the page is never blank — just calm.
                      <div className="flex items-center gap-2 bg-background-default px-5 py-4 text-sm text-text-secondary">
                        <CheckIcon className="size-4 shrink-0 text-text-success" aria-hidden />
                        <Trans>You're caught up — nothing needs action right now.</Trans>
                      </div>
                    )}
                  </section>

                  {/* FOR YOUR AWARENESS — the chronological digest. Demoted +
                      collapsible (the optional "focus" that replaces the old
                      toggle); keeps the day bands. Hidden entirely when empty. */}
                  {awarenessAlerts.length > 0 ? (
                    <section className="flex flex-col">
                      {/* Band = the collapse toggle (left, flex-1, hover tint so
                          it reads as the interactive section header it is) + a
                          hover-revealed "Dismiss all" sweep (right) so the FYI
                          digest can be cleared in one move (the anti-junk-drawer
                          affordance). Sibling buttons — no nested interactives. */}
                      <div className="group/awareband flex items-center gap-2 border-b border-divider-subtle bg-background-subtle px-5 py-2">
                        <button
                          type="button"
                          onClick={() => setAwarenessCollapsed((collapsed) => !collapsed)}
                          aria-expanded={!awarenessCollapsed}
                          className="flex flex-1 cursor-pointer items-center gap-2 py-1 pr-2 text-left outline-none transition-colors hover:opacity-80 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                        >
                          <ChevronDownIcon
                            className={cn(
                              'size-4 shrink-0 text-text-tertiary transition-transform',
                              awarenessCollapsed && '-rotate-90',
                            )}
                            aria-hidden
                          />
                          {/* Same badge skeleton as "Needs action", neutral-toned —
                              temperature is the only difference, so the two headers
                              read as siblings (one feed, two response tiers). On the
                              gray header band the fill flips to white
                              (`bg-background-default`) so the square stays a crisp
                              filled tile against the band (the warm action badge
                              reads the same way on its band). */}
                          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-background-default text-text-tertiary">
                            <EyeIcon className="size-3.5" aria-hidden />
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-text-secondary">
                                <Trans>For your awareness</Trans>
                              </span>
                              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background-section px-1.5 text-xs font-medium tabular-nums text-text-secondary">
                                {awarenessAlerts.length}
                              </span>
                            </div>
                            <span className="text-xs text-text-tertiary">
                              <Trans>No action needed — monitored updates</Trans>
                            </span>
                          </div>
                        </button>
                        {/* Dismiss-all sweeps the whole FYI digest through the
                            same confirm dialog as a manual selection. List-view
                            only (the bulk flow is selection-backed). */}
                        {selectionEnabled ? (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={dismissAllAwareness}
                            className="shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover/awareband:opacity-100 hover:text-text-secondary focus-visible:opacity-100"
                          >
                            <ArchiveIcon data-icon="inline-start" />
                            <Trans>Dismiss all</Trans>
                          </Button>
                        ) : null}
                      </div>
                      {!awarenessCollapsed ? (
                        <PulseAlertList
                          alerts={awarenessAlerts}
                          openAlertId={openAlertId}
                          onReview={openDrawerAndCollapseSidebar}
                          // FYI rows carry no "do this next" line and render a
                          // step quieter than the action queue (Yuqi: demote).
                          showAction={false}
                          muted
                          grouped={sortOrder !== 'highest_impact'}
                          selectable={selectionEnabled}
                          selectedIds={selectedIds}
                          onToggleSelected={toggleSelected}
                          onSelectAll={toggleSelectAll}
                          priorityById={priorityById}
                          onDismiss={(alertId: string) => dismissAlertMutation.mutate({ alertId })}
                          dismissingId={dismissingId}
                        />
                      ) : null}
                    </section>
                  ) : null}
                </div>
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
                  // Thread the visible triage order (action queue, then awareness
                  // digest) so the drawer's top bar pages prev/next + shows "N of
                  // M" in the SAME order the eye reads the list.
                  const openIndex = triageOrdered.findIndex((alert) => alert.id === openAlertId)
                  return (
                    <AlertDetailDrawer
                      mode="panel"
                      alertId={openAlertId}
                      onClose={closeDrawer}
                      {...(openIndex >= 0
                        ? {
                            position: { index: openIndex, total: triageOrdered.length },
                            ...(openIndex > 0
                              ? {
                                  onPrev: () => openDrawer(triageOrdered[openIndex - 1]!.id),
                                }
                              : {}),
                            ...(openIndex < triageOrdered.length - 1
                              ? {
                                  onNext: () => openDrawer(triageOrdered[openIndex + 1]!.id),
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
      {/* Hidden while a detail panel is open (`openAlertId`): the floating bar
          sits bottom-center and would collide with the detail's own docking
          decision footer. Bulk actions are a list-level operation; the selection
          is preserved and the bar reappears when the detail closes. */}
      <AnimatePresence>
        {selectionEnabled && selectedCount > 0 && openAlertId === null ? (
          // The motion.div owns the fixed centering (left-1/2 + x:-50%) so the
          // y/opacity enter+exit is actually visible — a y-transform on a plain
          // wrapper can't move a `fixed` child. `BulkActionBar`'s shell is made
          // `static` inside this container, so its visual recipe is unchanged.
          <motion.div
            key="alerts-bulk-bar"
            className="fixed bottom-12 left-1/2 z-40"
            initial={{ opacity: 0, x: '-50%', y: 8 }}
            animate={{ opacity: 1, x: '-50%', y: 0 }}
            exit={{ opacity: 0, x: '-50%', y: 8 }}
            transition={{ duration: MOTION_DURATION.exit, ease: EASE_APPLE }}
          >
            <BulkActionBar
              selectedCount={selectedCount}
              totalCount={sortedAlerts.length}
              onDismiss={requestBulkDismiss}
              onClear={clearSelection}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

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
      <CircleAlertIcon className="size-4" aria-hidden />
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
    <FloatingActionBar
      tone="elevated"
      ariaLabel={t`Bulk actions`}
      // Positioning is owned by the AnimatePresence motion.div wrapper so the
      // enter/exit can animate the `fixed` bar — neutralize the primitive's own
      // fixed centering + slide-in keyframes (they'd double-up / fight the
      // wrapper's y-transform). Visual recipe (fill/shadow/radius) is untouched.
      className="!static !bottom-auto !left-auto !translate-x-0 !animate-none"
    >
      {/* Selection read-out */}
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-lg bg-state-accent-solid">
          <CheckIcon className="size-3.5 text-text-primary-on-surface" aria-hidden />
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
            // Stripe two-tone slot (2026-06-12): the label always reads
            // "State"; the applied state + its count ride the accent
            // `│ value` segment ("State │ CA · 4").
            valueLabel={
              activeState ? (
                <>
                  {activeState} · <Plural value={activeCount} one="# alert" other="# alerts" />
                </>
              ) : undefined
            }
          >
            <span>
              <Trans>State</Trans>
            </span>
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
  showSuggestedAction,
  onShowSuggestedActionChange,
}: {
  timeRangeFilter: TimeRangeFilter
  onTimeRangeChange: (value: TimeRangeFilter) => void
  impactFilter: AlertImpactFilter
  onImpactChange: (value: AlertImpactFilter) => void
  changeKindFilter: AlertChangeKindSelection
  onChangeKindChange: (value: AlertChangeKindSelection) => void
  taxAreaFilter: AlertTaxAreaSelection
  onTaxAreaChange: (value: AlertTaxAreaSelection) => void
  // Display preference (not a narrowing facet) — relocated here from the toolbar
  // where it sat orphaned. Excluded from `activeCount` so it never reads as an
  // applied filter.
  showSuggestedAction: boolean
  onShowSuggestedActionChange: (value: boolean) => void
}) {
  const { t } = useLingui()
  // The active count includes the time filter so the trigger badge
  // reflects an applied "Last 24h / 7d" too. The multi-select facets count as
  // one active facet each when ANY option is chosen (not one per checked box) —
  // the per-facet count is surfaced inside the section instead.
  const activeCount =
    (timeRangeFilter !== 'all_time' ? 1 : 0) +
    (impactFilter !== 'all' ? 1 : 0) +
    (changeKindFilter.length > 0 ? 1 : 0) +
    (taxAreaFilter.length > 0 ? 1 : 0)
  return (
    <Popover>
      <PopoverTrigger
        render={
          <FilterTrigger
            active={activeCount > 0}
            // 2026-06-12 (Yuqi /alerts #8 "State feels like a different
            // colour to Filters"): the gray `saved` fill is dropped — every
            // trigger in the cluster shares ONE at-rest chrome, and the
            // applied-state emphasis comes from the canonical accent
            // `│ value` slot instead of a heavier resting fill.
            leadingIcon={SlidersHorizontalIcon}
            valueLabel={activeCount > 0 ? String(activeCount) : undefined}
            aria-label={t`Filters`}
            className="text-base"
          >
            <span>
              <Trans>Filters</Trans>
            </span>
          </FilterTrigger>
        }
      />
      {/* 2026-06-21 (Yuqi /alerts #2 "polish + improve the expanded filter"):
          the popover gained a titled header that gives the panel a clear
          identity and a PERSISTENT home for "Clear all" (it used to be a stray
          link at the bottom that only appeared once something was applied), and
          the four facets are now separated by full-width hairlines (`divide-y`)
          instead of bare whitespace — section header + rule + space, the
          canonical "clear sections, not boxes" delineation. A touch wider
          (280px) so "Individual income" / "Franchise & fees" stop wrapping. */}
      <PopoverContent align="start" className="w-[280px] p-0">
        <div className="flex items-center justify-between gap-3 border-b border-divider-subtle px-3.5 py-2.5">
          <span className="text-sm font-semibold text-text-primary">
            <Trans>Filters</Trans>
          </span>
          {activeCount > 0 ? (
            <TextLink
              variant="accent"
              onClick={() => {
                onTimeRangeChange('all_time')
                onImpactChange('all')
                onChangeKindChange([])
                onTaxAreaChange([])
              }}
            >
              <Trans>Clear all</Trans>
            </TextLink>
          ) : null}
        </div>
        <div className="flex flex-col divide-y divide-divider-subtle px-3.5">
          <FilterPillSection
            className="py-3"
            label={t`Time`}
            value={timeRangeFilter}
            options={TIME_RANGE_FILTER_OPTIONS}
            getLabel={timeRangeFilterLabel}
            onSelect={onTimeRangeChange}
          />
          {/* Labelled "Impact" (was "Severity") to match its options — "All
              impact / Needs action / Needs review / No matches / Closed" — and
              the underlying `impactFilter`; "Severity" named a different axis
              than its contents (critique #10). */}
          <FilterPillSection
            className="py-3"
            label={t`Impact`}
            value={impactFilter}
            options={ALERT_IMPACT_FILTER_OPTIONS}
            getLabel={impactFilterLabel}
            onSelect={onImpactChange}
          />
          <FilterCheckboxSection
            className="py-3"
            label={t`Change type`}
            options={CHANGE_KIND_FILTER_SELECTABLE}
            selected={changeKindFilter}
            getLabel={changeKindGroupLabel}
            selectAllLabel={t`All change types`}
            onChange={onChangeKindChange}
          />
          <FilterCheckboxSection
            className="py-3"
            label={t`Tax area`}
            options={TAX_AREA_FILTER_SELECTABLE}
            selected={taxAreaFilter}
            getLabel={taxAreaGroupLabel}
            selectAllLabel={t`All tax areas`}
            onChange={onTaxAreaChange}
          />
          {/* Display — a per-row presentation toggle, NOT a narrowing facet
              (relocated 2026-06-21 from the toolbar where it sat orphaned on the
              left). Sits under its own hairline like the facets, but excluded
              from the trigger's active-count. */}
          <div className="flex flex-col gap-2 py-3">
            <CapsFieldLabel as="span" variant="group" className="text-text-tertiary">
              <Trans>Display</Trans>
            </CapsFieldLabel>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-text-secondary select-none">
              <Checkbox
                checked={showSuggestedAction}
                onCheckedChange={(next) => onShowSuggestedActionChange(next)}
              />
              <Trans>Suggested actions</Trans>
            </label>
          </div>
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
  className,
}: {
  label: string
  value: T
  options: readonly T[]
  getLabel: (option: T) => React.ReactNode
  onSelect: (option: T) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <CapsFieldLabel as="span" variant="group" className="text-text-tertiary">
        {label}
      </CapsFieldLabel>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => (
          <ToggleChip key={option} selected={option === value} onClick={() => onSelect(option)}>
            {getLabel(option)}
          </ToggleChip>
        ))}
      </div>
    </div>
  )
}

/**
 * A multi-select facet inside the Filters popover — an uppercase section label,
 * a "Select all" tri-state checkbox row, then one Checkbox row per option
 * (img-125). Selection is an ARRAY; an EMPTY array is the canonical "all"
 * (nothing narrowed), so "Select all" reads checked when the array is empty and
 * indeterminate when a strict subset is chosen. Toggling a single option out of
 * the "all" state seeds a fresh selection of every OTHER option; checking the
 * last missing option collapses back to the empty (= all) state. Generic over
 * the facet's literal-string union so each section reuses its option list +
 * humanized label helper.
 */
function FilterCheckboxSection<T extends string>({
  label,
  options,
  selected,
  getLabel,
  selectAllLabel,
  onChange,
  className,
}: {
  label: string
  options: readonly T[]
  selected: readonly T[]
  getLabel: (option: T) => React.ReactNode
  selectAllLabel: string
  onChange: (next: readonly T[]) => void
  className?: string
}) {
  // Empty selection = "all" (no narrowing). So a row reads checked either when
  // nothing is narrowed (every option is implicitly active) or when it is
  // explicitly in the chosen subset.
  const count = selected.length
  const isAll = count === 0
  const isChecked = (option: T) => isAll || selected.includes(option)
  const toggleOption = (option: T) => {
    // From the "all" state, unchecking one option means "everything except
    // this" — seed the array with the other options.
    const base = isAll ? options : selected
    const next = base.includes(option)
      ? base.filter((value) => value !== option)
      : [...base, option]
    // If the user re-selected every option, fold back to the empty (= all)
    // state so the trigger badge clears and behaviour matches the default.
    onChange(next.length === options.length ? [] : next)
  }
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <CapsFieldLabel as="span" variant="group" className="text-text-tertiary">
          {label}
        </CapsFieldLabel>
        {/* Per-facet count rides next to the section label (not the shared
            trigger, which collapses every facet to a single number) so a CPA
            can see "2 selected" while the popover is open. */}
        {!isAll ? (
          <span className="text-xs tabular-nums text-text-tertiary">
            <Plural value={count} one="# selected" other="# selected" />
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5">
        <label className="flex cursor-pointer items-center gap-2 rounded-sm py-1 text-base text-text-secondary">
          <Checkbox
            checked={isAll}
            indeterminate={!isAll}
            // Either side of the toggle lands on the canonical "all" state:
            // checking it clears the subset; clicking it while indeterminate
            // also clears back to all (the conventional select-all gesture).
            onCheckedChange={() => onChange([])}
            aria-label={selectAllLabel}
          />
          <span className="flex-1 truncate">{selectAllLabel}</span>
        </label>
        {options.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-2 rounded-sm py-1 text-base text-text-primary"
          >
            <Checkbox checked={isChecked(option)} onCheckedChange={() => toggleOption(option)} />
            <span className="flex-1 truncate">{getLabel(option)}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function timeRangeFilterLabel(filter: TimeRangeFilter): React.ReactNode {
  if (filter === 'last_24h') return <Trans>Last 24 hours</Trans>
  if (filter === 'last_7d') return <Trans>Last 7 days</Trans>
  return <Trans>Any time</Trans>
}

// 2026-06-22 (Yuqi "assign colours to impact"): each Impact bucket leads with a
// tone-coded dot so the section scans by urgency at a glance — red = needs
// action, amber = needs review, gray = no client match, green = closed/resolved.
// "All impact" carries no dot (it's the reset, not a tone). A restrained
// status-dot (colour without a loud fill); selection still reads via the pill
// accent, and the dot keeps its tone whether the pill is on or off.
function impactFilterDot(filter: AlertImpactFilter, label: React.ReactNode): React.ReactNode {
  const tone =
    filter === 'needs_action'
      ? 'bg-state-destructive-solid'
      : filter === 'needs_review'
        ? 'bg-state-warning-solid'
        : filter === 'no_matches'
          ? 'bg-text-tertiary'
          : 'bg-state-success-solid'
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-1.5 shrink-0 rounded-full', tone)} aria-hidden />
      {label}
    </span>
  )
}

function impactFilterLabel(filter: AlertImpactFilter): React.ReactNode {
  if (filter === 'all') return <Trans>All impact</Trans>
  if (filter === 'needs_action') return impactFilterDot(filter, <Trans>Needs action</Trans>)
  if (filter === 'needs_review') return impactFilterDot(filter, <Trans>Needs review</Trans>)
  if (filter === 'no_matches') return impactFilterDot(filter, <Trans>No matches</Trans>)
  return impactFilterDot(filter, <Trans>Closed</Trans>)
}

// Filter labels for the four collapsed change-type buckets defined by
// `CHANGE_KIND_FILTER_GROUP_MEMBERS`, not the nine underlying kinds — the
// per-card chip (`PulseChangeKindChip`) still names the precise kind. The
// checkbox rows now drive selection, so there is no "all" pseudo-option here.
function changeKindGroupLabel(group: AlertChangeKindFilterGroup): React.ReactNode {
  if (group === 'deadlines') return <Trans>Deadlines</Trans>
  if (group === 'rules') return <Trans>Rules & forms</Trans>
  if (group === 'source') return <Trans>Source updates</Trans>
  return <Trans>Other changes</Trans>
}

// Tax-area filter labels — the six service-line buckets. Names the derived
// `taxAreas` values from @duedatehq/core/tax-area; the per-card chips still
// carry the precise form / jurisdiction.
function taxAreaGroupLabel(area: TaxArea): React.ReactNode {
  if (area === 'income_individual') return <Trans>Individual income</Trans>
  if (area === 'income_business') return <Trans>Business income</Trans>
  if (area === 'sales_use') return <Trans>Sales & use</Trans>
  if (area === 'payroll_withholding') return <Trans>Payroll</Trans>
  if (area === 'franchise') return <Trans>Franchise & fees</Trans>
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
      // Borderless to match the loaded PulseAlertList (which has no frame
      // border) — the skeleton previously flashed a border the real list
      // doesn't have (2026-06-14 cohesion sweep).
      className="flex flex-col rounded-xl bg-background-default"
    >
      <span className="sr-only">
        <Trans>Loading alerts…</Trans>
      </span>

      {/* Header band — mirrors the day-group divider tokens */}
      <div className="flex items-center justify-between border-b border-divider-subtle bg-background-subtle py-2 text-sm font-semibold tracking-eyebrow-tight text-text-tertiary uppercase">
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
      className="flex gap-[10px] border-b border-divider-subtle py-3 last:border-b-0"
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
function AlertsEmptyState({ sources }: { sources: readonly PulseSourceHealth[] }) {
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
      // Ghost-card deck (img-055) over the megaphone icon: an empty feed fills
      // with alert CARDS, so a fanned placeholder deck reads as "your alerts will
      // stack here" — congruent with the copy below — without faking rows.
      visual="ghost-cards"
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
