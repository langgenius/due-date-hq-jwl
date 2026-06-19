import type { ReactNode } from 'react'
import { ArrowRightIcon, ChevronRightIcon } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * ValueDiff — the canonical "value changed from OLD → NEW" renderer (img-153).
 *
 * ONE home for the before→after pattern that had been hand-rolled inline (the
 * /alerts KeyChange date shift). A regulatory change is structurally a diff —
 * a due date moves, a form is superseded, a jurisdiction is reassigned — so it
 * deserves a single primitive rather than a per-surface span cluster.
 *
 * Two modes:
 *  - `inline` (default): OLD (struck through, muted) → arrow → NEW (emphasised),
 *    with an optional toned delta ("3 days sooner"). The /alerts KeyChange row.
 *  - `compact`: a tight "OLD › NEW" chip; the full diff + delta + an optional
 *    label surface on hover (Tooltip). For dense rows / tight cells where the
 *    inline form is too wide (audit-log transition rows, activity timelines).
 *
 * Tone for the delta is the CALLER's call — pass `deltaClassName` (e.g.
 * `DUE_DATE_DIFF_TONE_CLASS[dueDateDiffTone(n)]`) so this primitive stays
 * domain-agnostic and the "sooner = red / later = green" mapping keeps its
 * single home in due-date-tone.ts. Color encodes the delta only; never wrap the
 * whole diff in a tone (one signal, per the no-double-highlight canon).
 */
export function ValueDiff({
  from,
  to,
  delta,
  deltaClassName,
  label,
  mode = 'inline',
  mono = true,
  className,
}: {
  /** The prior value (rendered struck-through / muted). */
  from: ReactNode
  /** The new value (rendered emphasised). */
  to: ReactNode
  /** Optional magnitude, e.g. "3 days sooner". Inline: trailing toned text.
   *  Compact: shown in the hover tooltip. */
  delta?: ReactNode
  /** Tone class for the delta text (caller-supplied so tone stays single-sourced). */
  deltaClassName?: string | undefined
  /** Compact-mode tooltip heading, e.g. "Due date". Ignored inline. */
  label?: ReactNode
  mode?: 'inline' | 'compact'
  /** Tabular mono numerals — on by default (dates, codes). */
  mono?: boolean
  className?: string | undefined
}) {
  const monoCls = mono ? 'font-mono tabular-nums' : ''

  if (mode === 'compact') {
    return (
      <Tooltip>
        <TooltipTrigger
          render={(props) => (
            <span
              className={cn(
                'inline-flex w-fit cursor-help items-center gap-1 rounded-md bg-background-subtle px-1.5 py-0.5 text-xs font-medium outline-none',
                className,
              )}
              {...props}
            >
              <span className={cn(monoCls, 'text-text-muted line-through')}>{from}</span>
              <ChevronRightIcon className="size-3 shrink-0 text-text-muted" aria-hidden />
              <span className={cn(monoCls, 'font-semibold text-text-primary')}>{to}</span>
            </span>
          )}
        />
        <TooltipContent>
          {label ? <span className="font-semibold">{label}: </span> : null}
          {from} → {to}
          {delta ? <> · {delta}</> : null}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <span className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className={cn(monoCls, 'text-sm font-medium text-text-muted line-through')}>
        {from}
      </span>
      <ArrowRightIcon className="size-3 shrink-0 text-text-muted" aria-hidden />
      <span className={cn(monoCls, 'text-sm font-semibold text-text-primary')}>{to}</span>
      {delta ? <span className={cn('text-sm font-medium', deltaClassName)}>{delta}</span> : null}
    </span>
  )
}
