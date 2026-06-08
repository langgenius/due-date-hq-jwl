import { useLingui } from '@lingui/react/macro'

import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import { SourcesTab } from '@/features/rules/sources-tab'

export function RulesSourcesRoute() {
  const { t } = useLingui()
  return (
    // 2026-06-04 round 81 (Yuqi "clicking into sources from Alert
    // page there is no where to go back to alerts. and the visual
    // is not really consistent with any other page"):
    //   • Breadcrumb parent flipped `/rules/library` → `/rules/pulse`
    //     so a CPA who entered Sources via the Alerts page Sources
    //     button has a one-click back-out to /alerts.
    //   • `wide` flag added to match every other content-heavy
    //     RulesPageShell consumer (/rules/pulse, /rules/library) at
    //     `max-w-page-expanded` (1440) instead of the default 1100.
    //     The 1100 cap was the "not really consistent with any
    //     other page" the user flagged — Sources is a data-grid
    //     surface, it deserves the same width as its siblings.
    <RulesPageShell
      title={t`Sources`}
      wide
      // 2026-06-08 (Yuqi list-page width-rhythm standardization): align
      // /rules/sources with the /today reference — max-w-page-expanded
      // (via `wide`), 32px horizontal padding (`md:px-8`, overriding the
      // shell default `md:px-6`), and a 32px section gap (`gap-8`,
      // overriding the shell default `gap-6`). twMerge resolves these
      // overrides over the shell base.
      contentClassName="gap-8 md:px-8"
      breadcrumbs={[{ label: t`Alerts`, to: '/alerts' }, { label: t`Sources` }]}
    >
      <SourcesTab />
    </RulesPageShell>
  )
}
