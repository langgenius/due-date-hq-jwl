import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useLingui } from '@lingui/react/macro'
import { parseAsString, useQueryState } from 'nuqs'

import type { RuleJurisdiction } from '@duedatehq/contracts'

import { CoverageTab } from '@/features/rules/coverage-tab'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import type { CoverageCellState, CoverageEntityColumn } from '@/features/rules/rules-console-model'

/**
 * Rule library — the rule catalog as a jurisdiction × entity coverage
 * matrix.
 *
 * Per 2026-05-21 redesign: the standalone "library list" view was
 * dropped because the coverage matrix already showed the same rule
 * inventory with richer affordances (per-jurisdiction pending review,
 * source health, entity dots). This route now hosts the matrix
 * directly. The legacy `/rules/coverage` URL still resolves here for
 * back-compat — see the router's coverage entry.
 */
export function RulesLibraryRoute() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const [selectedRuleId] = useQueryState('rule', parseAsString)
  const inReview = selectedRuleId !== null && selectedRuleId.length > 0

  const handleJurisdictionDrillIn = useCallback((_jurisdiction: RuleJurisdiction) => {
    // Drill-ins stay on the same page now — the matrix is the queue.
    // The legacy /rules/library?library=… filters would land here too,
    // but the matrix surfaces pending review per-jurisdiction natively.
  }, [])

  const handleActiveDrillIn = useCallback((_jurisdiction: RuleJurisdiction) => {
    // No-op — clicking the active count keeps the user on the matrix.
  }, [])

  const handleSourceDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction, domain?: string) => {
      const params = new URLSearchParams({ jur: jurisdiction, from: 'library' })
      if (domain) params.set('domain', domain)
      void navigate(`/rules/sources?${params.toString()}`)
    },
    [navigate],
  )

  const handleEntityDrillIn = useCallback(
    (_jurisdiction: RuleJurisdiction, _entity: CoverageEntityColumn, _state: CoverageCellState) => {
      // No-op — entity dots show inline state; drill into the rule via
      // the per-row open affordance instead.
    },
    [],
  )

  return (
    <RulesPageShell title={t`Rule library`} compact={inReview}>
      <CoverageTab
        onJurisdictionDrillIn={handleJurisdictionDrillIn}
        onActiveDrillIn={handleActiveDrillIn}
        onSourceDrillIn={handleSourceDrillIn}
        onEntityDrillIn={handleEntityDrillIn}
      />
    </RulesPageShell>
  )
}
