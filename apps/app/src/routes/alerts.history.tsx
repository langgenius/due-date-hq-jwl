import { useLingui } from '@lingui/react/macro'

import { AlertsListPage } from '@/features/alerts/AlertsListPage'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

/**
 * /alerts/history — the closed-alerts archive.
 *
 * 2026-05-25 (Yuqi Alerts #2 — sub-page sweep): history was
 * previously a soft-filter on /alerts ("View history" button
 * just pre-set the status filter to `applied`). Yuqi asked for it
 * to be a dedicated sub-page or sidebar entry. This route mounts
 * `AlertsListPage` with `historyMode={true}` so the same list
 * code paths are reused.
 *
 * 2026-05-26 (Yuqi /alerts #11): the route had no obvious
 * back-out — clicking "Archive" / "Alert history" took the CPA
 * here and they had to navigate via the sidebar to return. Added
 * a breadcrumb (`Alerts › Alert history`) so the parent path is
 * one click away in the page header.
 * 2026-05-26 (Yuqi /alerts #10): title renamed `Alerts
 * archive` → `Alert history` to match the new button label.
 */
export function AlertsHistoryRoute() {
  const { t } = useLingui()
  return (
    <RulesPageShell
      title={t`Alert history`}
      // 2026-05-26 (Yuqi /alerts seventh pass): same
      // viewport-lock as /alerts so the history list scrolls
      // inside its own column instead of pushing a page-level
      // scrollbar.
      lockViewport
      breadcrumbs={[{ label: t`Alerts`, to: '/alerts' }]}
    >
      <AlertsListPage embedded historyMode />
    </RulesPageShell>
  )
}
