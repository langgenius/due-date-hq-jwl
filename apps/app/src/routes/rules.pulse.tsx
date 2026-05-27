import { useQuery } from '@tanstack/react-query'
import { Plural, Trans } from '@lingui/react/macro'
import { HistoryIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import { PulseChangesTab } from '@/features/pulse/AlertsListPage'
import {
  usePulseListAlertsQueryOptions,
  usePulseSourceHealthQueryOptions,
} from '@/features/pulse/api'
import { PulsingDot } from '@/features/pulse/components/PulsingDot'
import { usePulseDrawer } from '@/features/pulse/DrawerProvider'
import { enabledPulseSourceCount } from '@/features/pulse/lib/source-health-labels'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

const TOP_ALERTS_LIMIT = 50

export function RulesPulseRoute() {
  const { open: panelOpen } = usePulseDrawer()
  // 2026-05-26 (Yuqi /rules/pulse #9): fetch the alert count here
  // so the page header can show "Alerts (N)" — same query options
  // the embedded list uses, so React Query dedupes (one network
  // request, count rendered in both places).
  const alertsQuery = useQuery(usePulseListAlertsQueryOptions(TOP_ALERTS_LIMIT))
  const alertCount = alertsQuery.data?.alerts.length ?? 0
  // 2026-05-27 (Yuqi header unification pass): source-monitoring count
  // promoted from supporting body copy (was an inline Binoculars +
  // "Monitoring N sources" line below the all-clear banner) into a
  // status chip in the page header. The watcher being alive is the
  // page's foundational state — it belongs in the title row, not in
  // a paragraph below the fold. Same query is also read by
  // AlertsListPage's empty-state banner so React Query dedupes
  // (one network request, two render sites).
  const sourceHealthQuery = useQuery(usePulseSourceHealthQueryOptions())
  const monitoringCount = enabledPulseSourceCount(sourceHealthQuery.data?.sources ?? [])

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
  //   • Monitoring chip (always visible when sources exist): the
  //     foundational "watcher is alive" signal. Pulsing green dot
  //     + "Monitoring N sources" label, sized to match the other
  //     count chips across the app shell.
  //   • Alert count chip (only when > 0): destructive-toned pill
  //     so an active queue reads with appropriate urgency.
  const titleNode = (
    <span className="inline-flex items-center gap-2">
      <Trans>Alerts</Trans>
      {monitoringCount > 0 ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-state-base-hover px-2 py-0.5 text-xs font-medium text-text-secondary">
          <PulsingDot tone="success" active className="size-1.5" />
          <Trans>
            Monitoring <Plural value={monitoringCount} one="# source" other="# sources" />
          </Trans>
        </span>
      ) : null}
      {alertCount > 0 ? (
        <span className="rounded-full bg-state-destructive-hover px-2 py-0.5 text-xs font-medium tabular-nums text-text-destructive">
          {alertCount}
        </span>
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
      contentClassName={cn(
        'transition-[max-width,min-width,padding-bottom] duration-300 ease-apple motion-reduce:transition-none',
        panelOpen ? 'max-w-page-expanded min-w-[1440px] !pb-0 md:!pb-0' : 'max-w-page-wide min-w-0',
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
        <Button
          nativeButton={false}
          variant="outline"
          size="sm"
          render={<Link to="/rules/pulse/history" />}
        >
          <HistoryIcon data-icon="inline-start" />
          <Trans>Alert history</Trans>
        </Button>
      }
    >
      <PulseChangesTab embedded />
    </RulesPageShell>
  )
}
