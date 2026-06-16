import { useLingui } from '@lingui/react/macro'

import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import { SourcesTab } from '@/features/rules/sources-tab'

export function RulesSourcesRoute() {
  const { t } = useLingui()
  return (
    //   • 2026-06-16 (audit): breadcrumb parent is `/rules/library` so it
    //     matches /rules/temporary (the other rules-console child) — Sources
    //     lives under /rules and is reached from the Rule library's Sources
    //     button, so "Rule library › Sources" is the consistent IA. (Was
    //     "Alerts › Sources", which diverged from its sibling pages.)
    //   • `wide` flag matches every other content-heavy RulesPageShell
    //     consumer (/rules/pulse, /rules/library) at `max-w-page-expanded`
    //     (1440) instead of the default 1100. Sources is a data-grid
    //     surface, so it deserves the same width as its siblings.
    <RulesPageShell
      title={t`Sources`}
      wide
      // Aligns /rules/sources with the /today reference — max-w-page-expanded
      // (via `wide`), 32px horizontal padding (`md:px-8`, overriding the
      // shell default `md:px-6`), and a 32px section gap (`gap-8`,
      // overriding the shell default `gap-6`). twMerge resolves these
      // overrides over the shell base.
      contentClassName="gap-8 md:px-8"
      breadcrumbs={[{ label: t`Rule library`, to: '/rules/library' }, { label: t`Sources` }]}
    >
      <SourcesTab />
    </RulesPageShell>
  )
}
