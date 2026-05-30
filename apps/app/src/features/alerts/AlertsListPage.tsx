import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircleIcon, CheckIcon, HistoryIcon, type LucideIcon } from 'lucide-react'

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'

import { rpcErrorMessage } from '@/lib/rpc-error'
import { ShortcutHintChip } from '@/components/patterns/kbd'
import { PageHeader } from '@/components/patterns/page-header'
import { FilterTrigger } from '@/components/patterns/filter-trigger'
import { StatusBanner } from '@/components/patterns/status-banner'

import { useAlertDrawer } from './DrawerProvider'
import { AlertDetailDrawer } from './AlertDetailDrawer'
import { StateTilegram } from './components/StateTilegram'
import {
  useAlertsListQueryOptions,
  useAlertsHistoryQueryOptions,
  useAlertSourceHealthQueryOptions,
} from './api'
import { AlertCard } from './components/AlertCard'
import { ALERT_STATUS_ICON } from './components/AlertStatusBadge'
import { PulsingDot } from './components/PulsingDot'
import { summarizeAlertSources } from './lib/source-health-labels'
import {
  isAlertImpactFilter,
  matchesAlertImpactFilter,
  ALERT_IMPACT_FILTER_OPTIONS,
  type AlertImpactFilter,
} from './lib/impact-filter'

