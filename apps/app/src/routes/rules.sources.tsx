import { useLingui } from '@lingui/react/macro'

import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import { SourcesTab } from '@/features/rules/sources-tab'

export function RulesSourcesRoute() {
  const { t } = useLingui()
  return (
    <RulesPageShell
      title={t`Sources`}
      description={t`Official channels watched for rule changes — health, cadence, and acquisition method per source. Click any row to open the official page in a new tab. Source changes create practice review tasks; they never silently update active rules.`}
    >
      <SourcesTab />
    </RulesPageShell>
  )
}
