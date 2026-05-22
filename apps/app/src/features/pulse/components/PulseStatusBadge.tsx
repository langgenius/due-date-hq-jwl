import { useLingui } from '@lingui/react/macro'

import type { PulseFirmAlertStatus } from '@duedatehq/contracts'
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'

interface PulseStatusBadgeProps {
  status: PulseFirmAlertStatus
}

// Single source of truth for "what does the firm-level alert state look like".
export function PulseStatusBadge({ status }: PulseStatusBadgeProps) {
  const { t } = useLingui()
  const config: Record<
    PulseFirmAlertStatus,
    { label: string; tone: 'warning' | 'success' | 'normal' | 'disabled' | 'error' }
  > = {
    matched: { label: t`New`, tone: 'warning' },
    snoozed: { label: t`Snoozed`, tone: 'normal' },
    partially_applied: { label: t`Partially applied`, tone: 'success' },
    applied: { label: t`Applied`, tone: 'success' },
    reverted: { label: t`Reverted`, tone: 'disabled' },
    dismissed: { label: t`Dismissed`, tone: 'disabled' },
    reviewed: { label: t`Reviewed`, tone: 'disabled' },
  }
  const entry = config[status]
  return (
    <Badge variant="outline" className="text-text-secondary">
      <BadgeStatusDot tone={entry.tone} />
      {entry.label}
    </Badge>
  )
}
