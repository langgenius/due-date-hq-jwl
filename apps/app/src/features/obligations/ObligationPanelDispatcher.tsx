import { Trans } from '@lingui/react/macro'

import { ObligationQueueDetailDrawer } from '@/routes/obligations'
import type { ObligationQueueRow, ObligationQueueDetailTab } from '@duedatehq/contracts'

import { ObligationPanelV2 } from './ObligationPanelV2'
import { useObligationPanelVersion } from './use-obligation-panel-version'

/**
 * Picks V1 (current) or V2 (opt-in via `?panel=v2`).
 *
 * Both implementations are mounted simultaneously in the codebase so
 * designers can flip between them via the URL flag. Default = V1. The
 * "Try V2 →" link sits above the V1 panel; the "← Back to original"
 * link is inside V2's own chrome.
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
  const { version, setVersion } = useObligationPanelVersion()

  if (version === 'v2') {
    return <ObligationPanelV2 obligationId={obligationId} onClose={onClose} />
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setVersion('v2')}
          className="text-xs text-text-tertiary underline-offset-2 hover:text-text-accent hover:underline"
          title="Toggle: ?panel=v2"
        >
          <Trans>Try the new panel shape →</Trans>
        </button>
      </div>
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
    </div>
  )
}
