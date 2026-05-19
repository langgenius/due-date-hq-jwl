import { useLingui } from '@lingui/react/macro'

import { RuleLibraryTab } from '@/features/rules/rule-library-tab'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

/**
 * Rule library — the catalog and pending-review queue for owner / manager
 * governance work. The page is a single action surface (accept / activate
 * / reject / archive), no longer mixed with Coverage and Sources summary
 * strips.
 *
 * Coverage status now has its own sidebar destination at /rules/coverage,
 * where the situational read "do we have rules where clients file?" lives
 * alongside the per-jurisdiction matrix. Source-watcher health is surfaced
 * inline on the Coverage status page header and on Radar attention
 * callouts; the standalone table at /rules/sources is reachable from those
 * pointers and from ⌘K, but is not in the sidebar (incident-driven, not
 * daily-use).
 *
 * Earlier iterations stacked Coverage + Sources strips on top of the
 * Library table — see docs/dev-log/2026-05-18-rules-library-merge.md and
 * docs/dev-log/2026-05-18-rules-library-summary-strips.md. The split here
 * is the v4 IA: each page does one job, the strips' "view detail" pills
 * become first-class sidebar entries instead.
 */
export function RulesLibraryRoute() {
  const { t } = useLingui()
  return (
    <RulesPageShell
      title={t`Catalog`}
      description={t`Cross-jurisdiction catalog and admin tools. Coverage status handles the daily review queue with per-rule Accept/Reject and bulk-accept inline; this page is for cross-jurisdiction search, filter by tier or tax type, and inspecting rejected or archived evidence across the catalog.`}
    >
      <RuleLibraryTab />
    </RulesPageShell>
  )
}
