import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * StatTile — canonical "compact metric tile" for frameless body
 * surfaces (`/deadlines`, `/opportunities`, the dashboard summary
 * strip, future routes that need a similar "label + magnitude"
 * cluster).
 *
 * Visual contract (per DESIGN.md §3.2 Tile value role):
 *  - Frame: `rounded-lg border border-divider-subtle bg-background-default px-4 py-3`
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

/**
 * Week-over-week (or any-period-over-prior-period) trend shown as a
 * small pill underneath the label. Optional — only render when the
 * caller has a real delta. The tone follows the sign by default:
 *   - delta > 0 → warning  (orange pill, trending-up icon)
 *   - delta < 0 → success  (green pill, trending-down icon)
 *   - delta === 0 → muted  (gray pill, minus icon)
 * Callers can override the tone for metrics where "up" is good
 * (revenue, completed) by passing `toneOverride`.
 *
 * The dashboard summary tiles ("In review", "Blocked", "Waiting on
 * client") use this pill to keep week-over-week momentum visible
 * without leaving the section.
 */
export interface StatTileTrend {
  /** Signed delta vs the prior period. */
  delta: number
  /** Override the default tone-from-sign logic. */
  toneOverride?: 'success' | 'warning' | 'muted'
  /** Override the default copy (default: "+N vs last wk" / "−N vs last wk" / "Flat"). */
  label?: ReactNode
  /** Optional aria-label for screen readers. */
  ariaLabel?: string
}

export function StatTile({
  value,
  label,
  tone = 'neutral',
  href,
  onClick,
  ariaLabel,
  className,
  trend,
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
  /** Optional week-over-week trend pill rendered beneath the label. */
  trend?: StatTileTrend | undefined
}) {
  // Value scale aligned with DESIGN.md §3.2 "Tile value" canonical row —
  // text-xl / font-semibold / leading-tight / tabular-nums / tracking-tight.
  const valueClass = cn(
    'text-xl font-semibold leading-tight tabular-nums tracking-tight',
    tone === 'critical' && 'text-text-destructive',
    tone === 'muted' && 'text-text-tertiary',
    tone === 'neutral' && 'text-text-primary',
  )

  const baseClass = cn(
    'flex min-w-[160px] flex-col gap-1 rounded-lg border border-divider-subtle bg-background-default px-4 py-3',
    className,
  )

  // Interactive variants add a hover affordance and a focus ring so
  // the tile reads as tappable. Non-interactive (div) variant stays
  // dead-quiet — no hover transition so the user doesn't expect it
  // to do anything.
  const interactiveClass = cn(
    'group transition-colors hover:border-divider-regular hover:bg-state-base-hover',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-accent-active-alt',
  )

  // Resolve the trend pill's tone + icon + copy. Default mapping
  // (delta sign → tone) is the common case; callers can override
  // when "up" is good for that metric.
  //
  // The pill uses the canonical `<Badge>` primitive. Tone → Badge variant
  // map: success/warning are direct; "muted" maps to `secondary` (the
  // design system's gray-soft fill). Badge handles font sizing; we add
  // `tabular-nums` via className for the delta number specifically.
  let trendPill: ReactNode = null
  if (trend) {
    const sign = trend.delta > 0 ? 'up' : trend.delta < 0 ? 'down' : 'flat'
    const resolvedTone =
      trend.toneOverride ?? (sign === 'up' ? 'warning' : sign === 'down' ? 'success' : 'muted')
    const TrendIcon =
      sign === 'up' ? TrendingUpIcon : sign === 'down' ? TrendingDownIcon : MinusIcon
    const trendCopy =
      trend.label ??
      (sign === 'flat' ? 'Flat' : `${sign === 'up' ? '+' : '−'}${Math.abs(trend.delta)} vs last wk`)
    const badgeVariant =
      resolvedTone === 'success' ? 'success' : resolvedTone === 'warning' ? 'warning' : 'secondary'
    trendPill = (
      <Badge variant={badgeVariant} aria-label={trend.ariaLabel} className="mt-0.5 tabular-nums">
        <TrendIcon aria-hidden />
        {trendCopy}
      </Badge>
    )
  }

  const body = (
    <>
      {value === undefined ? (
        <Skeleton className="h-7 w-12" aria-hidden />
      ) : (
        <span className={valueClass}>{value}</span>
      )}
      <span className="text-sm text-text-secondary">{label}</span>
      {trendPill}
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
        className={cn(baseClass, interactiveClass, 'cursor-pointer text-left')}
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
