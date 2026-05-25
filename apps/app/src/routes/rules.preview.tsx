import { useLingui } from '@lingui/react/macro'

import { GenerationPreviewTab } from '@/features/rules/generation-preview-tab'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

export function RulesPreviewRoute() {
  const { t } = useLingui()
  return (
    <RulesPageShell
      title={t`Deadline preview`}
      breadcrumbs={[
        { label: t`Rule library`, to: '/rules/library' },
        { label: t`Preview & approve` },
      ]}
    >
      <GenerationPreviewTab />
    </RulesPageShell>
  )
}
