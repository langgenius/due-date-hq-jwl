import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useLingui } from '@lingui/react/macro'
import { parseAsString, useQueryState } from 'nuqs'

import type { RuleJurisdiction } from '@duedatehq/contracts'

import { CoverageTab } from '@/features/rules/coverage-tab'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import type { CoverageCellState, CoverageEntityColumn } from '@/features/rules/rules-console-model'

export function RulesCoverageRoute() {
  const { t } = useLingui()
  const navigate = useNavigate()

  // Read the same `rule` URL state that CoverageTab writes when the
  // user opens a pending rule. When set, the page enters review
  // mode and the RulesPageShell collapses its title + description
  // chrome so the workspace can occupy the full viewport.
  const [selectedRuleId] = useQueryState('rule', parseAsString)
  const inReview = selectedRuleId !== null && selectedRuleId.length > 0

  // Per-jurisdiction drill-in (PENDING column). Lands on Library
  // pre-filtered by jurisdiction + pending_review.
  const handleJurisdictionDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction) => {
      const params = new URLSearchParams({
        library: 'pending_review',
        jur: jurisdiction,
        from: 'coverage',
      })
      void navigate(`/rules/library?${params.toString()}`)
    },
    [navigate],
  )

  // ACTIVE-count drill (catalog state — "rules accepted by this
  // practice for this jurisdiction"). Lands on Library filtered to
  // active rules. Links the cold number to the rules it represents.
  const handleActiveDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction) => {
      const params = new URLSearchParams({
        library: 'active',
        jur: jurisdiction,
        from: 'coverage',
      })
      void navigate(`/rules/library?${params.toString()}`)
    },
    [navigate],
  )

  // Source-cell drill: lands on Sources page filtered to this
  // jurisdiction. `from=coverage` preserves the origin breadcrumb so
  // Sources can render a "Pre-filtered from Coverage: California"
  // chip + Clear button.
  const handleSourceDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction, domain?: string) => {
      const params = new URLSearchParams({
        jur: jurisdiction,
        from: 'coverage',
      })
      if (domain) params.set('domain', domain)
      void navigate(`/rules/sources?${params.toString()}`)
    },
    [navigate],
  )

  // Entity-dot drill-in. Active dot → active rules; review dot →
  // pending_review queue; gray "no rule" dots never call this handler.
  // The `?from=coverage` tag lets Library show a "Pre-filtered from
  // Coverage status" pill so the cross-page origin isn't invisible.
  const handleEntityDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction, entity: CoverageEntityColumn, state: CoverageCellState) => {
      const libraryFilter = state === 'active' ? 'active' : 'pending_review'
      const params = new URLSearchParams({
        library: libraryFilter,
        jur: jurisdiction,
        entity,
        from: 'coverage',
      })
      void navigate(`/rules/library?${params.toString()}`)
    },
    [navigate],
  )

  return (
    <RulesPageShell title={t`Coverage`} compact={inReview}>
      <CoverageTab
        onJurisdictionDrillIn={handleJurisdictionDrillIn}
        onActiveDrillIn={handleActiveDrillIn}
        onSourceDrillIn={handleSourceDrillIn}
        onEntityDrillIn={handleEntityDrillIn}
      />
    </RulesPageShell>
  )
}
