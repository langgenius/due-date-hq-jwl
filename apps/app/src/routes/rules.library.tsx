import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useLingui } from '@lingui/react/macro'
import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs'

import type { RuleJurisdiction } from '@duedatehq/contracts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@duedatehq/ui/components/ui/tabs'

import { CoverageTab } from '@/features/rules/coverage-tab'
import { RuleLibraryTab } from '@/features/rules/rule-library-tab'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'
import type { CoverageCellState, CoverageEntityColumn } from '@/features/rules/rules-console-model'

/**
 * Rule library — single sidebar destination that hosts two views of the
 * rule catalog:
 *
 * - **Coverage map** (default tab): jurisdiction × entity matrix. Per-row
 *   summary of active / pending / source health. Drill into a cell to
 *   land on the per-rule list with the right filter pre-applied.
 * - **Rules** tab: the per-rule list with status / jurisdiction / entity
 *   filters in the URL. Reads `?library=<filter>&jur=<code>&entity=<col>`
 *   so deep links from the matrix work natively.
 *
 * View is URL-state via `?view=matrix|rules`; default is matrix.
 *
 * Replaces the legacy two-page split (`/rules/coverage` + standalone
 * library page). `/rules/coverage` still routes to the legacy
 * `RulesCoverageRoute` for back-compat — but that route's drill-ins
 * also land here.
 */
const VIEW_VALUES = ['matrix', 'rules'] as const
type LibraryView = (typeof VIEW_VALUES)[number]
const viewParser = parseAsStringLiteral(VIEW_VALUES).withDefault('matrix')

export function RulesLibraryRoute() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const [view, setView] = useQueryState('view', viewParser)
  const [selectedRuleId] = useQueryState('rule', parseAsString)
  const inReview = selectedRuleId !== null && selectedRuleId.length > 0

  // Drill-ins from the matrix swap the tab to the per-rule list with
  // filter params. RuleLibraryTab reads `?library` and `?jur` natively.
  const drillToList = useCallback(
    (filter: 'active' | 'pending_review', jurisdiction?: string, entity?: string) => {
      const params = new URLSearchParams()
      params.set('view', 'rules')
      params.set('library', filter)
      if (jurisdiction) params.set('jur', jurisdiction)
      if (entity) params.set('entity', entity)
      params.set('from', 'coverage')
      void navigate(`/rules/library?${params.toString()}`)
    },
    [navigate],
  )

  const handleJurisdictionDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction) => drillToList('pending_review', jurisdiction),
    [drillToList],
  )

  const handleActiveDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction) => drillToList('active', jurisdiction),
    [drillToList],
  )

  const handleSourceDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction, domain?: string) => {
      const params = new URLSearchParams({ jur: jurisdiction, from: 'library' })
      if (domain) params.set('domain', domain)
      void navigate(`/rules/sources?${params.toString()}`)
    },
    [navigate],
  )

  const handleEntityDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction, entity: CoverageEntityColumn, state: CoverageCellState) => {
      const filter = state === 'active' ? 'active' : 'pending_review'
      drillToList(filter, jurisdiction, entity)
    },
    [drillToList],
  )

  return (
    <RulesPageShell title={t`Rule library`} compact={inReview}>
      <Tabs
        value={view}
        onValueChange={(next) => void setView(next as LibraryView)}
        className="flex flex-col gap-4"
      >
        <TabsList variant="line">
          <TabsTrigger value="matrix">{t`Coverage map`}</TabsTrigger>
          <TabsTrigger value="rules">{t`Rules`}</TabsTrigger>
        </TabsList>
        <TabsContent value="matrix">
          <CoverageTab
            onJurisdictionDrillIn={handleJurisdictionDrillIn}
            onActiveDrillIn={handleActiveDrillIn}
            onSourceDrillIn={handleSourceDrillIn}
            onEntityDrillIn={handleEntityDrillIn}
          />
        </TabsContent>
        <TabsContent value="rules">
          <RuleLibraryTab />
        </TabsContent>
      </Tabs>
    </RulesPageShell>
  )
}
