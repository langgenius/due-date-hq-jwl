import { Trans, useLingui } from '@lingui/react/macro'
import { LinkIcon } from 'lucide-react'

// Lifecycle v2 "Blocked by" chip — surfaces the upstream obligation
// that's holding up a `blocked` row. Click navigates into Obligations
// with the parent's drawer open. Encodes PDF anti-pattern #4 (K-1
// dependency graph) visually: a partner's 1040 that's waiting on a
// partnership's K-1 shows "by Lakeview Partnership · Form 1065"
// with a tap-target. Falls back to a short ID when the parent isn't
// loaded in the current view (the queue paginates, so the parent
// might be on a different page).

function isBlockedByVisible(input: {
  status: string
  blockedByObligationInstanceId: string | null
}): boolean {
  return input.status === 'blocked' && input.blockedByObligationInstanceId !== null
}

function BlockedByChip({
  parentObligationId,
  parentLabel,
  onOpen,
}: {
  parentObligationId: string
  parentLabel?: string | null
  onOpen: (parentObligationId: string) => void
}) {
  const { t } = useLingui()
  const label = parentLabel?.trim() ? parentLabel : t`#${parentObligationId.slice(0, 8)}`
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onOpen(parentObligationId)
      }}
      title={t`Open the upstream obligation that's blocking this row.`}
      className="inline-flex max-w-[220px] items-center gap-1 rounded-sm border border-state-destructive-border bg-state-destructive-hover px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-destructive hover:bg-state-destructive-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-destructive-active"
    >
      <LinkIcon className="size-3 shrink-0" aria-hidden />
      <span className="truncate">
        <Trans>by {label}</Trans>
      </span>
    </button>
  )
}

export { BlockedByChip, isBlockedByVisible }
