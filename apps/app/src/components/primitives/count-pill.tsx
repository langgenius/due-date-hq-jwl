import type { ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * CountPill — the canonical "N <noun>" status/count pill that sits next to a
 * page title or rail head. ONE shape (soft fill, rounded-full, h-[22px],
 * tabular-nums) across the app so a count reads the same everywhere; the
 * `tone` carries the meaning:
 *
 *   - `destructive` (default) — the urgent / actionable subset. Red fill +
 *     red dot. "8 active", "N overdue". (Default so the pre-existing alerts
 *     header + alert/deadline rail-head call-sites keep their look.)
 *   - `neutral` — a plain total/scope count. Quiet section fill, NO dot.
 *     "28" deadlines, "9" clients, "N" rules. The dot is an attention cue, so
 *     a neutral total doesn't get one.
 *   - `accent` — an in-progress / informational count. Blue.
 *   - `warning` — a soft-warning count. Amber.
 *
 * It is a STATUS indicator, not a button (no hover/press affordance). The
 * green "LIVE" monitoring chip is a different semantic and lives in
 * `MonitoringChip`.
 */
type CountPillTone = 'destructive' | 'neutral' | 'accent' | 'warning'

const TONE: Record<CountPillTone, { bg: string; text: string; dot: string }> = {
  destructive: {
    bg: 'bg-state-destructive-hover',
    text: 'text-text-destructive',
    dot: 'bg-text-destructive',
  },
  neutral: {
    bg: 'bg-background-section',
    text: 'text-text-secondary',
    dot: 'bg-text-quaternary',
  },
  accent: {
    bg: 'bg-state-accent-hover',
    text: 'text-text-accent',
    dot: 'bg-text-accent',
  },
  warning: {
    bg: 'bg-state-warning-hover',
    text: 'text-text-warning',
    dot: 'bg-text-warning',
  },
}

export function CountPill({
  children,
  tone = 'destructive',
  dot,
  className,
}: {
  children: ReactNode
  tone?: CountPillTone
  /**
   * Show the leading status dot. Defaults on for the colored tones (a dot
   * reads as "attention"), off for `neutral` (a plain total count).
   */
  dot?: boolean
  className?: string
}) {
  const t = TONE[tone]
  const showDot = dot ?? tone !== 'neutral'
  return (
    <span
      className={cn(
        // `leading-none` so the pill keeps its own ~22px height instead of
        // inheriting the line-height of whatever title it sits beside — next to
        // the 28px page-header title the inherited 32px line-box made it taller.
        'inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-sm leading-none font-medium tabular-nums',
        t.bg,
        t.text,
        className,
      )}
    >
      {showDot ? <span className={cn('size-1.5 rounded-full', t.dot)} aria-hidden /> : null}
      {children}
    </span>
  )
}
