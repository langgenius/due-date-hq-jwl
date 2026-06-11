import { XIcon } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'

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

// Compact mode drops the "Rejected" text, keeps the warning icon +
// tooltip. Used in the obligations queue when the detail panel is
// open and the status column needs to fit a narrower viewport — the
// icon's red tint + hover tooltip still carries the "this came back
// from filing" signal.
// The full chip is the canonical `<Badge variant="destructive">` so
// future tone-system changes propagate here automatically. The
// compact variant stays a raw <span> because it's icon-only and the
// Badge primitive's text padding makes a 20×20 icon-only chip awkward.
function RejectionChip({ compact = false }: { compact?: boolean }) {
  const { t } = useLingui()
  const title = t`Returned from filed status — IRS/state rejected the submission.`
  if (compact) {
    return (
      <span
        title={title}
        aria-label={t`Rejected`}
        className="inline-flex size-4 shrink-0 items-center justify-center text-text-destructive"
      >
        {/* Default stroke (icon-sizing.md: one lucide stroke) — the
            destructive color carries the prominence, not a bolder X. */}
        <XIcon className="size-4" aria-hidden />
      </span>
    )
  }
  // Filled red chip — white text on solid red, font-semibold uppercase.
  // Most prominent chip in the row by design — rejection is the
  // singular "this needs immediate hands-on work" signal. No shadow
  // (it would read as floating above the row, fighting the queue's
  // flat surface) and no warning icon (redundant on top of the
  // already-red filled chip + uppercase typography). The word alone
  // carries the siren.
  return (
    <Badge
      className="inline-flex items-center border-transparent bg-state-destructive-solid px-2 py-0.5 text-caption font-semibold uppercase tracking-wide text-text-inverted hover:bg-state-destructive-solid"
      title={title}
    >
      <Trans>Rejected</Trans>
    </Badge>
  )
}

export { isRejectionVisible, RejectionChip }
