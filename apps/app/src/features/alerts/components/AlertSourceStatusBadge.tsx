import { Trans } from '@lingui/react/macro'

import type { PulseStatus } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'

// Source revoked is an unrecoverable hard error (alert ingestion can no
// longer pull updates from the source), which the ladder maps to
// destructive red. The filled chip carries the tone; filled chips don't
// get a leading dot.
export function AlertSourceStatusBadge({ status }: { status: PulseStatus }) {
  if (status !== 'source_revoked') return null

  return (
    <Badge variant="destructive" className="text-xs">
      <Trans>Source revoked</Trans>
    </Badge>
  )
}
