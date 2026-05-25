import { Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangleIcon } from 'lucide-react'

import { Badge } from '@duedatehq/ui/components/ui/badge'

// Lifecycle v2 "Rejected" chip — sits next to a row's Status pill
// when the obligation came back after a filed → in_review unwind.
// Uses the existing `efileRejectedAt` field on
// ObligationInstancePublic; no schema change required for this slice.
//
// The chip surfaces in two places:
//   1. The Obligations queue row's Status cell
//   2. The dashboard triage row's Status cell
// Both already render <ObligationQueueStatusControl>, so we just
// wrap it with a flex container and append the chip when the
// rejection signal is present.
//
// Future: a paper-filed rejection (where efile* is never set)
// would need its own state-machine flag. Out of slice 2c scope.

function isRejectionVisible(input: { status: string; efileRejectedAt: string | null }): boolean {
  return input.status === 'review' && input.efileRejectedAt !== null
}

// Compact mode (2026-05-21): drops the "Rejected" text, keeps the
// warning icon + tooltip. Used in the obligations queue when the
// detail panel is open and the status column needs to fit a narrower
// viewport — the icon's red tint + hover tooltip still carries the
// "this came back from filing" signal.
// 2026-05-25 (status-pill audit #6, finding 2.6): swapped the
// bespoke `bg-state-destructive-hover` + `border-state-destructive-border`
// chrome for the canonical `<Badge variant="destructive">`. Same
// visual semantically — destructive red chip with warning glyph —
// but now built from the shared primitive, so future tone-system
// changes propagate here automatically. Compact variant stays a
// raw <span> because it's icon-only and Badge primitive's text
// padding makes a 20×20 icon-only chip awkward.
function RejectionChip({ compact = false }: { compact?: boolean }) {
  const { t } = useLingui()
  const title = t`Returned from filed status — IRS/state rejected the submission.`
  if (compact) {
    return (
      <span
        title={title}
        aria-label={t`Rejected`}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm border border-state-destructive-border bg-state-destructive-hover text-text-destructive"
      >
        <AlertTriangleIcon className="size-3" aria-hidden />
      </span>
    )
  }
  return (
    <Badge
      variant="destructive"
      className="text-caption-xs font-medium uppercase tracking-wide"
      title={title}
    >
      <AlertTriangleIcon className="size-3" aria-hidden />
      <Trans>Rejected</Trans>
    </Badge>
  )
}

export { isRejectionVisible, RejectionChip }
