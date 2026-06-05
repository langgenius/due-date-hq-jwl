import { ObligationQueueDetailDrawer } from '@/features/obligations/queue/ObligationQueueDetailDrawer'
import type { ObligationQueueRow, ObligationQueueDetailTab } from '@duedatehq/contracts'

/**
 * Renders the obligation detail panel inside whichever route owns
 * the right-rail slot today (the obligations queue page, the client
 * detail page). Always returns the canonical `ObligationQueueDetailDrawer`
 * in `mode="panel"`.
 *
 * Earlier (2026-05-22) this file dispatched between two parallel
 * implementations behind a `?panel=v2` URL flag — V1 was the
 * polished default, V2 a slimmer comparison prototype. The toggle +
 * V2 implementation are gone now (2026-05-23) per Yuqi's call to
 * stop maintaining two panels; V2's design ideas merged back into
 * V1 over the previous commits in this batch. The component name
 * survives as a thin pass-through so route call sites don't churn.
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
