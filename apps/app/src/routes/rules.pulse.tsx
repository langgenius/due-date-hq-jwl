import { useLingui } from '@lingui/react/macro'

import { PulseChangesTab } from '@/features/pulse/AlertsListPage'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

export function RulesPulseRoute() {
  const { t } = useLingui()
  return (
    <RulesPageShell
      title={t`Pulse changes`}
      description={t`Source-backed government changes that may affect client deadlines. Owners and managers review affected clients, apply temporary exceptions, dismiss noise, or revisit closed changes here.`}
    >
      <PulseChangesTab embedded />
    </RulesPageShell>
  )
}
