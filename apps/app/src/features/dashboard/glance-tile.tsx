import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router'

import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * GlanceTile — the "AT A GLANCE" summary tile from the /today and
 * /deadlines designs (Pencil nodes `tc2ug` / `OXSao` / `ztKLk` /
 * `fu4sj` on /today; `Mi5CE` / `H0GSr` / `Y1IdZj` on /deadlines).
 *
 * Anatomy (left → right):
 *   • A circular 28px icon chip whose fill/foreground tone tracks
 *     the tile's `tone` (warning / accent / neutral).
 *   • A vertical body: an uppercase caps `label` (11/600 muted), a
 *     `value` headline (the loudest line — money or short sentence),
 *     and an optional quiet `sub` caption.
 *
 * The whole tile is a click target when `href` is supplied (drills
 * into the matching filtered queue). Tone is mapped onto the existing
 * design-token system — the Pencil "Verdant" canvas colors are
 * intentionally NOT ported; we use `state-warning-*`, `state-accent-*`,
 * and neutral `background-subtle` tokens.
 *
 * Sizing: the value line uses `text-2xl` for the money headline
 * (`emphasis` variant) and `text-sm`/600 for the sentence headlines
 * (`default` variant), matching the Pencil 24/700 vs 14/600 split.
 */
export type GlanceTone = 'warning' | 'accent' | 'neutral'

const ICON_CHIP_TONE: Record<GlanceTone, string> = {
  warning: 'bg-state-warning-hover text-text-warning',
  accent: 'bg-state-accent-hover text-text-accent',
  neutral: 'bg-background-default text-text-primary',
}

const VALUE_TONE: Record<GlanceTone, string> = {
  warning: 'text-text-warning',
  accent: 'text-text-primary',
  neutral: 'text-text-primary',
}

export function GlanceTile({
  icon: Icon,
  tone = 'neutral',
  label,
  value,
  sub,
  emphasis = false,
  href,
  ariaLabel,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  tone?: GlanceTone
  /** Uppercase eyebrow label (e.g. "AT RISK"). */
  label: ReactNode
  /** Loudest line. `undefined` renders a skeleton while loading. */
  value: ReactNode | undefined
  /** Quiet supporting caption below the value. */
  sub?: ReactNode
  /** When true the value renders at money-headline scale (24/700). */
  emphasis?: boolean
  /** Drill-in destination. When set the tile renders as a Link. */
  href?: string
  ariaLabel?: string
}) {
  const body = (
    <>
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full',
          ICON_CHIP_TONE[tone],
        )}
      >
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-semibold tracking-[0.6px] text-text-muted uppercase">
          {label}
        </span>
        {value === undefined ? (
          <Skeleton className={cn('w-24', emphasis ? 'h-7' : 'h-5')} aria-hidden />
        ) : (
          <span
            className={cn(
              emphasis
                ? 'text-2xl font-bold leading-tight tracking-[-0.4px] tabular-nums'
                : 'text-sm font-semibold leading-snug',
              VALUE_TONE[tone],
            )}
          >
            {value}
          </span>
        )}
        {sub ? <span className="text-xs leading-snug text-text-tertiary">{sub}</span> : null}
      </span>
    </>
  )

  const shell = cn(
    'flex min-w-0 items-start gap-3 rounded-2xl bg-background-subtle px-[18px] py-3.5',
  )

  if (href) {
    return (
      <Link
        to={href}
        aria-label={ariaLabel}
        className={cn(
          shell,
          'group transition-colors hover:bg-background-default-hover',
          'outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        )}
      >
        {body}
      </Link>
    )
  }

  return (
    <div aria-label={ariaLabel} className={shell}>
      {body}
    </div>
  )
}