// Status filters are scoped by surface: the active queue exposes only
// active-workflow states, while history exposes CPA-handled states.
const ACTIVE_STATUS_FILTER_OPTIONS = ['all', 'active', 'partially_applied'] as const
const HISTORY_STATUS_FILTER_OPTIONS = [
  'all',
  'snoozed',
  'partially_applied',
  'applied',
  'reviewed',
  'reverted',
  'dismissed',
] as const
type AlertStatusFilter =
  | (typeof ACTIVE_STATUS_FILTER_OPTIONS)[number]
  | (typeof HISTORY_STATUS_FILTER_OPTIONS)[number]
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
type AlertChangeKindFilter = (typeof CHANGE_KIND_FILTER_OPTIONS)[number]
const EMPTY_ALERTS: readonly PulseAlertPublic[] = []
const EMPTY_SOURCES: readonly PulseSourceHealth[] = []

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
  const [sourceFilter, setSourceFilter] = useState('all')
  // 2026-05-25 (Yuqi Alerts #9): state filter. v1 ships as a chip
  // strip (one chip per state with active alerts, count badge,
  // click-to-filter). The full SVG US map is a follow-on polish
  // round on top of this; the chip strip delivers the same filter
  // function with much less surface area. `null` = no filter
  // active.
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string | null>(null)
  const activeAlertsQueryOptions = useAlertsListQueryOptions(50)
  const historyAlertsQueryOptions = useAlertsHistoryQueryOptions(50)
  const alertsQuery = useQuery(historyMode ? historyAlertsQueryOptions : activeAlertsQueryOptions)
  const sourceHealthQuery = useQuery(useAlertSourceHealthQueryOptions())
  const alerts = alertsQuery.data?.alerts ?? EMPTY_ALERTS
  const sourceHealth = sourceHealthQuery.data?.sources ?? EMPTY_SOURCES
  const statusFilterOptions = historyMode
    ? HISTORY_STATUS_FILTER_OPTIONS
    : ACTIVE_STATUS_FILTER_OPTIONS
  const sourceOptions = useMemo(
    () =>
      alerts
        .map((alert) => alert.source)
        .filter((source, index, sources) => sources.indexOf(source) === index)
        .toSorted(),
    [alerts],
  )
  // 2026-05-26 (Yuqi /alerts follow-up): per-source alert count
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
          matchesAlertImpactFilter(alert, impactFilter) &&
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

  // 2026-05-25 (Yuqi /alerts #9 — drawer → page panel): when
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
                <span className="rounded-full bg-state-base-hover px-2 py-1.5 text-xs font-medium tabular-nums text-text-secondary">
                  {alerts.length === 0 ? (
                    <Trans>0 ongoing</Trans>
                  ) : (
                    <Plural value={alerts.length} one="# ongoing" other="# ongoing" />
                  )}
                </span>
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
                  discoverability chip for /alerts toolbar. Pulse has
                  J/K row nav (per AlertsListPage hotkeys) but `?` was
                  undiscoverable. */}
              <ShortcutHintChip className="hidden md:inline-flex" />
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
                shape; pulse was the only surface with a hand-rolled
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
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-gutter:stable]">
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
              {/* 2026-05-25 (Yuqi /alerts fourth pass #1): chip
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
              {/* 2026-05-25 (Yuqi /alerts fifth pass — map
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
              {/* 2026-05-26 (Yuqi /alerts third pass #5): when
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
                {/* 2026-05-26 (Yuqi seventy-fourth pass follow-up
                    — finish E): three Base UI Selects converted to
                    DropdownMenu + FilterTrigger. Yuqi's standing
                    "incorrect dropdown interaction" feedback on
                    Base UI Selects applies here too — the rest of
                    the product uses DropdownMenu + RadioGroup. The
                    panelOpen ? 'w-auto' : 'w-[180px]' sizing is
                    preserved per the previous twentieth-pass
                    rationale (one-line filter row when the right
                    panel is open). */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <FilterTrigger
                        active={impactFilter !== 'all'}
                        aria-label={t`Filter by impact`}
                        className={panelOpen ? 'w-auto' : 'w-[180px]'}
                      >
                        <span className="min-w-0 flex-1 truncate text-left">
                          {impactFilterLabel(impactFilter)}
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

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <FilterTrigger
                        active={changeKindFilter !== 'all'}
                        aria-label={t`Filter by change type`}
                        className={panelOpen ? 'w-auto' : 'w-[180px]'}
                      >
                        <span className="min-w-0 flex-1 truncate text-left">
                          {changeKindFilterLabel(changeKindFilter)}
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

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <FilterTrigger
                        active={statusFilter !== 'all'}
                        aria-label={t`Filter by alert status`}
                        className={panelOpen ? 'w-auto' : 'w-[180px]'}
                      >
                        <span className="min-w-0 flex-1 truncate text-left">
                          {statusFilterLabel(statusFilter, historyMode)}
                        </span>
                      </FilterTrigger>
                    }
                  />
                  <DropdownMenuContent align="start" className="min-w-[180px]">
                    <DropdownMenuRadioGroup
                      value={statusFilter}
                      onValueChange={(value) => {
                        if (typeof value === 'string' && isStatusFilter(value, statusFilterOptions))
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

                {/* 2026-05-26 (Yuqi /alerts follow-up): source
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

                {/* 2026-05-25 (Yuqi /alerts fourth pass #7):
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
                  {filteredAlerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      active={alert.id === openAlertId}
                      compactClients={panelOpen}
                      showReadiness={!historyMode}
                      onReview={() => openDrawerAndCollapseSidebar(alert.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        {/* Right column — inline AlertDetailDrawer rendered in
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
function sourceLabel(sources: readonly PulseSourceHealth[]): string {
  return summarizeAlertSources(sources, { emptyLabel: 'configured alert sources' })
}

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
                className="rounded-sm text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
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

// 2026-05-26 (Yuqi /alerts follow-up): searchable source-filter
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
        render={
          <FilterTrigger active={isFiltered} aria-label={t`Filter by source`}>
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
          </FilterTrigger>
        }
      />
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
    <StatusBanner indicator={<PulsingDot tone="disabled" />}>
      <Trans>No alerts match these filters.</Trans>
    </StatusBanner>
  )
}

function isStatusFilter(
  value: string,
  options: readonly AlertStatusFilter[],
): value is AlertStatusFilter {
  return options.some((option) => option === value)
}

function isChangeKindFilter(value: string): value is AlertChangeKindFilter {
  return CHANGE_KIND_FILTER_OPTIONS.some((option) => option === value)
}

function matchesStatusFilter(status: PulseFirmAlertStatus, filter: AlertStatusFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'active') return status === 'matched'
  return status === filter
}

function impactFilterLabel(filter: AlertImpactFilter): React.ReactNode {
  if (filter === 'all') return <Trans>All impact</Trans>
  if (filter === 'needs_action') return <Trans>Needs action</Trans>
  if (filter === 'needs_review') return <Trans>Needs review</Trans>
  if (filter === 'no_matches') return <Trans>No matches</Trans>
  return <Trans>Closed</Trans>
}

// 2026-05-26 (Yuqi /alerts thirteenth pass): each non-`all`
// filter renders a leading lucide icon — the canonical pulse-status
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

function changeKindFilterLabel(filter: AlertChangeKindFilter): React.ReactNode {
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
        <span className="text-base text-text-tertiary">{label}</span>
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
// promoted into the page header as a status chip (see
// rules.pulse.tsx titleNode), so repeating it here was redundant.
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
