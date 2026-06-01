import { useQuery } from '@tanstack/react-query'
import { Trans } from '@lingui/react/macro'
import { HistoryIcon, RadioTowerIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { MVP_RULE_JURISDICTIONS } from '@duedatehq/core/rules'
import { cn } from '@duedatehq/ui/lib/utils'

import { PulseChangesTab } from '@/features/pulse/AlertsListPage'
import { usePulseListAlertsQueryOptions } from '@/features/pulse/api'
import { PulsingDot } from '@/features/pulse/components/PulsingDot'
import { usePulseDrawer } from '@/features/pulse/DrawerProvider'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

const TOP_ALERTS_LIMIT = 50
const NATIONAL_MONITORING_JURISDICTION_COUNT = 52

export function RulesPulseRoute() {
  const { open: panelOpen } = usePulseDrawer()
  // 2026-05-26 (Yuqi /rules/pulse #9): fetch the alert count here
  // so the page header can show "Alerts (N)" — same query options
  // the embedded list uses, so React Query dedupes (one network
  // request, count rendered in both places).
  const alertsQuery = useQuery(usePulseListAlertsQueryOptions(TOP_ALERTS_LIMIT))
  const alertCount = alertsQuery.data?.alerts.length ?? 0
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
  // (/rules/pulse/history), just a more honest IA.
  // 2026-05-26 (Yuqi /rules/pulse #10): rename Archive → Alert
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
      {hasNationalMonitoringCoverage ? (
        // 2026-06-01: swapped hand-rolled monitoring pill for
        // Badge (variant="secondary" size="lg") — same canonical
        // PageHeader chip shape, with PulsingDot as a leading child.
        <Badge variant="secondary" size="lg">
          {/* 2026-05-29 (PR #38): dropped the `size-1.5` override on
              PulsingDot so this monitoring chip's dot matches every
              other PulsingDot use in the app (Today header chip,
              source-health states, etc.). */}
          <PulsingDot tone="success" active />
          <Trans>Monitoring Federal + 50 states + DC</Trans>
        </Badge>
      ) : null}
      {alertCount > 0 ? (
        // 2026-06-01: swapped hand-rolled destructive count pill
        // for Badge (variant="destructive" size="lg").
        <Badge variant="destructive" size="lg">
          <span className="tabular-nums">{alertCount}</span>
          <span>
            <Trans>active</Trans>
          </span>
        </Badge>
      ) : null}
    </span>
  )
  return (
    <RulesPageShell
      title={titleNode}
      // 2026-05-26 (Yuqi /rules/pulse seventh pass — column-scroll
      // architecture): lock the shell to viewport height so the
      // list column and the panel column each scroll
      // independently, instead of competing with a page-level
      // scrollbar. Without this lock the shell's middle wrapper
      // has its own `overflow-y-auto` and the two columns end up
      // dragged by a single outer scrollbar.
      lockViewport
      wide
      // 2026-05-26 (Yuqi /rules/pulse ninth pass #1): width handling
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
      contentClassName={cn(
        'transition-[padding-bottom] duration-300 ease-apple motion-reduce:transition-none',
        panelOpen && '!pb-0 md:!pb-0',
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
        // 2026-05-27 (Yuqi IA pass — Sources affordance): the
        // monitoring chip in the title declares "we're watching N
        // sources" but there was no way to navigate to the source
        // catalog from this page. Added a Sources button alongside
        // Alert history so the CPA can jump straight to
        // /rules/sources (manage, pause, add a source) from the
        // alert surface. Both buttons are outline variants — sibling
        // navigations of equal weight. Sources sits first since
        // "what we're watching" is the upstream of "what we
        // surfaced."
        <>
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link to="/rules/sources" />}
          >
            <RadioTowerIcon data-icon="inline-start" />
            <Trans>Sources</Trans>
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link to="/rules/pulse/history" />}
          >
            <HistoryIcon data-icon="inline-start" />
            <Trans>Alert history</Trans>
          </Button>
        </>
      }
    >
      <PulseChangesTab embedded />
    </RulesPageShell>
  )
}
