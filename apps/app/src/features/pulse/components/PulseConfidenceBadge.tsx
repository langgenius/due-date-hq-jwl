import { Trans } from '@lingui/react/macro'

import { Badge } from '@duedatehq/ui/components/ui/badge'

interface PulseConfidenceBadgeProps {
  confidence: number
}

export function isVeryLowPulseConfidence(confidence: number): boolean {
  return confidence < 0.5
}

// >= 0.9 high · 0.7-0.9 medium · < 0.7 urgent review.
export function PulseConfidenceBadge({ confidence }: PulseConfidenceBadgeProps) {
  const percent = Math.round(confidence * 100)
  const variant = confidence >= 0.9 ? 'success' : confidence >= 0.7 ? 'info' : 'destructive'
  return (
    <Badge variant={variant} className="tabular-nums text-xs">
      <Trans>AI {percent}%</Trans>
    </Badge>
  )
}
