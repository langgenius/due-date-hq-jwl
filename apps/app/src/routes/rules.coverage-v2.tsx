import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useLingui } from '@lingui/react/macro'

import type { RuleJurisdiction } from '@duedatehq/contracts'

import { CoverageCardsView } from '@/features/rules/coverage-cards-view'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import type { CoverageCellState, CoverageEntityColumn } from '@/features/rules/rules-console-model'

/**
 * Coverage Status v2 — parallel exploration alongside `/rules/coverage`.
 *
 * Renders the same data through a CARD layout instead of a table:
 *   - One card per needs-attention jurisdiction (3-column grid)
 *   - Each card embeds Option-3-style named entity columns inline,
 *     so each card is self-documenting (no separate legend)
 *   - Status pill and primary action are at card-level prominence
 *   - Standard-queue jurisdictions stay collapsed under a single expander
 *
 * Drill handlers are identical to v1 so the cross-page wiring works
 * end-to-end (Library and Sources both honor `?from=coverage`).
 */
export function RulesCoverageV2Route() {
  const { t } = useLingui()
  const navigate = useNavigate()

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
      title={t`Coverage status (v2)`}
      description={t`Card-view exploration. Same data as /rules/coverage, different visual hierarchy: each jurisdiction reads as its own panel with the entity matrix inline. Compare which scans faster.`}
    >
      <CoverageCardsView
        onJurisdictionDrillIn={handleJurisdictionDrillIn}
        onEntityDrillIn={handleEntityDrillIn}
      />
    </RulesPageShell>
  )
}
