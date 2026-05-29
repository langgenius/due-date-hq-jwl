import { Trans } from '@lingui/react/macro'

import type { PulseAlertPublic, PulseApplyReadiness } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'

function readinessLabel(readiness: PulseApplyReadiness) {
  if (readiness.status === 'ready') return <Trans>Ready to apply</Trans>
  if (readiness.status === 'needs_details') return <Trans>Needs deadline selection</Trans>
  return <Trans>Review only</Trans>
}

export function PulseReadinessChip({ readiness }: { readiness: PulseApplyReadiness }) {
  const variant =
    readiness.status === 'ready'
      ? 'success'
      : readiness.status === 'needs_details'
        ? 'destructive'
        : 'secondary'

  return <Badge variant={variant}>{readinessLabel(readiness)}</Badge>
}

export function PulseDecisionStatusNotice({ alert }: { alert: PulseAlertPublic }) {
  const readiness = alert.applyReadiness
  const variant =
    readiness.status === 'ready'
      ? 'success'
      : readiness.status === 'needs_details'
        ? 'destructive'
        : 'default'

  return (
    <Alert variant={variant}>
      <AlertTitle className="flex flex-wrap items-center gap-2">
        <PulseReadinessChip readiness={readiness} />
        {readiness.status === 'ready' ? (
          <Trans>Deadline selection confirmed</Trans>
        ) : readiness.status === 'needs_details' ? (
          <Trans>Confirm deadline details before applying</Trans>
        ) : (
          <Trans>No deadline overlay will be applied</Trans>
        )}
      </AlertTitle>
      <AlertDescription>
        {readiness.status === 'ready' ? (
          <Trans>
            The new due date and affected deadlines are confirmed. Continue to Apply when ready.
          </Trans>
        ) : readiness.status === 'needs_details' ? (
          <Trans>Confirm the new due date and choose the deadlines before Apply is enabled.</Trans>
        ) : (
          <Trans>
            This alert is for review only. Mark it reviewed or dismiss it; no deadline overlay will
            be applied.
          </Trans>
        )}
      </AlertDescription>
    </Alert>
  )
}
