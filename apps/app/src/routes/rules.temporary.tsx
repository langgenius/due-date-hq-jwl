import { useLingui } from '@lingui/react/macro'

import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import { TemporaryRulesTab } from '@/features/rules/temporary-rules-tab'

export function RulesTemporaryRoute() {
  const { t } = useLingui()
  return (
    // Aligns with /rules/sources + /rules/library — `wide`
    // (max-w-page-expanded, 1440), 32px section gap + horizontal padding,
    // and a breadcrumb back to the library so this rail-reached page reads
    // like its siblings, not a narrower outlier.
    <RulesPageShell
      title={t`Temporary rules`}
      wide
      contentClassName="gap-8 md:px-8"
      breadcrumbs={[
        { label: t`Rule library`, to: '/rules/library' },
        { label: t`Temporary rules` },
      ]}
    >
      <TemporaryRulesTab />
    </RulesPageShell>
  )
}
