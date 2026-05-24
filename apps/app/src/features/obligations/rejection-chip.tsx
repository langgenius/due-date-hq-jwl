import { Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangleIcon } from 'lucide-react'

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
    <span
      title={title}
      className="inline-flex items-center gap-1 rounded-sm border border-state-destructive-border bg-state-destructive-hover px-1.5 py-0.5 text-caption-xs font-medium uppercase tracking-wide text-text-destructive"
    >
      <AlertTriangleIcon className="size-3" aria-hidden />
      <Trans>Rejected</Trans>
    </span>
  )
}

export { isRejectionVisible, RejectionChip }
