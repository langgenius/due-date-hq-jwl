import { useLingui } from '@lingui/react/macro'

import { CoverageTab } from '@/features/rules/coverage-tab'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

export function RulesCoverageRoute() {
  const { t } = useLingui()
  return (
    <RulesPageShell
      title={t`Coverage`}
      description={t`Sources are official federal, state, and DC materials. Only practice-accepted rules can generate reminder-ready obligations; pending templates remain review-only until an owner or manager accepts them.`}
    >
      <CoverageTab />
    </RulesPageShell>
  )
}
