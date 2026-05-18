import { useLingui } from '@lingui/react/macro'

import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import { TemporaryRulesTab } from '@/features/rules/temporary-rules-tab'

export function RulesTemporaryRoute() {
  const { t } = useLingui()
  return (
    <RulesPageShell
      title={t`Temporary rules`}
      description={t`Applied Radar exceptions that are currently changing obligation due dates. Review scope, source evidence, active obligation count, and open the Radar detail when a temporary rule needs revert or follow-up.`}
    >
      <TemporaryRulesTab />
    </RulesPageShell>
  )
}
