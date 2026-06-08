import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ChevronRightIcon, CoffeeIcon, DatabaseIcon, HistoryIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { MVP_RULE_JURISDICTIONS } from '@duedatehq/core/rules'
import { cn } from '@duedatehq/ui/lib/utils'

import { AlertsListPage } from '@/features/alerts/AlertsListPage'
import { useAlertsListQueryOptions, useAlertSourceHealthQueryOptions } from '@/features/alerts/api'
import { useAlertDrawer } from '@/features/alerts/DrawerProvider'
import { MorningSweepProvider, useMorningSweep } from '@/features/alerts/MorningSweepContext'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

const TOP_ALERTS_LIMIT = 50
const NATIONAL_MONITORING_JURISDICTION_COUNT = 52

export function AlertsRoute() {
  const { t } = useLingui()
  const { open: panelOpen } = useAlertDrawer()
  // 2026-05-26 (Yuqi /alerts #9): fetch the alert count here
  // so the page header can show "Alerts (N)" — same query options
  // the embedded list uses, so React Query dedupes (one network
  // request, count rendered in both places).
  const alertsQuery = useQuery(useAlertsListQueryOptions(TOP_ALERTS_LIMIT))
  const alertCount = alertsQuery.data?.alerts.length ?? 0
  // 2026-06-08 (Yuqi /alerts #1 "where is it showing it is all working?"):
  // the Sources selector chip carries a live health dot so the CPA can SEE
  // monitoring is healthy at a glance. Same `listSourceHealth` query the
  // list page polls (React Query dedupes), reduced to a green/amber signal
  // + a tooltip count. Only enabled sources count toward the health roll-up.
  const sourceHealthQuery = useQuery(useAlertSourceHealthQueryOptions())
  const monitoredSources = (sourceHealthQuery.data?.sources ?? []).filter((s) => s.enabled)
  const unhealthySourceCount = monitoredSources.filter(
    (s) => s.healthStatus !== 'healthy',
  ).length
  const sourceHealthLoaded = monitoredSources.length > 0
  const allSourcesHealthy = sourceHealthLoaded && unhealthySourceCount === 0
  // 2026-05-28 (source automation remediation): this chip is a
  // product coverage metric, not an adapter/source-health count.
  // Parser-backed baseline sources can grow to hundreds of adapters
  // while the CPA-facing promise remains national coverage.
  const hasNationalMonitoringCoverage =
    MVP_RULE_JURISDICTIONS.length === NATIONAL_MONITORING_JURISDICTION_COUNT

  // 2026-05-25 (Yuqi Alerts #1, #13): breadcrumb dropped. Alerts is
  // now a top-level sidebar destination — the parent crumb back to
  // /rules/library was vestigial IA from when Alerts lived under
  // Rules. The PageHeader's own h1 stays (`title=Alerts`); only the
  // eyebrow / breadcrumb row above it disappears. AlertsListPage
  // continues to render embedded (no second h1).
  // 2026-05-25 (Yuqi sidebar polish): "Alerts archive" was a separate
  // footer entry in the sidebar nav. Pulled it out of the sidebar
  // and surfaced here as the page's primary header action — the
  // archive is a sub-view of /alerts (closed alerts on the same
  // surface), not a peer of Audit log / Settings, so it belongs in
  // the page chrome instead of the global nav. Same destination
  // (/alerts/history), just a more honest IA.
  // 2026-05-26 (Yuqi /alerts #10): rename Archive → Alert
  // history — clearer label for a CPA who's never used the
  // surface. "Archive" is the action verb / cold-storage noun;
  // "Alert history" is the destination's actual name.
  // 2026-05-27 (Yuqi header unification pass): title chip styling
  // realigned with /clients, /deadlines, /today. Previous treatment
  // diverged on three axes — items-baseline (not items-center),
  // text-base font-normal (not text-xs font-medium), and bare text
  // without the rounded-full pill background — which made the chip
  // read as a different design system the moment alerts existed.
  // Now uses the canonical pill, with TWO chips when both pieces
  // of status are meaningful:
  //   • Monitoring chip: the foundational national coverage signal.
  //   • Alert count chip (only when > 0): destructive-toned pill
  //     so an active queue reads with appropriate urgency.
  // 2026-05-27 (Yuqi IA pass — disambiguate monitoring vs alerts):
  // the two sibling chips were reading as peers but carry different
  // meanings — "Monitoring Federal + 50 states + DC" is the always-on coverage
  // signal; the bare
  // "4" alert pill is the actionable queue ("4 alerts open right
  // now"). They looked alike enough that Yuqi flagged the
  // relationship as opaque. Fix: the alert pill is now explicit
  // ("N active") and keeps its destructive tone, while the
  // monitoring chip stays neutral. Two distinct shapes / two
  // distinct meanings — one passive surveillance, one active
  // queue. The destructive-toned chip with a count + literal word
  // "active" reads instantly as "you have work."
  const titleNode = (
    <span className="inline-flex items-center gap-2">
      <Trans>Alerts</Trans>
      {/* 2026-06-04 round 83 (Yuqi #6 "like how we had it on
          today page. order before the monitoring"): count chip
          moved BEFORE the monitoring chip so the read is
          "Alerts [N urgent] [Monitoring …]" — same order /today's
          section header uses. Also flipped variant `secondary` →
          `outline` (matches round 81 #3 — /today switched the
          equivalent badge to outline same round). */}
      {/* 2026-06-08 (Yuqi "study closer at the pencil design" — Pencil
          g5kKJQ `JMGLU`): the active-count chip is the red destructive
          pill in the design (#fef3f2 / destructive border + text), not
          the neutral outline. */}
      {alertCount > 0 ? (
        <Badge variant="destructive" size="lg" className="gap-1 tabular-nums">
          <span>{alertCount}</span>
          <span>
            <Trans>urgent</Trans>
          </span>
        </Badge>
      ) : null}
      {/* 2026-06-08 (Pencil g5kKJQ `kdHsZ`): the second title chip is
          the blue Sources SELECTOR — database icon + "Sources · Federal
          + 50 states + DC" + chevron, linking to /rules/sources — not a
          passive gray "Monitoring" status chip. Consolidating the
          source affordance here lets the standalone Sources action
          button drop out of the cluster (it's now this chip). */}
      {hasNationalMonitoringCoverage ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                to="/rules/sources"
                className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[#155aef40] bg-state-accent-hover px-2.5 text-[13px] font-medium text-text-accent transition-colors hover:bg-state-accent-active-alt"
                aria-label={t`Sources · Federal + 50 states + DC`}
              >
                {/* 2026-06-08 (Yuqi /alerts): the leading health dot is
                    dropped — the source-health signal lives in the tooltip
                    copy below. The chip leads cleanly with the database icon. */}
                <DatabaseIcon className="size-3 shrink-0" aria-hidden />
                <Trans>Sources · Federal + 50 states + DC</Trans>
                <ChevronRightIcon className="size-3 shrink-0" aria-hidden />
              </Link>
            }
          />
          <TooltipContent>
            {!sourceHealthLoaded ? (
              <Trans>Checking source health…</Trans>
            ) : allSourcesHealthy ? (
              <Trans>All {monitoredSources.length} monitored sources operational</Trans>
            ) : (
              <Trans>
                {unhealthySourceCount} of {monitoredSources.length} sources need attention
              </Trans>
            )}
          </TooltipContent>
        </Tooltip>
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
        // 2026-05-26 (Yuqi /alerts seventh pass — column-scroll
        // architecture): lock the shell to viewport height so the
        // list column and the panel column each scroll
        // independently, instead of competing with a page-level
        // scrollbar. Without this lock the shell's middle wrapper
        // has its own `overflow-y-auto` and the two columns end up
        // dragged by a single outer scrollbar.
        lockViewport
        wide
        // 2026-06-08 (Pencil ibEoz full-page detail): when an alert
        // detail is open the page becomes the three-pane layout
        // (icon nav · 380px alert rail · detail). The shell's page
        // header (Alerts title + chips + actions) is unmounted so the
        // rail owns its own head — `compact` drops the header cleanly.
        compact={panelOpen}
        // 2026-05-26 (Yuqi /alerts ninth pass #1): width handling
        // is now PANEL-AWARE.
        //   • Panel closed: keep the default `max-w-page-wide`
        //     (no override) so the page reads the same width as
        //     /today — that's the empty/scan state.
        //   • Panel open: drop the cap AND set `min-w-[1440px]` so
        //     the inner row is guaranteed at least 1440px wide
        //     (which equals the app-shell's outer cap).
        // 2026-05-26 (Yuqi twentieth pass): when panel is open also
        // strip the bottom padding (`pb-0 md:pb-0`) so the panel's
        // sticky action footer sits flush against the bottom of the
        // viewport — no dead gray strip between footer and inset
        // edge.
        // 2026-05-26 (Yuqi thirty-ninth pass — no more layout jump):
        // contentClassName is now ALWAYS applied (not conditional)
        // with a CSS transition for `max-width`, `min-width`, and
        // `padding-bottom`. Previously these three properties
        // SNAPPED on `panelOpen` flip (max-w-page-wide → max-w-none
        // / min-w-0 → min-w-[1440px]) — the container jumped width
        // BEFORE the motion library's panel animation started, which
        // is what Yuqi flagged as "still jumping around." Now all
        // three properties interpolate smoothly with the same
        // 300ms swiftOut curve the panel motion uses.
        //
        // Tradeoffs:
        //   • Open state uses `max-w-[1440px]` (not max-none) so
        //     CSS can transition between defined endpoints
        //     (`max-width: none` isn't animatable). 1440px matches
        //     the app-shell's outer cap so there's no functional
        //     difference.
        //   • `!important` retained on pb-0 since the underlying
        //     shell pads pb-4 md:pb-6 by default.
        // 2026-05-27 (Yuqi feedback "这个不能一整个horizontal scroll"):
        // dropped `min-w-[1440px]` when panel is open. That forced the
        // whole page wider than the viewport on anything under 1440px
        // (Yuqi's review viewport was 1469×992 — only 29px above the
        // floor, and any sidebar collapse / dpr quirk pushed it over).
        // The two columns (list + drawer) now share whatever width the
        // viewport offers; each column scrolls vertically on its own.
        // 2026-06-04 round 24 (Yuqi Pencil J2ZHih + tgX5T — "/alerts
        // option 1 and option 2, should be exact the same"): both
        // Pencil designs ship the SAME page chrome — Main padding
        // [32, 64] and section gap 28 — regardless of whether the
        // alert detail panel is open. Page-shell defaults
        // (`gap-6 md:px-6 pb-4 md:pb-6`) were tighter than Pencil
        // intends. Override here to:
        //   • md:px-16 (64px horizontal at md+, matching Pencil [32, 64])
        //   • gap-7 (28px between sections, matching Pencil gap 28)
        // Both states (list + detail) now share the same outer
        // dimensions; only the inner column split changes when a
        // detail opens.
        contentClassName={cn(
          /* 2026-06-04 round 42 (Yuqi consistency follow-up #2 —
           "follow today's"): section gap `gap-7` (28px) → `gap-8`
           (32px) so /alerts matches /today's outer rhythm. Pencil
           originally specified gap-28 for this surface; /today
           uses gap-32 per Pencil VmcdD. Aligning both pages on
           gap-8 gives top-level pages a uniform vertical cadence. */
          'gap-8 md:px-16 transition-[padding-bottom] duration-300 ease-apple motion-reduce:transition-none',
          // 2026-06-08 (Pencil ibEoz): full-page detail is flush —
          // the three panes butt against each other and the viewport,
          // so strip the shell padding / gap / width cap when open.
          panelOpen && '!max-w-none !gap-0 !p-0 md:!p-0',
        )}
        actions={
          // 2026-05-27 (Yuqi header unification pass): reverted from
          // variant="ghost" → variant="outline" so the button matches
          // /clients's "Import history" sibling — both are
          // navigation-to-history affordances on a top-level page, so
          // they should read with the same weight. Ghost on the
          // light-grey app background was disappearing entirely
          // (no border, no fill — only the icon carried weight).
          // The earlier "quieter than the title" rationale still
          // applies, but outline already satisfies it without
          // collapsing into pure text.
          // 2026-06-04 round 20 (Yuqi /rules/pulse feedback #4
          // "missing Sources button"): added a Sources button next
          // to Alert history. The Sources page (/rules/sources) is
          // where the CPA goes to manage what feeds the alerts they
          // see here — a natural sibling affordance. Order: Sources
          // (configure inputs) → Alert history (review outputs).
          <>
            {/* 2026-06-04 round 38, item 10 (Yuqi 11-item feedback —
              "My morning sweep can be beside Sources, Alert history
              button"): saved-view button rendered FIRST in the
              actions cluster (left of Sources). The toggle state +
              the alert-list filter override are shared via
              MorningSweepContext (see MorningSweepProvider
              wrapping). When pressed the button toggles the
              context; AlertsListPage reads `active` and overrides
              its `timeRangeFilter` + `statusFilter` with the
              preset combo of "Last 24 hours" + "Needs Action". */}
            {/* Round 83 #15 (Yuqi "the button style should match
                the dropdown button"): dropped `size="sm"` so the
                Sources + Alert history buttons render at the
                canonical h-9 height — same as the filter
                triggers below. The `sm` size (h-8) sat 4px
                shorter than the h-10 filter chrome and read as
                two different button families. */}
            {/* 2026-06-08 (Pencil g5kKJQ `rOipx`): the standalone
                Sources button is dropped — the Sources selector now
                lives in the title row chip (kdHsZ). Actions cluster is
                My morning sweep + Alert history, matching the design. */}
            <MorningSweepHeaderButton />
            <Button nativeButton={false} variant="outline" render={<Link to="/alerts/history" />}>
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
 * When inactive: variant="outline" so it sits in the same family as
 * Sources / Alert history.
 */
function MorningSweepHeaderButton() {
  const { t } = useLingui()
  const sweep = useMorningSweep()
  if (!sweep) return null
  // 2026-06-04 round 52 (Yuqi "can you click it and it inserts a
  // side panel or a panel before the alert list about the digest"):
  // the button toggles the inline digest panel (rendered above the
  // alerts list inside `AlertsListPage`) instead of opening a modal
  // Dialog. The variant flips to `secondary` when the panel is open
  // so the button reads as "this is what's currently showing" — same
  // pattern the filter-active state used. When the panel's "Show me
  // just these alerts" CTA fires it sets the filter via
  // `sweep.toggle()` independently.
  // 2026-06-08 (Yuqi /alerts #1 "reduce to a coffee icon"): the labelled
  // "My morning sweep" pill collapses to an icon-only Coffee button so the
  // header action cluster stays compact. The label moves to the tooltip +
  // aria-label so the affordance stays discoverable and accessible. The
  // active (digest-open) state keeps the filled `secondary` treatment.
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={sweep.digestOpen ? 'secondary' : 'outline'}
            // 2026-06-08 (Yuqi "different height"): icon-sm (32px) sat
            // shorter than the h-9 "Alert history" button beside it. `icon`
            // (size-9 / 36px) makes the coffee button the same height so the
            // two header actions align.
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
