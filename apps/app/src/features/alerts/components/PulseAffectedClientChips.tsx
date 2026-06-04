import { Trans } from '@lingui/react/macro'
import { UsersIcon } from 'lucide-react'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

// Canonical chip list for "clients affected by this Pulse alert".
//
// Per Pencil node VVMj9 (/today alerts cards) the chip row sits at
// the BOTTOM of the card and renders the visible names as outline
// Badges, followed by a `+N more` tail if the alert affects more
// clients than the caller chose to render inline.
//
// Implementation rules:
//   • Each chip is a `<Badge variant="outline">` so chip chrome
//     (border, radius, padding, hover) tracks the canonical Badge
//     primitive — never hand-rolled.
//   • The overflow tail is `text-text-tertiary text-xs` plain
//     text, NOT a badge. Pencil draws it as quiet caption, so we
//     keep it visually subordinate to the named chips.
//   • Names are passed in already deduplicated + sorted by the
//     caller. This primitive doesn't know about the underlying
//     alert; it just renders the row.
function PulseAffectedClientChips({
  names,
  hasMore,
  showLeadingIcon = false,
  className,
}: {
  names: readonly string[]
  hasMore: number
  // 2026-06-04 round 6 (Yuqi "icon in the client name badge
  // frame, not outside"): leading people icon now renders
  // INSIDE the first Badge so the affected-clients semantic
  // sits on the chip itself, not as a sibling glyph next to
  // the chip row. Callers opt in via `showLeadingIcon`.
  showLeadingIcon?: boolean
  className?: string
}) {
  if (names.length === 0) return null
  // 2026-06-04 round 16 (Yuqi Pencil qSR9p — "client name frame
  // does not need to be always full rounded corners"): chip shape
  // switched `pill` (default) → `rounded` (8px corner radius,
  // matching Pencil's qSR9p frame). Multi-word client names read
  // better in a softly-rounded card than in an aggressive pill.
  return (
    <ul className={cn('flex min-w-0 flex-wrap items-center gap-1.5', className)}>
      {names.map((name, index) => (
        <li key={name}>
          <Badge variant="outline" shape="rounded" title={name} className="gap-1">
            {showLeadingIcon && index === 0 ? (
              <UsersIcon className="size-3 shrink-0 text-text-tertiary" aria-hidden />
            ) : null}
            {name}
          </Badge>
        </li>
      ))}
      {hasMore > 0 ? (
        <li className="inline-flex text-xs text-text-tertiary">
          <Trans>+{hasMore} more</Trans>
        </li>
      ) : null}
    </ul>
  )
}

export { PulseAffectedClientChips }
