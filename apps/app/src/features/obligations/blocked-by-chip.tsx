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
  compact = false,
}: {
  parentObligationId: string
  parentLabel?: string | null
  onOpen: (parentObligationId: string) => void
  // Compact mode (2026-05-21): drops the "by X · Form Y" label, keeps
  // the link icon + tooltip. Used in the queue Status cell when the
  // detail panel is open — saves ~150px without losing the signal.
  compact?: boolean
}) {
  const { t } = useLingui()
  const label = parentLabel?.trim() ? parentLabel : t`#${parentObligationId.slice(0, 8)}`
  const title = parentLabel
    ? t`Blocked by ${label} — click to open.`
    : t`Open the upstream obligation that's blocking this row.`
  // 2026-05-25 (Yuqi Deadlines #4): chip palette shifted from full-
  // amber to neutral chip + red-icon. Yuqi's call: "这个不能就 icon
  // 是红色，字体是 secondary，背景是浅灰色背景吗" — let the icon
  // carry the urgency cue while the chip body sits in body-text
  // neutrals so a row full of these doesn't read as "everything is
  // on fire." The destructive-red on the icon is still distinct
  // from RejectionChip (where the WHOLE chip goes red) so the
  // urgency-tier separation from ux-audit-2026-05-21 §P0 #6 stays
  // intact — only the visual weight inside this chip changed.
  if (compact) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onOpen(parentObligationId)
        }}
        title={title}
        aria-label={title}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm border border-divider-subtle bg-background-subtle text-text-destructive hover:bg-background-default-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        <LinkIcon className="size-3" aria-hidden />
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onOpen(parentObligationId)
      }}
      title={title}
      className="inline-flex max-w-[220px] items-center gap-1 rounded-sm border border-divider-subtle bg-background-subtle px-1.5 py-0.5 text-caption-xs font-medium text-text-secondary hover:bg-background-default-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
    >
      <LinkIcon className="size-3 shrink-0 text-text-destructive" aria-hidden />
      <span className="truncate">
        <Trans>by {label}</Trans>
      </span>
    </button>
  )
}

export { BlockedByChip, isBlockedByVisible }
