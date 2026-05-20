import { useLingui } from '@lingui/react/macro'

import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import { SourcesTab } from '@/features/rules/sources-tab'

export function RulesSourcesRoute() {
  const { t } = useLingui()
  return (
    <RulesPageShell title={t`Sources`}>
      <SourcesTab />
    </RulesPageShell>
  )
}
