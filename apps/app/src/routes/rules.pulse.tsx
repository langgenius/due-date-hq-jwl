import { useLingui } from '@lingui/react/macro'

import { PulseChangesTab } from '@/features/pulse/AlertsListPage'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

export function RulesPulseRoute() {
  const { t } = useLingui()
  // 2026-05-25 (Yuqi Alerts #1, #13): breadcrumb dropped. Alerts is
  // now a top-level sidebar destination — the parent crumb back to
  // /rules/library was vestigial IA from when Alerts lived under
  // Rules. The PageHeader's own h1 stays (`title=Alerts`); only the
  // eyebrow / breadcrumb row above it disappears. AlertsListPage
  // continues to render embedded (no second h1).
  return (
    <RulesPageShell title={t`Alerts`}>
      <PulseChangesTab embedded />
    </RulesPageShell>
  )
}
