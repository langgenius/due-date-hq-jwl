import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useLingui } from '@lingui/react/macro'

import type { RuleJurisdiction } from '@duedatehq/contracts'

import { CoverageTab } from '@/features/rules/coverage-tab'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

export function RulesCoverageRoute() {
  const { t } = useLingui()
  const navigate = useNavigate()

  // Per-jurisdiction drill-in from the Coverage status page. Clicking a
  // pending cell pushes ?library + ?jur and navigates to the Library; the
  // Library reads those params via nuqs and shows the matching slice.
  // No #library fragment needed — the Library page no longer has a strip
  // section above it.
  const handleJurisdictionDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction) => {
      const params = new URLSearchParams({ library: 'pending_review', jur: jurisdiction })
      void navigate(`/rules/library?${params.toString()}`)
    },
    [navigate],
  )

  return (
    <RulesPageShell
      title={t`Coverage status`}
      description={t`Do we have rules where clients file? Each cell shows active rules and pending templates per jurisdiction × entity. Click a pending count to drill into the Rule library. Source citations carry through — every count traces back to the official federal, state, or DC document.`}
    >
      <CoverageTab onJurisdictionDrillIn={handleJurisdictionDrillIn} />
    </RulesPageShell>
  )
}
