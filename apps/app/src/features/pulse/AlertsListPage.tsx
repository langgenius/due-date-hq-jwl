import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircleIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ChevronDownIcon,
  HistoryIcon,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  PulseAlertPublic,
  PulseChangeKind,
  PulseFirmAlertStatus,
  PulseSourceHealth,
} from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@duedatehq/ui/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@duedatehq/ui/components/ui/popover'
import { useSidebar } from '@duedatehq/ui/components/ui/sidebar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'

import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { ConceptLabel } from '@/features/concepts/concept-help'
import { StateBadge } from '@/components/primitives/state-badge'
import { cn } from '@duedatehq/ui/lib/utils'

import { usePulseDrawer } from './DrawerProvider'
import { PulseDetailDrawer } from './PulseDetailDrawer'
import { StateTilegram } from './components/StateTilegram'
import {
  usePulseInvalidation,
  usePulseListHistoryQueryOptions,
  usePulseSourceHealthQueryOptions,
} from './api'
import { PulseAlertCard } from './components/PulseAlertCard'
import { PULSE_STATUS_ICON } from './components/PulseStatusBadge'
import { PulseReasonDialog, type PulseReasonAction } from './components/PulseReasonDialog'
import { PulsingDot } from './components/PulsingDot'
import { enabledPulseSourceCount, summarizePulseSources } from './lib/source-health-labels'
import {
  isPulseImpactFilter,
  matchesPulseImpactFilter,
  PULSE_IMPACT_FILTER_OPTIONS,
  type PulseImpactFilter,
} from './lib/impact-filter'

// 2026-05-26 (Yuqi /rules/pulse thirteenth pass): status filter
// reordered from alphabetical → workflow lifecycle stages:
//   active → snoozed → applied → partially_applied → reviewed
//   → reverted → dismissed
// Reads top-to-bottom as the alert's possible journey: starts
// active, can be parked (snoozed), resolved (applied / partial /
// reviewed), or undone (reverted / dismissed). Filter dropdown
// now mirrors that mental model instead of an A-Z sort that
// drops "reverted" next to "snoozed".
const STATUS_FILTER_OPTIONS = [
  'all',
  'active',
  'snoozed',
  'applied',
  'partially_applied',
  'reviewed',
  'reverted',
  'dismissed',
] as const
type PulseStatusFilter = (typeof STATUS_FILTER_OPTIONS)[number]
const CHANGE_KIND_FILTER_OPTIONS = [
  'all',
  'deadline_shift',
  'filing_requirement',
  'applicability_scope',
  'form_instruction',
  'source_status',
  'new_obligation',
  'other',
] as const
type PulseChangeKindFilter = (typeof CHANGE_KIND_FILTER_OPTIONS)[number]
const EMPTY_ALERTS: readonly PulseAlertPublic[] = []
const EMPTY_SOURCES: readonly PulseSourceHealth[] = []

interface PulseChangesTabProps {
  embedded?: boolean
  /**
   * 2026-05-25 (Yuqi Alerts #2 — sub-page sweep): when true, the
   * page renders the closed-alerts archive — initial status filter
   * locked to `applied` (the most common terminal state), the
   * "View history" cross-link in the header is hidden (we're
   * already on it), and the impact/source filters still work as
   * normal. The dedicated `/rules/pulse/history` route mounts
   * this with `historyMode={true}` so the archive has its own
   * URL + sidebar entry instead of being a soft-filter on the
   * live page.
   */
  historyMode?: boolean
}

