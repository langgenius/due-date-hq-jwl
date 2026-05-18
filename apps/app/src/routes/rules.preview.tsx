import { useLingui } from '@lingui/react/macro'

import { GenerationPreviewTab } from '@/features/rules/generation-preview-tab'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

export function RulesPreviewRoute() {
  const { t } = useLingui()
  return (
    <RulesPageShell
      title={t`Obligation preview`}
      description={t`Input client facts → dry-run rules engine → see which obligations would be created. Reminder-ready obligations fire 30 / 7 / 1-day reminders; requires-review items surface for CPA confirmation, never auto-reminded.`}
    >
      <GenerationPreviewTab />
    </RulesPageShell>
  )
}
