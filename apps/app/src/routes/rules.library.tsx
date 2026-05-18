import { useCallback, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { useLingui } from '@lingui/react/macro'

import type { RuleJurisdiction } from '@duedatehq/contracts'

import { CoverageTab } from '@/features/rules/coverage-tab'
import { RuleLibraryTab } from '@/features/rules/rule-library-tab'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import { SourcesTab } from '@/features/rules/sources-tab'

/**
 * Merged Rule library — the single governance page for the rule catalog.
 * Composes three previously-separate views stacked top-to-bottom:
 *
 *   1. Coverage — read-only situational map (KPI strip + jurisdiction
 *      summary + entity coverage matrix). "Do we have rules where we
 *      need them?"
 *   2. Sources — official-channel registry with watcher health. "Are
 *      the upstream feeds we depend on still working?"
 *   3. Rule library — pending review queue and active rules table.
 *      "Which rules do we accept, reject, or archive?"
 *
 * Each section has an anchor (`#coverage`, `#sources`, `#library`) so
 * deep links from the dashboard banner, Pulse alerts, or external docs
 * land on the right section. The standalone `/rules/coverage` and
 * `/rules/sources` routes remain accessible for callers that want a
 * focused single-view URL.
 */
export function RulesLibraryRoute() {
  const { t } = useLingui()
  const [, setSearchParams] = useSearchParams()

  // Coverage's pending-count cells drill into the Library section by pushing
  // the matching filters into the URL — Library's filter state lives in
  // `?library` / `?jur` (see `rule-library-tab.tsx`) so an external setter
  // is just a URL update. Scroll the Library heading into view after the
  // params land so the user sees the filtered table without manual scrolling.
  const handleJurisdictionDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.set('library', 'pending_review')
          next.set('jur', jurisdiction)
          return next
        },
        { replace: true },
      )
      // Defer the scroll one tick so the URL-driven re-render commits and
      // the table reflects the new filter before the viewport moves.
      requestAnimationFrame(() => {
        document.getElementById('library')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    },
    [setSearchParams],
  )

  return (
    <RulesPageShell
      title={t`Rule library`}
      description={t`Practice rule catalog — coverage map at the top, source-watcher health, pending review queue, and the active rule ledger in one place. Only accepted rules can generate client obligations or reminders.`}
    >
      <MergedSection id="coverage" heading={t`Coverage`}>
        <CoverageTab onJurisdictionDrillIn={handleJurisdictionDrillIn} />
      </MergedSection>
      <MergedSection id="sources" heading={t`Sources`}>
        <SourcesTab />
      </MergedSection>
      <MergedSection id="library" heading={t`Rules`}>
        <RuleLibraryTab />
      </MergedSection>
    </RulesPageShell>
  )
}

function MergedSection({
  id,
  heading,
  children,
}: {
  id: string
  heading: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      // `scroll-mt` keeps the heading flush with the top of the scroll
      // viewport when arrived at via an anchor link (#coverage etc.) —
      // the parent RulesPageShell has 24 px of top padding plus a sticky
      // route header rib, so we reserve the same offset here.
      className="scroll-mt-20 flex flex-col gap-4"
    >
      <h2
        id={`${id}-heading`}
        className="text-xs font-medium uppercase tracking-[0.08em] text-text-tertiary"
      >
        {heading}
      </h2>
      {children}
    </section>
  )
}
