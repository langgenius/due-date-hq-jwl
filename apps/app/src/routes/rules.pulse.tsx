import { useLingui } from '@lingui/react/macro'

import { PulseChangesTab } from '@/features/pulse/AlertsListPage'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

export function RulesPulseRoute() {
  const { t } = useLingui()
  return (
    <RulesPageShell
      title={t`Pulse Notification`}
      breadcrumbs={[{ label: t`Rule library`, to: '/rules/library' }, { label: t`Pulse alerts` }]}
    >
      <PulseChangesTab embedded />
    </RulesPageShell>
  )
}