// Pulse Changes — source-backed rule-change timeline used inside Rules.
// Uses the same hairline / mono language as the dashboard strip; no oversized
// cards, no chrome shadows.
export function PulseChangesTab({ embedded = false, historyMode = false }: PulseChangesTabProps) {
  const { t } = useLingui()
  const { openDrawer, alertId: openAlertId, closeDrawer } = usePulseDrawer()
  // 2026-05-26 (Yuqi thirtieth pass — responsiveness): auto-collapse
  // the sidebar to icons-only when the user opens an alert. Frees
  // ~200px of horizontal room for the panel layout on smaller
  // desktops (1280–1440px viewports especially benefit). Does NOT
  // auto-expand when the alert closes — user keeps control of the
  // sidebar's persistent state.
  const { collapsed: sidebarCollapsed, toggleCollapsed: toggleSidebarCollapsed } = useSidebar()
  const openDrawerAndCollapseSidebar = (alertId: string) => {
    if (!sidebarCollapsed) toggleSidebarCollapsed()
    openDrawer(alertId)
  }
  const [statusFilter, setStatusFilter] = useState<PulseStatusFilter>(
    historyMode ? 'applied' : 'all',
  )
  const [impactFilter, setImpactFilter] = useState<PulseImpactFilter>('all')
  const [changeKindFilter, setChangeKindFilter] = useState<PulseChangeKindFilter>('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  // 2026-05-25 (Yuqi Alerts #9): state filter. v1 ships as a chip
  // strip (one chip per state with active alerts, count badge,
  // click-to-filter). The full SVG US map is a follow-on polish
  // round on top of this; the chip strip delivers the same filter
  // function with much less surface area. `null` = no filter
  // active.
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string | null>(null)
  const invalidatePulse = usePulseInvalidation()
  // 2026-05-24 (re-critique): the dismiss / snooze row-actions used
  // to grab the reason via `window.prompt()` — system-styled, no
  // textarea, no character counter, no app context. The drawer
  // already had a proper `PulseReasonDialog` for the same flow;
  // extracted it to a shared component (see
  // `./components/PulseReasonDialog.tsx`) and wired both surfaces
  // through it so the dismiss / snooze experience is consistent
  // whether the user is in the drawer or running through the list.
  const [reasonState, setReasonState] = useState<{
    action: PulseReasonAction
    alertId: string
  } | null>(null)
  const [reasonText, setReasonText] = useState('')
  const closeReasonDialog = () => {
    setReasonState(null)
    setReasonText('')
  }
  // Dismiss alerts directly from the Radar list (Rules › Radar). Mirrors
  // the dashboard banner's dismiss flow — same orpc.pulse.dismiss
  // mutation, same toast + invalidation on success. The optional
  // onDismiss prop on PulseAlertCard already renders a "Dismiss" button
  // when provided; wiring this handler turns it on for the in-Rules
  // surface so CPAs reviewing alerts at depth don't have to go back to
  // the dashboard banner just to dismiss noise.
  const dismissAlertMutation = useMutation(
    orpc.pulse.dismiss.mutationOptions({
      onSuccess: () => {
        toast.success(t`Alert dismissed`)
        invalidatePulse()
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
  // Snooze mirrors Dismiss — same canonical reason prompt, same audit
  // semantics, same toast pattern — but the alert reappears when the
  // 24h window elapses. Wired here per docs/Design/pulse-vocabulary.md
  // so CPAs don't have to open the drawer to defer a low-priority
  // alert.
  const snoozeAlertMutation = useMutation(
    orpc.pulse.snooze.mutationOptions({
      onSuccess: () => {
        toast.success(t`Alert snoozed for 24h`)
        invalidatePulse()
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
  const alertsQuery = useQuery(usePulseListHistoryQueryOptions(50))
  const sourceHealthQuery = useQuery(usePulseSourceHealthQueryOptions())
  const alerts = alertsQuery.data?.alerts ?? EMPTY_ALERTS
  const sourceHealth = sourceHealthQuery.data?.sources ?? EMPTY_SOURCES
  const sourceOptions = useMemo(
    () =>
      alerts
        .map((alert) => alert.source)
        .filter((source, index, sources) => sources.indexOf(source) === index)
        .toSorted(),
    [alerts],
  )
  // 2026-05-26 (Yuqi /rules/pulse follow-up): per-source alert count
  // — feeds the searchable source-filter popover so each row reads
  // as "IRS · 12" and the active-source trigger label can say
  // "IRS · 12 alerts" instead of just the bare source name.
  const sourceCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const alert of alerts) {
      map.set(alert.source, (map.get(alert.source) ?? 0) + 1)
    }
    return map
  }, [alerts])
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
  const filteredAlerts = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          matchesPulseImpactFilter(alert, impactFilter) &&
          matchesStatusFilter(alert.status, statusFilter) &&
          (changeKindFilter === 'all' || alert.changeKind === changeKindFilter) &&
          (sourceFilter === 'all' || alert.source === sourceFilter) &&
          (jurisdictionFilter === null || alert.jurisdiction === jurisdictionFilter),
      ),
    [alerts, changeKindFilter, impactFilter, jurisdictionFilter, sourceFilter, statusFilter],
  )
  const isEmpty = !alertsQuery.isLoading && alerts.length === 0
  const isFilteredEmpty = !alertsQuery.isLoading && alerts.length > 0 && filteredAlerts.length === 0
  const filtersActive =
    impactFilter !== 'all' ||
    statusFilter !== 'all' ||
    changeKindFilter !== 'all' ||
    sourceFilter !== 'all' ||
    jurisdictionFilter !== null

  // 2026-05-25 (Yuqi /rules/pulse #9 — drawer → page panel): when
  // an alert is open, the page splits into a left column (header,
  // filters, alert list) + a right column (the inline PulseDetail
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
          ? // 2026-05-26 (Yuqi /rules/pulse third pass #6): embedded
            // mount now propagates `h-full min-h-0` so the right
            // panel (mode="panel" PulseDetailDrawer) can stretch
            // to fill the parent route shell's height and the
            // panel handles its own internal scroll. Without this
            // the embedded shell collapsed to content-height and
            // the panel only occupied the height of the tallest
            // alert card.
            'flex h-full min-h-0 flex-col gap-4'
          : panelOpen
            ? 'mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col gap-4 p-3 md:p-4'
            : 'mx-auto flex w-full max-w-page-wide flex-col gap-4 p-3 md:p-4'
      }
    >
      {!embedded ? (
        <header className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="flex items-center gap-2 text-2xl font-semibold leading-tight text-text-primary">
                <PulsingDot
                  tone={isEmpty ? 'success' : 'warning'}
                  active
                  label={
                    isEmpty ? t`No active alerts right now` : t`Active alerts waiting for review`
                  }
                />
                <Trans>Alerts</Trans>
              </h1>
              <p className="max-w-[640px] text-md text-text-secondary">
                <ConceptLabel concept="pulse">
                  <Trans>
                    Regulatory Pulse signals that match your practice's clients. Review, batch-apply
                    due-date changes, snooze, or revisit closed changes.
                  </Trans>
                </ConceptLabel>
              </p>
            </div>
            <div className="flex shrink-0 items-end gap-3">
              {!alertsQuery.isLoading ? (
                <span className="hidden text-xs tabular-nums text-text-tertiary md:inline">
                  {alerts.length === 0 ? (
                    <Trans>0 active</Trans>
                  ) : filtersActive ? (
                    <Trans>
                      {filteredAlerts.length} shown · {alerts.length} total
                    </Trans>
                  ) : (
                    <Plural value={alerts.length} one="# active" other="# active" />
                  )}
                </span>
              ) : null}
              {/* 2026-05-25 (Yuqi Alerts #2 — sub-page sweep): the
                  "View history" button now navigates to
                  `/rules/pulse/history` instead of pre-setting the
                  status filter inline. History earns its own
                  route + sidebar entry so the CPA can deep-link
                  the archive, bookmark it, and find it via global
                  search — none of which worked when history was
                  a soft-filter on the live page. Hidden when this
                  component is mounted in history-mode (we're
                  already on the archive). */}
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  to="/rules/library"
                  className="group/sources inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
                >
                  <Trans>View sources</Trans>
                  <ArrowUpRightIcon
                    className="size-3.5 transition-transform duration-200 group-hover/sources:rotate-45"
                    aria-hidden
                  />
                </Link>
                {!historyMode ? (
                  <Link
                    to="/rules/pulse/history"
                    className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
                  >
                    <HistoryIcon className="size-3.5" aria-hidden />
                    <Trans>View history</Trans>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </header>
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
            <button type="button" className="underline" onClick={() => void alertsQuery.refetch()}>
              <Trans>Retry</Trans>
            </button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* 2026-05-25 (Yuqi /rules/pulse #9): split-column wrapper.
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
          2026-05-26 (Yuqi /rules/pulse follow-up #2): dropped the
          `pr-1` gutter — it inset the scrollbar 4px from the
          column edge, which made the scrollbar look like it was
          floating "inside" the page chrome instead of hugging
          the column boundary. With `scrollbar-gutter: stable`
          the layout still doesn't jump on scroll appearance. */}
      {/* 2026-05-26 (Yuqi /rules/pulse seventh pass — independent
          column scroll): the split-column wrapper is ALWAYS a
          row-flex with min-h-0/flex-1, and the list column ALWAYS
          carries its own overflow-y-auto. Previously the layout
          collapsed to `contents` when the panel was closed, which
          deferred scrolling to the route shell — Yuqi flagged that
          the two columns shouldn't scroll together as one block.
          With the shell now lockViewport'd at the route level, the
          list scrolls inside its column whether or not the panel
          is open, and the panel column manages its own internal
          scroll via the PulseDetailDrawer aside. */}
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
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-gutter:stable]">
          {alertsQuery.isLoading ? (
            <SkeletonList sources={sourceHealth} />
          ) : isEmpty ? (
            <EmptyState sources={sourceHealth} />
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
              {/* State filter chip strip (Yuqi Alerts #9, 2026-05-25):
              one chip per state with active alerts. Counts come from
              the unfiltered alert set so the chip stays clickable
              even after other filters narrow the list. Clicking
              toggles single-state focus; clicking the active chip
              clears the filter. A full SVG US map could replace this
              chip strip as a follow-on polish — the data shape
              (state + count) is the same, only the visual changes. */}
              {/* 2026-05-25 (Yuqi Alerts follow-up — state badges export):
              the state chip strip now leads each chip with the
              designed StateBadge SVG (flag/seal motif) instead of the
              bare two-letter code. The visual makes the strip scan
              like a row of flags — you spot "your state" by motif at
              a glance, the way a CPA recognises a Florida licence
              plate before reading "FL". Code text follows so the
              filter remains keyboard-typable and the chip is
              accessible without the SVG. The count chip on the right
              stays — same affordance as before. */}
              {/* 2026-05-25 (Yuqi /rules/pulse fourth pass #1): chip
              further shrunk — Yuqi reported the chips still read
              "too big" after the previous compression. Dropped
              the inner count chip entirely (was a small bordered
              box that visually fused with the state code,
              producing "NY1" run-together reading); count now
              lives inline as tabular-nums text-tertiary, separated
              from the code by a real space character. Outer
              padding tightened (py-0 pl-1 pr-2) so each chip
              collapses to its natural badge-height (~24px)
              without claiming extra row real estate. */}
              {/* 2026-05-25 (Yuqi /rules/pulse fifth pass — map
                  in dropdown): the always-visible tilegram was
                  claiming ~300×300 px of vertical real estate
                  above the alert list at all times. Yuqi flagged
                  that as wrong — the map should surface ON DEMAND
                  through a dropdown, not as standing chrome.
                  Wrapped the StateTilegram in a Popover with a
                  compact trigger button that shows the active
                  state (or "Any state") + count. */}
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
              <div
                className={
                  panelOpen
                    ? 'flex flex-nowrap items-center gap-2'
                    : 'flex flex-wrap items-center gap-2'
                }
              >
                <Select
                  value={impactFilter}
                  onValueChange={(value) => {
                    if (typeof value === 'string' && isPulseImpactFilter(value))
                      setImpactFilter(value)
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      'border-divider-strong bg-background-default text-text-primary hover:bg-state-base-hover',
                      // 2026-05-26 (Yuqi /rules/pulse tenth pass):
                      // shrink filter triggers when the panel is
                      // open so all 4-5 chips fit on one line in
                      // the narrower list column. 180 → 130 still
                      // leaves room for the longest label
                      // ("Partially applied").
                      // 2026-05-26 (Yuqi twentieth pass #2): when
                      // panel is open the trigger hugs its content
                      // (no fixed width) so the row fits one line
                      // and each button is exactly as wide as its
                      // active label.
                      panelOpen ? 'w-auto' : 'w-[180px]',
                    )}
                    size="sm"
                    aria-label={t`Filter by impact`}
                  >
                    <SelectValue>{impactFilterLabel(impactFilter)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start" alignItemWithTrigger={false}>
                    {PULSE_IMPACT_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {impactFilterLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={changeKindFilter}
                  onValueChange={(value) => {
                    if (typeof value === 'string' && isChangeKindFilter(value))
                      setChangeKindFilter(value)
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      'border-divider-strong bg-background-default text-text-primary hover:bg-state-base-hover',
                      // 2026-05-26 (Yuqi /rules/pulse tenth pass):
                      // shrink filter triggers when the panel is
                      // open so all 4-5 chips fit on one line in
                      // the narrower list column. 180 → 130 still
                      // leaves room for the longest label
                      // ("Partially applied").
                      // 2026-05-26 (Yuqi twentieth pass #2): when
                      // panel is open the trigger hugs its content
                      // (no fixed width) so the row fits one line
                      // and each button is exactly as wide as its
                      // active label.
                      panelOpen ? 'w-auto' : 'w-[180px]',
                    )}
                    size="sm"
                    aria-label={t`Filter by change type`}
                  >
                    <SelectValue>{changeKindFilterLabel(changeKindFilter)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start" alignItemWithTrigger={false}>
                    {CHANGE_KIND_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {changeKindFilterLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    if (typeof value === 'string' && isStatusFilter(value)) setStatusFilter(value)
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      'border-divider-strong bg-background-default text-text-primary hover:bg-state-base-hover',
                      // 2026-05-26 (Yuqi /rules/pulse tenth pass):
                      // shrink filter triggers when the panel is
                      // open so all 4-5 chips fit on one line in
                      // the narrower list column. 180 → 130 still
                      // leaves room for the longest label
                      // ("Partially applied").
                      // 2026-05-26 (Yuqi twentieth pass #2): when
                      // panel is open the trigger hugs its content
                      // (no fixed width) so the row fits one line
                      // and each button is exactly as wide as its
                      // active label.
                      panelOpen ? 'w-auto' : 'w-[180px]',
                    )}
                    size="sm"
                    aria-label={t`Filter by alert status`}
                  >
                    <SelectValue>{statusFilterLabel(statusFilter)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start" alignItemWithTrigger={false}>
                    {STATUS_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {statusFilterLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 2026-05-26 (Yuqi /rules/pulse follow-up): source
                    filter converted from a flat Select to a searchable
                    Popover + Command combobox. Practices with 30+
                    sources (IRS, NY DTF, CA FTB, TX Comptroller, FL DOR,
                    …) made the plain Select scroll list slow to navigate.
                    CommandInput pattern lets the CPA type "ny" and
                    narrow to NY-prefixed sources instantly. */}
                <SourceFilterPopover
                  sourceOptions={sourceOptions}
                  sourceCounts={sourceCounts}
                  activeSource={sourceFilter}
                  onSelect={(value) => setSourceFilter(value)}
                />

                {/* 2026-05-25 (Yuqi /rules/pulse fifth pass — map
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

                {/* 2026-05-25 (Yuqi /rules/pulse fourth pass #7):
                FilterX icon dropped from the Reset button — was
                reading as redundant chrome next to the word
                "Reset" itself. Bare ghost button keeps the
                tertiary-action affordance without the visual
                noise of the icon. */}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!filtersActive}
                  onClick={() => {
                    setImpactFilter('all')
                    setStatusFilter('all')
                    setChangeKindFilter('all')
                    setSourceFilter('all')
                    setJurisdictionFilter(null)
                  }}
                >
                  <Trans>Reset</Trans>
                </Button>
              </div>

              {isFilteredEmpty ? (
                <FilteredEmptyState />
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredAlerts.map((alert) => {
                    // Dismiss only on `matched` (still-open) alerts. Other statuses
                    // are terminal or already-actioned (dismissed / applied /
                    // partially_applied / reverted / snoozed) — growing a Dismiss
                    // button there would imply a no-op or a misleading retreat.
                    const canDismiss = alert.status === 'matched'
                    // Snooze applies to the same lifecycle stage as Dismiss
                    // (still-open alerts) — the difference is the alert
                    // reappears after 24h. Per canonical action order, both
                    // are exposed on the card; Snooze is the softer choice.
                    const canSnooze = canDismiss
                    return (
                      <PulseAlertCard
                        key={alert.id}
                        alert={alert}
                        active={alert.id === openAlertId}
                        compactClients={panelOpen}
                        onReview={() => openDrawerAndCollapseSidebar(alert.id)}
                        {...(canSnooze
                          ? {
                              onSnooze: () => {
                                setReasonState({ action: 'snooze', alertId: alert.id })
                                setReasonText('')
                              },
                            }
                          : {})}
                        {...(canDismiss
                          ? {
                              onDismiss: () => {
                                setReasonState({ action: 'dismiss', alertId: alert.id })
                                setReasonText('')
                              },
                            }
                          : {})}
                        // 2026-05-26 (Yuqi /rules/pulse sixth pass #1):
                        // Archive is ALWAYS available so the kebab
                        // renders on every row, including terminal-state
                        // alerts. Archive maps to dismiss with no
                        // reason captured (the alert is already past
                        // the active-workflow point; the user is just
                        // tidying their list).
                        onArchive={() => {
                          setReasonState({ action: 'dismiss', alertId: alert.id })
                          setReasonText('')
                        }}
                      />
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
        {/* Right column — inline PulseDetailDrawer rendered in
            panel mode. Splits the page when an alert is open;
            closing the panel collapses the wrapper back to a
            single column. */}
        {/* 2026-05-26 (Yuqi thirty-fourth pass): panel column wrapped
            in `AnimatePresence` + `motion.div` from the `motion`
            library (already a project dep, no new install). On
            click, the panel slides in from the right (translate-x
            + opacity + width) at 220ms ease-out. On close, it
            slides back out. List column auto-flexes since this
            is a flex sibling. */}
        {/* 2026-05-26 (Yuqi thirty-fifth pass): motion redesigned
            as "paper printing from the bottom." Two layered motion
            divs:
              • Outer: animates the flex slot's width (0 → 60%)
                fast (180ms) so the column reflows quickly and
                the empty slot is ready for the paper.
                `overflow-hidden` clips anything translated
                outside the slot, so the inner panel is invisible
                while it sits below.
              • Inner: starts at `y: '100%'` (fully below the
                slot, clipped by parent overflow) and translates
                up to `y: 0`. The full panel height of travel
                makes it read as paper being extruded from below
                the desk, not a small UI nudge. No opacity fade
                — paper is opaque from the first frame, only its
                position moves. 480ms with `[0.22, 1, 0.36, 1]`
                (easeOutExpo-soft) so the paper decelerates as
                it settles into the slot. 80ms delay so the slot
                visibly opens before the paper arrives.
            Net effect: list shrinks → empty slot opens → paper
            rises into the slot from below. The CPA-paper-on-desk
            aesthetic, executed literally. */}
        {/* 2026-05-26 (Yuqi thirty-eighth pass — reverse-exit
            choreography + softer easing): the enter/exit
            choreography is now properly reversed.
              ENTER (paper rises into open slot):
                t=0       outer width opens (slot reveals empty)
                t=140ms   inner paper starts rising from y:100%
                t=300ms   slot fully open at 60%
                t=780ms   paper settles at y:0
              EXIT (paper falls back, then slot closes):
                t=0       inner paper starts falling to y:100%
                t=550ms   paper fully below the desk (clipped)
                t=520ms   outer width starts closing (small overlap)
                t=820ms   slot fully closed
            Per-property transitions on `animate` vs `exit` make
            this possible — motion's default `transition` prop
            uses one curve for both, which is why exit looked
            wrong before (width was racing the inner instead
            of waiting for it).
            Curve: cubic-bezier(0.32, 0.72, 0, 1) — Apple's
            "swiftOut" — heavy deceleration so the paper
            decelerates as it settles, never feels mechanical.
            Durations bumped (slot 180→300ms, paper 480→640ms)
            so the whole motion feels deliberate rather than
            snappy. */}
        {/* 2026-05-26 (Yuqi forty-fifth pass — close as dissolve,
            not slide-down):
              OPEN: paper rises from below into the open slot
              (~780ms, the "feels deliberate" arrival).
              CLOSE: paper just FADES (opacity 1→0, no y-translation)
              while the slot closes underneath. Quick and quiet —
              reads as the panel "dissolving" rather than mirroring
              the slide-up reverse.
              Close timeline:
                t=0     paper fades out (220ms) AND slot closes
                        (280ms) simultaneously
                t=280ms slot fully closed, alert rows reflow to
                        full width
              No delay, no choreography — both motions run together
              and finish in ~280ms. The user-perceived event is
              "panel disappears, rows go back to normal." */}
        <AnimatePresence initial={false}>
          {panelOpen ? (
            <motion.div
              key="pulse-detail-panel"
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
                <PulseDetailDrawer mode="panel" alertId={openAlertId} onClose={closeDrawer} />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <PulseReasonDialog
        action={reasonState?.action ?? null}
        reason={reasonText}
        pending={dismissAlertMutation.isPending || snoozeAlertMutation.isPending}
        onChangeReason={setReasonText}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeReasonDialog()
        }}
        onSubmit={() => {
          const trimmed = reasonText.trim()
          if (!trimmed || !reasonState) return
          if (reasonState.action === 'dismiss') {
            dismissAlertMutation.mutate({ alertId: reasonState.alertId, reason: trimmed })
          } else if (reasonState.action === 'snooze') {
            snoozeAlertMutation.mutate({
              alertId: reasonState.alertId,
              until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              reason: trimmed,
            })
          }
          // The list-page surface doesn't expose `reviewed` — that's
          // a drawer-only flow (it depends on the affected-client
          // selection state the drawer holds).
        }}
      />
    </div>
  )
}

// Loading shimmer that matches the heartbeat language: warning-tone pulsing
// dot on the lead row, then two ghost rows with mono shimmer bars. No solid
// gray blocks — the page should look like it's listening, not waiting.
function sourceLabel(sources: readonly PulseSourceHealth[]): string {
  return summarizePulseSources(sources, { emptyLabel: 'configured Pulse sources' })
}

function enabledSourceCount(sources: readonly PulseSourceHealth[]): number {
  return enabledPulseSourceCount(sources)
}

// 2026-05-25 (Yuqi /rules/pulse fifth pass — map in dropdown):
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
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-sm whitespace-nowrap transition-colors outline-none',
          'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-2',
          activeState
            ? 'border-state-accent-solid bg-state-accent-hover text-text-accent'
            : 'border-divider-strong bg-background-default text-text-primary hover:bg-state-base-hover',
        )}
        aria-label={t`Filter by state`}
      >
        {activeState ? (
          <>
            <StateBadge code={activeState} size="xs" aria-hidden />
            <span className="font-mono font-medium">{activeState}</span>
            <span className="tabular-nums text-text-accent/70">
              <Plural value={activeCount} one="# alert" other="# alerts" />
            </span>
          </>
        ) : (
          <span>
            <Trans>Any state</Trans>
          </span>
        )}
        <ChevronDownIcon className="size-4 text-text-tertiary" aria-hidden />
      </PopoverTrigger>
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
                className="text-text-accent hover:underline"
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

// 2026-05-26 (Yuqi /rules/pulse follow-up): searchable source-filter
// combobox. Built on Popover + Command (cmdk under the hood) so it
// matches the picker pattern used in ClientCombobox / the Cmd+K
// palette — type to filter, ↑/↓ to navigate, Enter to apply, Esc
// to dismiss. Each row carries its per-source alert count on the
// right, and the active source's count is also surfaced on the
// trigger (e.g. "IRS · 12 alerts") so the filter row still reads
// at a glance without opening the popover.
function SourceFilterPopover({
  sourceOptions,
  sourceCounts,
  activeSource,
  onSelect,
}: {
  sourceOptions: readonly string[]
  sourceCounts: ReadonlyMap<string, number>
  activeSource: string
  onSelect: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const { t } = useLingui()
  const isFiltered = activeSource !== 'all'
  const activeCount = isFiltered ? (sourceCounts.get(activeSource) ?? 0) : 0
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          // 2026-05-26 (Yuqi twentieth pass #2): drop the
          // `min-w-[160px]` floor so the trigger hugs its content —
          // "All sources" / "IRS · 12 alerts" sits at natural width
          // and the one-line filter row stays tight when panel is
          // open. Chevron + label fit without enforcing a minimum.
          'inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-sm whitespace-nowrap transition-colors outline-none',
          'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-2',
          isFiltered
            ? 'border-state-accent-solid bg-state-accent-hover text-text-accent'
            : 'border-divider-strong bg-background-default text-text-primary hover:bg-state-base-hover',
        )}
        aria-label={t`Filter by source`}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {isFiltered ? (
            <>
              <span className="font-medium">{activeSource}</span>
              <span className="ml-1.5 tabular-nums text-text-accent/70">
                <Plural value={activeCount} one="# alert" other="# alerts" />
              </span>
            </>
          ) : (
            <Trans>All sources</Trans>
          )}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-text-tertiary" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-(--anchor-width) min-w-[240px] overflow-hidden p-0"
      >
        <Command loop>
          <CommandInput autoFocus placeholder={t`Search sources…`} />
          <CommandList className="max-h-[280px]">
            <CommandEmpty>
              <Trans>No sources match your search.</Trans>
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => {
                  onSelect('all')
                  setOpen(false)
                }}
                className="grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2"
              >
                <span className="min-w-0 truncate text-sm text-text-primary">
                  <Trans>All sources</Trans>
                </span>
                <span className="shrink-0 tabular-nums text-xs text-text-tertiary">
                  {sourceOptions.length}
                </span>
                {!isFiltered ? (
                  <CheckIcon className="size-4 text-text-accent" aria-hidden />
                ) : (
                  <span aria-hidden className="size-4" />
                )}
              </CommandItem>
              {sourceOptions.map((source) => {
                const count = sourceCounts.get(source) ?? 0
                const selected = source === activeSource
                return (
                  <CommandItem
                    key={source}
                    value={source}
                    onSelect={() => {
                      onSelect(source)
                      setOpen(false)
                    }}
                    className="grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2"
                  >
                    <span className="min-w-0 truncate text-sm text-text-primary">{source}</span>
                    <span className="shrink-0 tabular-nums text-xs text-text-tertiary">
                      {count}
                    </span>
                    {selected ? (
                      <CheckIcon className="size-4 text-text-accent" aria-hidden />
                    ) : (
                      <span aria-hidden className="size-4" />
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function FilteredEmptyState() {
  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-divider-regular bg-background-default p-4 text-sm text-text-secondary">
      <PulsingDot tone="disabled" />
      <span className="flex-1">
        <Trans>No alerts match these filters.</Trans>
      </span>
    </div>
  )
}

function isStatusFilter(value: string): value is PulseStatusFilter {
  return STATUS_FILTER_OPTIONS.some((option) => option === value)
}

function isChangeKindFilter(value: string): value is PulseChangeKindFilter {
  return CHANGE_KIND_FILTER_OPTIONS.some((option) => option === value)
}

function matchesStatusFilter(status: PulseFirmAlertStatus, filter: PulseStatusFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'active') return status === 'matched'
  return status === filter
}

function impactFilterLabel(filter: PulseImpactFilter): React.ReactNode {
  if (filter === 'all') return <Trans>All impact</Trans>
  if (filter === 'needs_action') return <Trans>Needs action</Trans>
  if (filter === 'needs_review') return <Trans>Needs review</Trans>
  if (filter === 'no_matches') return <Trans>No matches</Trans>
  return <Trans>Closed</Trans>
}

// 2026-05-26 (Yuqi /rules/pulse thirteenth pass): each non-`all`
// filter renders a leading lucide icon — the canonical pulse-status
// vocabulary (CircleCheckBig / AlarmClock / Undo2 / FileCheck) is
// duplicated here so the dropdown rows read as "[icon] Label" and
// the active trigger label gets the icon too. Filter values map to
// the real PulseFirmAlertStatus 1:1 except for `active` → `matched`.
const STATUS_FILTER_ICON: Record<PulseStatusFilter, LucideIcon | null> = {
  all: null,
  active: PULSE_STATUS_ICON.matched,
  snoozed: PULSE_STATUS_ICON.snoozed,
  applied: PULSE_STATUS_ICON.applied,
  partially_applied: PULSE_STATUS_ICON.partially_applied,
  reviewed: PULSE_STATUS_ICON.reviewed,
  reverted: PULSE_STATUS_ICON.reverted,
  dismissed: PULSE_STATUS_ICON.dismissed,
}

function statusFilterText(filter: PulseStatusFilter): React.ReactNode {
  if (filter === 'all') return <Trans>All statuses</Trans>
  if (filter === 'active') return <Trans>Active</Trans>
  if (filter === 'partially_applied') return <Trans>Partially applied</Trans>
  if (filter === 'applied') return <Trans>Applied</Trans>
  if (filter === 'dismissed') return <Trans>Dismissed</Trans>
  if (filter === 'reverted') return <Trans>Reverted</Trans>
  if (filter === 'reviewed') return <Trans>Reviewed</Trans>
  return <Trans>Snoozed</Trans>
}

function statusFilterLabel(filter: PulseStatusFilter): React.ReactNode {
  const Icon = STATUS_FILTER_ICON[filter]
  return (
    <span className="inline-flex items-center gap-2">
      {Icon ? <Icon className="size-3.5 text-text-tertiary" aria-hidden /> : null}
      {statusFilterText(filter)}
    </span>
  )
}

function changeKindFilterLabel(filter: PulseChangeKindFilter): React.ReactNode {
  if (filter === 'all') return <Trans>All change types</Trans>
  return changeKindLabel(filter)
}

function changeKindLabel(kind: PulseChangeKind): React.ReactNode {
  if (kind === 'deadline_shift') return <Trans>Deadline shifts</Trans>
  if (kind === 'filing_requirement') return <Trans>Filing requirements</Trans>
  if (kind === 'applicability_scope') return <Trans>Applicability scope</Trans>
  if (kind === 'form_instruction') return <Trans>Forms and instructions</Trans>
  if (kind === 'source_status') return <Trans>Source status</Trans>
  if (kind === 'new_obligation') return <Trans>New deadlines</Trans>
  return <Trans>Other changes</Trans>
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
        <span className="text-md text-text-tertiary">{label}</span>
      ) : (
        <>
          <span
            aria-hidden
            className="h-2 w-24 animate-pulse rounded-full bg-state-base-hover-alt motion-reduce:animate-none"
          />
          <span aria-hidden className="text-text-tertiary">
            ·
          </span>
          <span
            aria-hidden
            className="h-2 max-w-[280px] flex-1 animate-pulse rounded-full bg-state-base-hover-alt motion-reduce:animate-none"
          />
          <span
            aria-hidden
            className="ml-auto h-2 w-12 animate-pulse rounded-full bg-state-base-hover-alt motion-reduce:animate-none"
          />
        </>
      )}
    </div>
  )
}

function EmptyState({ sources }: { sources: readonly PulseSourceHealth[] }) {
  const count = enabledSourceCount(sources)
  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-divider-regular bg-background-default p-4 text-sm text-text-secondary">
      <PulsingDot tone="success" active />
      <span className="flex-1">
        {count > 0 ? (
          <Trans>
            All clear. We're watching official federal and state sources (
            <Plural value={count} one="# source" other="# sources" />
            ); new matches will appear here.
          </Trans>
        ) : (
          <Trans>
            All clear. We're watching configured Pulse sources; new matches will appear here.
          </Trans>
        )}
      </span>
    </div>
  )
}
