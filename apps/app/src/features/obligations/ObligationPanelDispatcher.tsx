import { ObligationQueueDetailDrawer } from '@/features/obligations/queue/ObligationQueueDetailDrawer'
import type { ObligationQueueRow, ObligationQueueDetailTab } from '@duedatehq/contracts'

/**
 * Renders the obligation detail panel inside whichever route owns
 * the right-rail slot today (the obligations queue page, the client
 * detail page). Always returns the canonical `ObligationQueueDetailDrawer`
 * in `mode="panel"`.
 *
 * The component name survives as a thin pass-through so route call
 * sites don't churn.
 */
export function ObligationPanelDispatcher({
  obligationId,
  activeTab,
  onTabChange,
  onClose,
  onNeedsInput,
  practiceAiEnabled,
  blockerCandidates,
}: {
  obligationId: string | null
  activeTab: ObligationQueueDetailTab
  onTabChange: (tab: ObligationQueueDetailTab) => void
  onClose: () => void
  onNeedsInput: (row: ObligationQueueRow) => void
  practiceAiEnabled: boolean
  blockerCandidates: ObligationQueueRow[]
}) {
  return (
    <ObligationQueueDetailDrawer
      mode="panel"
      obligationId={obligationId}
      activeTab={activeTab}
      onTabChange={onTabChange}
      onClose={onClose}
      onNeedsInput={onNeedsInput}
      practiceAiEnabled={practiceAiEnabled}
      blockerCandidates={blockerCandidates}
    />
  )
}
