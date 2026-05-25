import { useQuery } from '@tanstack/react-query'
import { Trans } from '@lingui/react/macro'
import { HistoryIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@duedatehq/ui/components/ui/button'

import { PulseChangesTab } from '@/features/pulse/AlertsListPage'
import { usePulseListAlertsQueryOptions } from '@/features/pulse/api'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

const TOP_ALERTS_LIMIT = 50

export function RulesPulseRoute() {
  // 2026-05-26 (Yuqi /rules/pulse #9): fetch the alert count here
  // so the page header can show "Alerts (N)" — same query options
  // the embedded list uses, so React Query dedupes (one network
  // request, count rendered in both places).
  const alertsQuery = useQuery(usePulseListAlertsQueryOptions(TOP_ALERTS_LIMIT))
  const alertCount = alertsQuery.data?.alerts.length ?? 0

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
  // 2026-05-26 (Yuqi /rules/pulse follow-up #2): title format
  // changed from "Alerts (N)" parentheses to "Alerts · N" with a
  // separate font-mono span — matches the pattern used on
  // /clients, /rules/library, /deadlines (title + count chip).
  // The parentheses style was a one-off here.
  // 2026-05-26 (Yuqi /rules/pulse follow-up #3): "Alert history"
  // action button variant outline → ghost. Same reasoning as the
  // /deadlines Columns button — header actions that are
  // navigations (not destructive / not primary) should read
  // quieter than the title.
  const titleNode =
    alertCount > 0 ? (
      <span className="inline-flex items-baseline gap-2">
        <Trans>Alerts</Trans>
        <span className="font-mono text-base font-normal tabular-nums text-text-tertiary">
          {alertCount}
        </span>
      </span>
    ) : (
      <Trans>Alerts</Trans>
    )
  return (
    <RulesPageShell
      title={titleNode}
      actions={
        <Button variant="ghost" size="sm" render={<Link to="/rules/pulse/history" />}>
          <HistoryIcon data-icon="inline-start" />
          <Trans>Alert history</Trans>
        </Button>
      }
    >
      <PulseChangesTab embedded />
    </RulesPageShell>
  )
}
