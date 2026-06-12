import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { CoffeeIcon, HistoryIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@duedatehq/ui/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { MVP_RULE_JURISDICTIONS } from '@duedatehq/core/rules'
import { cn } from '@duedatehq/ui/lib/utils'

import { CountPill } from '@/components/primitives/count-pill'
import { AlertsListPage } from '@/features/alerts/AlertsListPage'
import { useActiveAlertCount, useAlertSourceHealthQueryOptions } from '@/features/alerts/api'
import { useAlertDrawer } from '@/features/alerts/DrawerProvider'
import { MonitoringChip } from '@/features/alerts/components/MonitoringChip'
import { MorningSweepProvider, useMorningSweep } from '@/features/alerts/MorningSweepContext'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

const NATIONAL_MONITORING_JURISDICTION_COUNT = 52

export function AlertsRoute() {
  const { t } = useLingui()
  const { open: panelOpen } = useAlertDrawer()
  // The header count chip reads the SAME authoritative count as the sidebar nav
  // badge and the detail rail head — `pulse.activeCount` (matched +
  // partially_applied, approved, not expired). Earlier this filtered
  // `status === 'matched'` on listAlerts(50), which undercounted (missed
  // partially_applied / expiry scoping) and disagreed with the sidebar's 8.
  const alertCount = useActiveAlertCount()
  // The Sources selector chip carries a live health dot so the CPA can SEE
  // monitoring is healthy at a glance. Same `listSourceHealth` query the
  // list page polls (React Query dedupes), reduced to a green/amber signal
  // + a tooltip count. Only enabled sources count toward the health roll-up.
  const sourceHealthQuery = useQuery(useAlertSourceHealthQueryOptions())
  const monitoredSources = (sourceHealthQuery.data?.sources ?? []).filter((s) => s.enabled)
  const unhealthySourceCount = monitoredSources.filter((s) => s.healthStatus !== 'healthy').length
  const sourceHealthLoaded = monitoredSources.length > 0
  const allSourcesHealthy = sourceHealthLoaded && unhealthySourceCount === 0
  // This chip is a product coverage metric, not an adapter/source-health count.
  // Parser-backed baseline sources can grow to hundreds of adapters
  // while the CPA-facing promise remains national coverage.
  const hasNationalMonitoringCoverage =
    MVP_RULE_JURISDICTIONS.length === NATIONAL_MONITORING_JURISDICTION_COUNT

  // No breadcrumb here: Alerts is a top-level sidebar destination, so a
  // parent crumb back to /rules/library would be vestigial IA from when
  // Alerts lived under Rules. The PageHeader's own h1 stays
  // (`title=Alerts`); only the eyebrow / breadcrumb row above it is
  // omitted. AlertsListPage renders embedded (no second h1).
  // "Alert history" is surfaced here as the page's primary header action,
  // not as a sidebar footer entry — the archive is a sub-view of /alerts
  // (closed alerts on the same surface), not a peer of Audit log /
  // Settings, so it belongs in the page chrome. The label is "Alert
  // history" rather than "Archive" — clearer for a CPA who's never used
  // the surface ("Archive" reads as an action verb / cold-storage noun).
  // The title uses the canonical pill, with TWO chips when both pieces
  // of status are meaningful:
  //   • Monitoring chip: the foundational national coverage signal,
  //     neutral-toned — passive surveillance.
  //   • Alert count chip (only when > 0): destructive-toned, explicit
  //     "N active" — the actionable queue. The count + literal word
  //     "active" reads instantly as "you have work."
  // The two chips carry different meanings, so they're given distinct
  // shapes/tones to keep the relationship legible rather than reading as
  // interchangeable peers.
  const titleNode = (
    <span className="inline-flex items-center gap-2">
      <Trans>Alerts</Trans>
      {/* The count chip sits BEFORE the monitoring chip so the read is
          "Alerts [N urgent] [Monitoring …]" — same order /today's section
          header uses.
          The active-count chip is the shared soft `CountPill` (the same
          dot-pill the rail head uses), not a solid destructive Badge that
          read as a tappable button. Same metric ("N active" = matched)
          and same look in both the page header and the detail rail head. */}
      {alertCount > 0 ? (
        // 2026-06-12 (critique #2 — red restraint): a STANDING count isn't an
        // alarm. The pill was permanently red, which broke the one-hot-cue
        // rule the rest of the page now obeys (red = URGENT pills + overdue
        // countdowns only). Neutral tone; the wording stays "open" (the chip
        // counts Review + Active combined, so "active" collided with the tab).
        <CountPill tone="neutral">
          <Plural value={alertCount} one="# open" other="# open" />
        </CountPill>
      ) : null}
      {/* The Monitoring chip is the shared `<MonitoringChip>` — the exact
          same dot + label + ghost-badge treatment /today renders. Here it
          takes the `to` variant so it stays the Sources navigation
          affordance (the standalone Sources button collapsed into it), and
          passes the live source-health status as the tooltip body — the
          chip LOOKS identical to /today; only the hover detail is
          page-specific. The trailing chevron is dropped to match /today
          (nav cue is the hover-deepen). */}
      {hasNationalMonitoringCoverage ? (
        <MonitoringChip
          to="/rules/sources"
          ariaLabel={t`Monitoring: Federal · 50 States · DC`}
          tooltip={
            !sourceHealthLoaded ? (
              <Trans>Checking source health…</Trans>
            ) : allSourcesHealthy ? (
              <Trans>All {monitoredSources.length} monitored sources operational</Trans>
            ) : (
              <Trans>
                {unhealthySourceCount} of {monitoredSources.length} sources need attention
              </Trans>
            )
          }
        />
      ) : null}
    </span>
  )
  return (
    /* MorningSweepProvider wraps the entire shell so its context flows
       to BOTH the actions cluster (where the header button consumes it)
       AND the embedded `<AlertsListPage>` (where it reads `active` to
       override its filter state). Without the wrapper, the button could
       read state but couldn't influence the alerts list, or vice versa. */
    <MorningSweepProvider>
      <RulesPageShell
        title={titleNode}
        // Lock the shell to viewport height so the list column and the
        // panel column each scroll independently, instead of competing
        // with a page-level scrollbar. Without this lock the shell's
        // middle wrapper has its own `overflow-y-auto` and the two
        // columns end up dragged by a single outer scrollbar.
        lockViewport
        wide
        // When an alert detail is open the page becomes the three-pane
        // layout (icon nav · 380px alert rail · detail). The shell's page
        // header (Alerts title + chips + actions) is unmounted so the
        // rail owns its own head — `compact` drops the header cleanly.
        compact={panelOpen}
        // Both list and detail states share the same outer page chrome;
        // only the inner column split changes when a detail opens. The
        // two columns (list + drawer) share whatever width the viewport
        // offers (no `min-w` floor that would force horizontal scroll on
        // sub-1440px viewports); each column scrolls vertically on its
        // own. `gap-8` (32px) matches /today's outer rhythm so top-level
        // pages share a uniform vertical cadence.
        contentClassName={cn(
          'gap-8 md:px-8 transition-[padding-bottom] duration-300 ease-apple motion-reduce:transition-none',
          // Full-page detail is flush — the three panes butt against each
          // other and the viewport, so strip the shell padding / gap /
          // width cap when open.
          panelOpen && '!max-w-none !gap-0 !p-0 md:!p-0',
        )}
        actions={
          // 2026-06-12 (Yuqi /alerts #10 "ghost buttons, remove borders"):
          // header actions are GHOST. The old outline rationale ("ghost
          // disappeared on the light-grey app background") died when list
          // pages went white — on white, ghost text+icon reads fine and
          // the borders were just chrome. Hover restores a soft fill.
          <>
            {/* The saved-view button renders FIRST in the actions
              cluster. Its toggle state + the alert-list filter override
              are shared via MorningSweepContext (see MorningSweepProvider
              wrapping). When pressed it toggles the context;
              AlertsListPage reads `active` and overrides its
              `timeRangeFilter` + `statusFilter` with the preset combo of
              "Last 24 hours" + "Needs Action". */}
            {/* Header buttons render at the canonical h-9 height — same as
                the filter triggers below — so they don't read as a
                different button family (sm/h-8 would sit 4px shorter than
                the filter chrome). */}
            {/* No standalone Sources button — the Sources selector lives
                in the title row chip. Actions cluster is My morning sweep
                + Alert history, matching the design. */}
            <MorningSweepHeaderButton />
            <Button nativeButton={false} variant="ghost" render={<Link to="/alerts/history" />}>
              <HistoryIcon data-icon="inline-start" />
              <Trans>Alert history</Trans>
            </Button>
          </>
        }
      >
        <AlertsListPage embedded />
      </RulesPageShell>
    </MorningSweepProvider>
  )
}

/**
 * Consumer of `MorningSweepContext` that renders the saved-view button
 * in the shell's actions cluster. Lives inline here (not in a primitives
 * file) because it's specific to this route's header layout — visual
 * differentiation: when `active` we use Button variant="secondary" (a
 * tinted filled button) to signal "this preset is currently applied",
 * matching the active state of the FilterTrigger pills inside the page.
 * When inactive: variant="ghost" so it sits in the same (borderless)
 * family as Alert history (Yuqi /alerts #10).
 */
function MorningSweepHeaderButton() {
  const { t } = useLingui()
  const sweep = useMorningSweep()
  if (!sweep) return null
  // The button toggles the inline digest panel (rendered above the
  // alerts list inside `AlertsListPage`) instead of opening a modal
  // Dialog. The variant flips to `secondary` when the panel is open so
  // the button reads as "this is what's currently showing" — same
  // pattern the filter-active state uses. When the panel's "Show me just
  // these alerts" CTA fires it sets the filter via `sweep.toggle()`
  // independently.
  // The "My morning sweep" action is an icon-only Coffee button so the
  // header action cluster stays compact. The label moves to the tooltip +
  // aria-label so the affordance stays discoverable and accessible. The
  // active (digest-open) state keeps the filled `secondary` treatment.
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={sweep.digestOpen ? 'secondary' : 'ghost'}
            // `icon` (size-9 / 36px) makes the coffee button the same
            // height as the h-9 "Alert history" button beside it so the
            // two header actions align (icon-sm/32px would sit shorter).
            size="icon"
            onClick={sweep.toggleDigest}
            aria-pressed={sweep.digestOpen}
            aria-expanded={sweep.digestOpen}
            aria-controls="morning-sweep-panel-title"
            aria-label={t`Toggle morning sweep briefing`}
          >
            {/* Round 51 — CoffeeIcon (morning ritual anchor). Pairs with
                the panel header's SparklesIcon (AI signal). */}
            <CoffeeIcon />
          </Button>
        }
      />
      <TooltipContent>
        <Trans>My morning sweep</Trans>
      </TooltipContent>
    </Tooltip>
  )
}
