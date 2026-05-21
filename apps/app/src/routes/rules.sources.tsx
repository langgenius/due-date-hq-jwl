import { useLingui } from '@lingui/react/macro'

import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import { SourcesTab } from '@/features/rules/sources-tab'

export function RulesSourcesRoute() {
  const { t } = useLingui()
  return (
    <RulesPageShell
      title={t`Sources`}
      breadcrumbs={[{ label: t`Rule library`, to: '/rules/library' }, { label: t`Sources` }]}
    >
      <SourcesTab />
    </RulesPageShell>
  )
}
