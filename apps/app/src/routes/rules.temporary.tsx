import { useLingui } from '@lingui/react/macro'

import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import { TemporaryRulesTab } from '@/features/rules/temporary-rules-tab'

export function RulesTemporaryRoute() {
  const { t } = useLingui()
  return (
    <RulesPageShell title={t`Temporary rules`}>
      <TemporaryRulesTab />
    </RulesPageShell>
  )
}
