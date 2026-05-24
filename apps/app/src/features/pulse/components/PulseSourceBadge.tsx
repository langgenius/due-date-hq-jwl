import { ExternalLinkIcon } from 'lucide-react'

import { Badge } from '@duedatehq/ui/components/ui/badge'

interface PulseSourceBadgeProps {
  source: string
  sourceUrl: string
}

// Compact "source · open ↗" chip used inside the banner card and detail header.
// 2026-05-24 (critique P2 — typeset): source label is sentence-case
// English ("IRS Disaster Relief"), not a code token. Dropped
// `font-mono tabular-nums` so the chip reads as a label, not a dev
// breadcrumb. Matches the in-card header treatment in PulseAlertCard.
export function PulseSourceBadge({ source, sourceUrl }: PulseSourceBadgeProps) {
  return (
    <Badge variant="outline" className="text-xs">
      <a
        href={sourceUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary"
      >
        {source}
        <ExternalLinkIcon className="size-3" aria-hidden />
      </a>
    </Badge>
  )
}
