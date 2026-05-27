import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * StatTile — canonical "compact metric tile" for frameless body
 * surfaces (`/deadlines`, `/opportunities`, the dashboard summary
 * strip, future routes that need a similar "label + magnitude"
 * cluster).
 *
 * Replaces (audit P0 cross-surface #1, see `docs/Design/ui-audit-2026-05-25.md`):
 *  - `apps/app/src/features/opportunities/opportunities-page.tsx`
 *    `OpportunitiesStatTile` (text-2xl variant)
 *  - `apps/app/src/features/dashboard/actions-list.tsx`
 *    `ActionsSummaryTile` (text-lg variant, with Link wrapper)
 *
 * Bespoke tiles that intentionally stay outside this primitive:
 *  - `RemindersPage.StatTile` — settings-tier tile inside Card chrome
 *    with an icon slot + caption row. Settings pages keep their Card
 *    framing; this primitive targets frameless body surfaces.
 *
 * Visual contract (per DESIGN.md §3.2 Tile value role):
 *  - Frame: `rounded-md border border-divider-subtle bg-background-default px-4 py-3`
 *  - Value: `text-xl font-semibold leading-tight tabular-nums tracking-tight`,
 *    tone-coded
 *  - Label: `text-sm text-text-secondary` below the value
 *  - Skeleton: when `value === undefined`, renders a 28×48 skeleton
 *    in the value slot so the tile occupies its final footprint
 *    during query load
 *
 * Interaction:
 *  - `href` → renders as `<Link>` with hover affordance
 *  - `onClick` → renders as `<button>` with hover affordance
 *  - neither → renders as `<div>` (read-only display)
 *  - Both → `href` wins (click-through is the dominant action)
 *
 * Tone:
 *  - `neutral` (default) — `text-text-primary`
 *  - `critical` — `text-text-destructive`. Use only when the magnitude
 *    is genuinely stuck (Blocked, At risk). Per DESIGN.md §7,
 *    severity color is a scarce resource; never default to it.
 *  - `muted` — `text-text-tertiary`. For strips that always render the
 *    same slot count (e.g. /clients/[id] 3-tile anchor) so empty
 *    values whisper instead of competing with the populated ones.
 *    Surfaces that just hide zero-count tiles (/today, /opportunities)
 *    don't need this — they drop empty tiles entirely.
 */
export type StatTileTone = 'neutral' | 'critical' | 'muted'

export function StatTile({
  value,
  label,
  tone = 'neutral',
  href,
  onClick,
  ariaLabel,
  className,
}: {
  /** Tile magnitude. `undefined` renders a skeleton until the query resolves. */
  value: ReactNode | undefined
  /** Label below the value. ReactNode so `<Trans>` and friends compose cleanly. */
  label: ReactNode
  /** Color tone for the value. Default `neutral`. */
  tone?: StatTileTone
  /** Render the tile as a `<Link to={href}>`. Wins over `onClick`. */
  href?: string
  /** Render the tile as a `<button onClick={onClick}>`. */
  onClick?: () => void
  /** aria-label override — useful when the visible label is a chip but the link needs more context for screen readers. */
  ariaLabel?: string
  /** Optional extra classes appended to the tile shell (rare; prefer no-op). */
  className?: string
}) {
  // 2026-05-26 (audit cross-surface P0 #1): value scale aligned with
  // DESIGN.md §3.2 "Tile value" canonical row — text-xl / font-semibold
  // / leading-tight / tabular-nums / tracking-tight. Two pre-existing
  // implementations drifted off-canonical (Opportunities went text-2xl
  // because the rule-library shape "felt thin"; dashboard went text-lg
  // because text-xl competed with the inline-h1 at text-xl — that
  // collision is itself an open audit finding, T1). Unifying on the
  // DESIGN.md canonical resolves the drift; downstream the dashboard
  // h1 fix (audit T1) restores the proper title/value scale ratio.
  const valueClass = cn(
    'text-xl font-semibold leading-tight tabular-nums tracking-tight',
    tone === 'critical' && 'text-text-destructive',
    tone === 'muted' && 'text-text-tertiary',
    tone === 'neutral' && 'text-text-primary',
  )

  const baseClass = cn(
    'flex min-w-[160px] flex-col gap-1 rounded-md border border-divider-subtle bg-background-default px-4 py-3',
    className,
  )

  // Interactive variants add a hover affordance and a focus ring so
  // the tile reads as tappable. Non-interactive (div) variant stays
  // dead-quiet — no hover transition so the user doesn't expect it
  // to do anything.
  const interactiveClass = cn(
    'group transition-colors hover:border-divider-regular hover:bg-background-default-hover',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-accent-active-alt',
  )

  const body = (
    <>
      {value === undefined ? (
        <Skeleton className="h-7 w-12" aria-hidden />
      ) : (
        <span className={valueClass}>{value}</span>
      )}
      <span className="text-sm text-text-secondary">{label}</span>
    </>
  )

  if (href) {
    return (
      <Link to={href} aria-label={ariaLabel} className={cn(baseClass, interactiveClass)}>
        {body}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(baseClass, interactiveClass, 'text-left')}
      >
        {body}
      </button>
    )
  }
  return (
    <div aria-label={ariaLabel} className={baseClass}>
      {body}
    </div>
  )
}
