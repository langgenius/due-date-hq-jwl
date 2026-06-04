import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircleIcon, HistoryIcon } from 'lucide-react'

import type { PulseAffectedClient, PulseAlertPublic, PulseSourceHealth } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@duedatehq/ui/components/ui/popover'

import { rpcErrorMessage } from '@/lib/rpc-error'
import { ShortcutHintChip } from '@/components/patterns/kbd'
import { PageHeader } from '@/components/patterns/page-header'
import { FilterTrigger } from '@/components/patterns/filter-trigger'
import {
  TableHeaderMultiFilter,
  type TableFilterOption,
} from '@/components/patterns/table-header-filter'
import { StatusBanner } from '@/components/patterns/status-banner'

import { useAlertDrawer } from './DrawerProvider'
import { AlertDetailDrawer } from './AlertDetailDrawer'
import { StateTilegram } from './components/StateTilegram'
import {
  useAlertsListQueryOptions,
  useAlertsHistoryQueryOptions,
  useAlertSourceHealthQueryOptions,
  useAlertsAffectedClients,
} from './api'
import { AlertCard } from './components/AlertCard'
import { PulsingDot } from './components/PulsingDot'
import {
  isAlertImpactFilter,
  matchesAlertImpactFilter,
  ALERT_IMPACT_FILTER_OPTIONS,
  type AlertImpactFilter,
} from './lib/impact-filter'
import {
  ACTIVE_STATUS_FILTER_OPTIONS,
  CHANGE_KIND_FILTER_OPTIONS,
  HISTORY_STATUS_FILTER_OPTIONS,
  isChangeKindFilter,
  isStatusFilter,
  matchesStatusFilter,
  sourceLabel,
  type AlertChangeKindFilter,
  type AlertStatusFilter,
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
  // 2026-06-04: Alerts top filters aligned to the /clients toolbar —
  // Impact / Change type / Status / Source are now multi-select
  // `TableHeaderMultiFilter` dropdowns (checkbox in front of each
  // option). An empty array means "no filter" (matches everything);
  // selecting multiple values within one filter is OR'd. The State
  // filter keeps its dedicated tilegram popover and stays single-pick.
  const [statusFilter, setStatusFilter] = useState<AlertStatusFilter[]>([])
  const [impactFilter, setImpactFilter] = useState<AlertImpactFilter[]>([])
  const [changeKindFilter, setChangeKindFilter] = useState<AlertChangeKindFilter[]>([])
  const [sourceFilter, setSourceFilter] = useState<string[]>([])
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
  // Batch the affected-client rows for every alert in ONE request and hand each
  // card its slice, instead of every AlertCard firing its own `getDetail`.
  // Keyed off the full (stable) `alerts` set — not `filteredAlerts` — so
  // client-side filter changes don't refetch; cards just look up their id.
  const alertIds = useMemo(() => alerts.map((alert) => alert.id), [alerts])
  const affectedByAlert = useAlertsAffectedClients(alertIds)
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
  // Option lists for the multi-select filter dropdowns. The leading
  // `all` sentinel is dropped — an empty selection IS "all" now — so
  // these only carry the concrete facet values, each with a plain
  // string label (the toolbar checkbox rows render text, not JSX).
  const impactFilterOptions = useMemo<TableFilterOption[]>(() => {
    const labels: Record<AlertImpactFilter, string> = {
      all: '',
      needs_action: t`Needs action`,
      needs_review: t`Needs review`,
      no_matches: t`No matches`,
      closed: t`Closed`,
    }
    return ALERT_IMPACT_FILTER_OPTIONS.filter((option) => option !== 'all').map((option) => ({
      value: option,
      label: labels[option],
    }))
  }, [t])
  const changeKindFilterOptions = useMemo<TableFilterOption[]>(() => {
    const labels: Record<AlertChangeKindFilter, string> = {
      all: '',
      deadline_shift: t`Deadline shifts`,
      filing_requirement: t`Filing requirements`,
      applicability_scope: t`Applicability scope`,
      form_instruction: t`Forms and instructions`,
      source_status: t`Source status`,
      rule_source_drift: t`Source changed — re-verify`,
      new_obligation: t`New deadlines`,
      threshold_advisory: t`Threshold advisories`,
      other: t`Other changes`,
    }
    return CHANGE_KIND_FILTER_OPTIONS.filter((option) => option !== 'all').map((option) => ({
      value: option,
      label: labels[option],
    }))
  }, [t])
  const statusFilterSelectOptions = useMemo<TableFilterOption[]>(() => {
    const labels: Record<AlertStatusFilter, string> = {
      all: '',
      active: t`Active`,
      partially_applied: t`Partially applied`,
      applied: t`Applied`,
      dismissed: t`Dismissed`,
      reverted: t`Reverted`,
      reviewed: t`Reviewed`,
      snoozed: t`Snoozed`,
    }
    return statusFilterOptions
      .filter((option) => option !== 'all')
      .map((option) => ({ value: option, label: labels[option] }))
  }, [statusFilterOptions, t])
  const sourceFilterOptions = useMemo<TableFilterOption[]>(
    () =>
      sourceOptions.map((source) => ({
        value: source,
        label: source,
        count: sourceCounts.get(source) ?? 0,
      })),
    [sourceOptions, sourceCounts],
  )
  const filteredAlerts = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          (impactFilter.length === 0 ||
            impactFilter.some((filter) => matchesAlertImpactFilter(alert, filter))) &&
          (statusFilter.length === 0 ||
            statusFilter.some((filter) => matchesStatusFilter(alert.status, filter))) &&
          (changeKindFilter.length === 0 ||
            changeKindFilter.some((kind) => kind === alert.changeKind)) &&
          (sourceFilter.length === 0 || sourceFilter.includes(alert.source)) &&
          (jurisdictionFilter === null || alert.jurisdiction === jurisdictionFilter),
      ),
    [alerts, changeKindFilter, impactFilter, jurisdictionFilter, sourceFilter, statusFilter],
  )
  const isEmpty = !alertsQuery.isLoading && alerts.length === 0
  const isFilteredEmpty = !alertsQuery.isLoading && alerts.length > 0 && filteredAlerts.length === 0
  const filtersActive =
    impactFilter.length > 0 ||
    statusFilter.length > 0 ||
    changeKindFilter.length > 0 ||
    sourceFilter.length > 0 ||
    jurisdictionFilter !== null

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
                  discoverability chip for /alerts toolbar. Alerts have
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
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]">
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
              {/* 2026-06-01: keep the filter row wrapping in both
                  split-view and list-only mode. The alert list column
                  owns vertical scrolling, and letting a nowrap row set
                  min-content width can turn that same column into a
                  horizontal scroller when the detail panel is open. */}
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {/* 2026-06-04: top filters aligned to the /clients
                    toolbar. Impact / Change type / Status / Source are
                    multi-select `TableHeaderMultiFilter` dropdowns —
                    same chrome as /clients (FilterTrigger + count
                    badge), a checkbox in front of every option, values
                    OR'd within each filter. The State filter below keeps
                    its dedicated tilegram popover. */}
                <TableHeaderMultiFilter
                  trigger="toolbar"
                  label={t`Impact`}
                  options={impactFilterOptions}
                  selected={impactFilter}
                  emptyLabel={t`No impact levels`}
                  onSelectedChange={(next) => setImpactFilter(next.filter(isAlertImpactFilter))}
                />
                <TableHeaderMultiFilter
                  trigger="toolbar"
                  label={t`Change type`}
                  options={changeKindFilterOptions}
                  selected={changeKindFilter}
                  emptyLabel={t`No change types`}
                  onSelectedChange={(next) => setChangeKindFilter(next.filter(isChangeKindFilter))}
                />
                <TableHeaderMultiFilter
                  trigger="toolbar"
                  label={t`Status`}
                  options={statusFilterSelectOptions}
                  selected={statusFilter}
                  emptyLabel={t`No statuses`}
                  onSelectedChange={(next) =>
                    setStatusFilter(
                      next.filter((value): value is AlertStatusFilter =>
                        isStatusFilter(value, statusFilterOptions),
                      ),
                    )
                  }
                />
                {/* Source can run to 30+ entries (IRS, NY DTF, CA FTB,
                    …) so this filter stays searchable, mirroring the
                    /clients Client + States dropdowns. */}
                <TableHeaderMultiFilter
                  trigger="toolbar"
                  label={t`Source`}
                  options={sourceFilterOptions}
                  selected={sourceFilter}
                  emptyLabel={t`No sources`}
                  searchable
                  searchPlaceholder={t`Search sources`}
                  onSelectedChange={setSourceFilter}
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
                    setImpactFilter([])
                    setStatusFilter([])
                    setChangeKindFilter([])
                    setSourceFilter([])
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
                      affectedClients={affectedByAlert.get(alert.id) ?? EMPTY_AFFECTED}
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
        {/* 2026-06-03 (Yuqi /alerts detail skeleton width): mount
            the right-column slot at its final 60% width immediately.
            The previous width animation (0 → 60%) let the header
            skeleton render in a narrow column before the loaded
            detail settled at full width, producing a visible
            narrow-to-wide jump. The inner paper still rises in from
            below; only the slot-width animation is removed on enter.
            Exit keeps the quick width collapse so the list can
            reclaim the space when the panel closes. */}
        <AnimatePresence initial={false}>
          {panelOpen ? (
            <motion.div
              key="pulse-detail-panel"
              initial={{ width: '60%' }}
              animate={{ width: '60%' }}
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

function FilteredEmptyState() {
  return (
    <StatusBanner indicator={<PulsingDot tone="disabled" />}>
      <Trans>No alerts match these filters.</Trans>
    </StatusBanner>
  )
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
