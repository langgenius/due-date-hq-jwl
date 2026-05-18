import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useLingui } from '@lingui/react/macro'

import type { RuleJurisdiction } from '@duedatehq/contracts'

import { CoverageTab } from '@/features/rules/coverage-tab'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

export function RulesCoverageRoute() {
  const { t } = useLingui()
  const navigate = useNavigate()

  // Per-jurisdiction drill-in from the standalone Coverage page.
  // In v2 of the Library merge, this drill behavior lived inline because
  // Coverage and Library were on the same scroll. The v3 summary-strip
  // rewrite moved Library to `/rules/library`, so clicking a pending
  // cell here now navigates across pages — same destination, one
  // additional viewport (Coverage detail → Library). The Library page
  // reads `?library` / `?jur` from the URL via nuqs, so we just push the
  // matching params.
  const handleJurisdictionDrillIn = useCallback(
    (jurisdiction: RuleJurisdiction) => {
      const params = new URLSearchParams({ library: 'pending_review', jur: jurisdiction })
      void navigate(`/rules/library?${params.toString()}#library`)
    },
    [navigate],
  )

  return (
    <RulesPageShell
      title={t`Coverage`}
      description={t`Sources are official federal, state, and DC materials. Only practice-accepted rules can generate reminder-ready obligations; pending templates remain review-only until an owner or manager accepts them. Click a pending count to drill into the Rule library.`}
    >
      <CoverageTab onJurisdictionDrillIn={handleJurisdictionDrillIn} />
    </RulesPageShell>
  )
}
