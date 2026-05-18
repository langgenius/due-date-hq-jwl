import { useLingui } from '@lingui/react/macro'

import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import { RuleLibraryTab } from '@/features/rules/rule-library-tab'

export function RulesLibraryRoute() {
  const { t } = useLingui()
  return (
    <RulesPageShell
      title={t`Rule library`}
      description={t`Review pending templates, activate practice rules, and inspect active, rejected, or archived rule evidence in one table. Only active practice rules can generate client obligations or reminders.`}
    >
      <RuleLibraryTab />
    </RulesPageShell>
  )
}
