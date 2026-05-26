import { getAssigneeTint } from '@/lib/assignee-tint'
import { initialsFromName } from '@/lib/auth'
import { cn } from '@/lib/utils'

// Assignee avatar — 32px circle with up-to-2-letter initials. Picks
// up the existing initialsFromName helper used by the global user
// menu so vocabulary stays consistent. `isMine` swaps the background
// to a soft accent tint + accent text — gives a quiet "this is your
// row" cue without an extra YOU chip. Name lives in the title
// (tooltip) so the column stays compact.
//
// Sizing history (kept inline because callers regularly ask "why 32?"):
//   2026-05-25 (Yuqi Deadlines #1) — bumped 24 → 28px after the 24px
//   circle read as cramped at scan distance ("avatar 有点太挤了").
//   2026-05-26 (sixty-fifth pass #10) — bumped 28 → 32 + text-sm; the
//   28px circle read as "too small" next to the row's text-base
//   client name. 32px now matches the Today dashboard's owner avatar
//   and lines up as a proper row-anchor icon.
//   2026-05-26 (cross-table drift #10) — non-self path resolves a
//   per-name tint via the shared `getAssigneeTint` helper. /clients
//   already did this; the deadlines queue was where "AR" and "KP"
//   read as identical at scan distance. Now same person → same color
//   → same visual identity across every owner column in the app.
export function AssigneeAvatar({
  name,
  isMine,
  title,
}: {
  name: string
  isMine: boolean
  title: string
}) {
  const initials = initialsFromName(name)
  return (
    <span
      aria-label={title}
      title={title}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold uppercase tracking-tight',
        isMine ? 'bg-state-accent-hover-alt text-text-accent' : getAssigneeTint(name),
      )}
    >
      {initials}
    </span>
  )
}
