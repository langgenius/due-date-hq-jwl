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
 * code paths are reused — the only differences are:
 *   • Initial status filter is `applied` (most common terminal
 *     state); CPA can switch to dismissed / reverted / snoozed
 *     via the status dropdown.
 *   • Page title is "Alerts archive" (vs "Alerts" on the live
 *     page).
 *   • The "View history" cross-link is hidden in the header
 *     since we're already on it.
 *
 * Sidebar nav surfaces this under `Alerts archive` in the
 * footer area (next to Audit log) — both are retrospective
 * surfaces, not daily-driver destinations.
 */
export function RulesPulseHistoryRoute() {
  const { t } = useLingui()
  return (
    <RulesPageShell title={t`Alerts archive`}>
      <PulseChangesTab embedded historyMode />
    </RulesPageShell>
  )
}
