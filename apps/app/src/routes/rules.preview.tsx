import { useLingui } from '@lingui/react/macro'

import { GenerationPreviewTab } from '@/features/rules/generation-preview-tab'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

export function RulesPreviewRoute() {
  const { t } = useLingui()
  return (
    <RulesPageShell
      // One name everywhere — URL aside, this surface is the Annual
      // rollover (H1, breadcrumb, and the card below already say so).
      // Four different names (preview / Deadline preview / PREVIEW &
      // APPROVE / Annual rollover) meant none of them stuck.
      title={t`Annual rollover`}
      wide
      contentClassName="gap-8 md:px-8"
      breadcrumbs={[
        { label: t`Rule library`, to: '/rules/library' },
        { label: t`Annual rollover` },
      ]}
    >
      <GenerationPreviewTab />
    </RulesPageShell>
  )
}
