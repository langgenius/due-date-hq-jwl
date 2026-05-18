import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useLingui } from '@lingui/react/macro'

import type { RuleJurisdiction } from '@duedatehq/contracts'

import { CoverageTab } from '@/features/rules/coverage-tab'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import type { CoverageCellState, CoverageEntityColumn } from '@/features/rules/rules-console-model'

export function RulesCoverageRoute() {
  const { t } = useLingui()
  const navigate = useNavigate()

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

  // Entity-dot drill-in. Verified dot → active rules; review dot →
  // pending_review queue; gray "no rule" dots never call this handler.
  // The `?from=coverage` tag lets Library show a "Pre-filtered from
  // Coverage status" pill so the cross-page origin isn't invisible.
  const handleEntityDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction, entity: CoverageEntityColumn, state: CoverageCellState) => {
      const libraryFilter = state === 'verified' ? 'active' : 'pending_review'
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
    <RulesPageShell
      title={t`Coverage status`}
      description={t`Do we have rules where clients file? Each row shows per-entity coverage as small dots — click any dot to drill into the matching rules. PENDING and SOURCES counts also drill. Every count traces back to the official federal, state, or DC document.`}
    >
      <CoverageTab
        onJurisdictionDrillIn={handleJurisdictionDrillIn}
        onEntityDrillIn={handleEntityDrillIn}
      />
    </RulesPageShell>
  )
}
