import { useLingui } from '@lingui/react/macro'

import { PulseChangesTab } from '@/features/pulse/AlertsListPage'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

/**
 * /rules/pulse/history — the closed-alerts archive.
 *
 * 2026-05-25 (Yuqi Alerts #2 — sub-page sweep): history was
 * previously a soft-filter on /rules/pulse ("View history" button
 * just pre-set the status filter to `applied`). Yuqi asked for it
 * to be a dedicated sub-page or sidebar entry. This route mounts
 * `PulseChangesTab` with `historyMode={true}` so the same list
 * code paths are reused.
 *
 * 2026-05-26 (Yuqi /rules/pulse #11): the route had no obvious
 * back-out — clicking "Archive" / "Alert history" took the CPA
 * here and they had to navigate via the sidebar to return. Added
 * a breadcrumb (`Alerts › Alert history`) so the parent path is
 * one click away in the page header.
 * 2026-05-26 (Yuqi /rules/pulse #10): title renamed `Alerts
 * archive` → `Alert history` to match the new button label.
 */
export function RulesPulseHistoryRoute() {
  const { t } = useLingui()
  return (
    <RulesPageShell
      title={t`Alert history`}
      breadcrumbs={[{ label: t`Alerts`, to: '/rules/pulse' }]}
    >
      <PulseChangesTab embedded historyMode />
    </RulesPageShell>
  )
}
