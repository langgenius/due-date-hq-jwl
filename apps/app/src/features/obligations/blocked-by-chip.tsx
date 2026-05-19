import { Trans, useLingui } from '@lingui/react/macro'
import { LinkIcon } from 'lucide-react'

// Lifecycle v2 "Blocked by" chip — surfaces the upstream obligation
// that's holding up a `blocked` row. Click navigates into Obligations
// with the parent's drawer open. Encodes PDF anti-pattern #4 (K-1
// dependency graph) visually: a partner's 1040 that's waiting on a
// partnership's K-1 shows "Blocked by #1065-abc" with a tap-target.
//
// v2.0 just shows the short ID + arrow icon. v2.1 will denormalize
// the parent's client name + tax type so the chip reads
// "Blocked by Lakeview Partnership 1065" — that needs a join the
// queue endpoint doesn't yet do.

function isBlockedByVisible(input: {
  status: string
  blockedByObligationInstanceId: string | null
}): boolean {
  return input.status === 'blocked' && input.blockedByObligationInstanceId !== null
}

function BlockedByChip({
  parentObligationId,
  onOpen,
}: {
  parentObligationId: string
  onOpen: (parentObligationId: string) => void
}) {
  const { t } = useLingui()
  const shortId = parentObligationId.slice(0, 8)
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onOpen(parentObligationId)
      }}
      title={t`Open the upstream obligation that's blocking this row.`}
      className="inline-flex items-center gap-1 rounded-sm border border-state-destructive-border bg-state-destructive-hover px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-destructive hover:bg-state-destructive-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-destructive-active"
    >
      <LinkIcon className="size-3" aria-hidden />
      <Trans>by #{shortId}</Trans>
    </button>
  )
}

export { BlockedByChip, isBlockedByVisible }
