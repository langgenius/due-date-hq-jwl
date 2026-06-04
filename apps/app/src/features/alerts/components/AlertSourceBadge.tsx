import { ExternalLinkIcon } from 'lucide-react'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

interface AlertSourceBadgeProps {
  source: string
  sourceUrl: string
  className?: string
}

// Compact "source · open ↗" chip used inside the banner card and detail header.
// 2026-05-24 (critique P2 — typeset): source label is sentence-case
// English ("IRS Disaster Relief"), not a code token. Dropped
// `font-mono tabular-nums` so the chip reads as a label, not a dev
// breadcrumb. Matches the in-card header treatment in AlertCard.
//
// 2026-05-25 (Yuqi Today #8): bumped from `text-xs` (12px) to `text-sm`
// (14px) + `h-6` so the source name reads as a primary header chip
// instead of meta chrome. The source is the most-scanned fact in the
// drawer header (it tells the CPA *who* is making the regulatory
// claim) — it shouldn't render at the same size as a footer
// attribution.
export function AlertSourceBadge({ source, sourceUrl, className }: AlertSourceBadgeProps) {
  // 2026-05-25 (Yuqi Alerts third pass #13): ExternalLinkIcon
  // explicitly clamped to size-3 (12px). The Badge primitive's
  // `[&>svg]:size-3!` rule only catches DIRECT svg children, but
  // this icon sits inside an `<a>` so it was inheriting the lucide
  // default (24px) — too big against the source-name text. Manual
  // size-3 brings it back to badge scale.
  return (
    <Badge variant="outline" className={cn('h-6 min-w-0 max-w-full text-sm', className)}>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex min-w-0 max-w-full items-center gap-1 text-text-secondary hover:text-text-primary"
      >
        <span className="min-w-0 truncate">{source}</span>
        <ExternalLinkIcon aria-hidden className="size-3 shrink-0" />
      </a>
    </Badge>
  )
}
