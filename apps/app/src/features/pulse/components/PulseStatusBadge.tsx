import { useLingui } from '@lingui/react/macro'

import type { PulseFirmAlertStatus } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

interface PulseStatusBadgeProps {
  status: PulseFirmAlertStatus
}

// Single source of truth for "what does the firm-level alert state look like".
//
// 2026-05-25 (Yuqi critique #18): dropped the leading <BadgeStatusDot>.
// This badge always sits next to a <PulsingDot> in the alert header
// row, so the dot inside the badge was a duplicate status indicator
// for the same alert — two dots saying the same thing. The badge
// text alone ("New" / "Applied" / "Snoozed") carries the meaning;
// the upstream PulsingDot carries the colour. "New" also gets a soft
// warning fill so it stands out instead of reading as one more
// neutral chip in the row (#17).
export function PulseStatusBadge({ status }: PulseStatusBadgeProps) {
  const { t } = useLingui()
  const config: Record<PulseFirmAlertStatus, { label: string; emphasis: boolean }> = {
    matched: { label: t`New`, emphasis: true },
    snoozed: { label: t`Snoozed`, emphasis: false },
    partially_applied: { label: t`Partially applied`, emphasis: false },
    applied: { label: t`Applied`, emphasis: false },
    reverted: { label: t`Reverted`, emphasis: false },
    dismissed: { label: t`Dismissed`, emphasis: false },
    reviewed: { label: t`Reviewed`, emphasis: false },
  }
  const entry = config[status]
  // "New" reads as the call-to-action state — give it a soft warning
  // fill so the eye picks it out of the badge row. Other states
  // render as quiet outline chips.
  return (
    <Badge
      variant={entry.emphasis ? 'warning' : 'outline'}
      className={cn(!entry.emphasis && 'text-text-secondary')}
    >
      {entry.label}
    </Badge>
  )
}
