import { useLingui } from '@lingui/react/macro'
import { SparklesIcon } from 'lucide-react'

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
//
// 2026-05-25 (Yuqi Today #7): "New" reskin — was warning-amber, which
// Yuqi read as "red" in context (warning amber sits next to the
// destructive PulsingDot in the alert header and the two saturated
// hues fight). Switched to the `info` variant (soft blue + accent
// text — teal in this palette) and added a Sparkles icon. The icon
// carries the "new arrival" meaning so the label can stay short.
// Other states stay as quiet outline chips.
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
  return (
    <Badge
      variant={entry.emphasis ? 'info' : 'outline'}
      className={cn(!entry.emphasis && 'text-text-secondary')}
    >
      {entry.emphasis ? <SparklesIcon aria-hidden /> : null}
      {entry.label}
    </Badge>
  )
}
