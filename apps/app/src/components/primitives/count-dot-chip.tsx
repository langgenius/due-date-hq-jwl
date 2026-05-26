import type { ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * Small "dot + text" count chip — the canonical "N needs review" /
 * "N missing" / "N at risk" pattern used across workbench tables.
 *
 * Extracted 2026-05-26 (Yuqi cross-table drift #9 — "Count chip
 * primitive: one pill for review counts everywhere"). Before this
 * primitive each surface hand-rolled its own `<span>` chain with a
 * `size-1.5 rounded-full` dot + `text-xs font-medium text-text-*`
 * label. Now there's one source of truth so a workbench table can
 * surface a count + tone signal with a single import.
 *
 * Tones map to semantic states:
 *   - `accent`     — needs review, pending CPA attention
 *   - `destructive`— gaps, late, blocked
 *   - `warning`    — at risk, waiting on client
 *   - `success`    — on track, complete (rare — usually `success` is
 *                    expressed by absence rather than a counted chip)
 *   - `muted`      — neutral, informational
 *
 * Renders nothing when `count` is 0 — the chip is itself a "there are
 * some" affordance; a "0 missing" chip would be visual noise. Callers
 * can guard explicitly if they want a zero-state variant.
 *
 * The optional `minWidth` prop reserves horizontal space so rows that
 * differ on copy length ("1 needs review" vs "10 need review") still
 * align their dot+text at the same x-position across the column.
 */
export function CountDotChip({
  count,
  label,
  tone,
  minWidth,
  className,
}: {
  count: number
  /**
   * Trailing copy. Accepts a ReactNode so callers can pass `<Plural>`
   * for i18n-correct singular/plural ("1 needs review" / "2 need
   * review").
   */
  label: ReactNode
  tone: 'accent' | 'destructive' | 'warning' | 'success' | 'muted'
  /** e.g. `'120px'`. When set, the chip reserves this width so a
   * vertical stack of chips stays left-aligned regardless of plural
   * copy length. */
  minWidth?: string
  className?: string
}) {
  if (count === 0) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        tone === 'accent' && 'text-text-accent',
        tone === 'destructive' && 'text-text-destructive',
        tone === 'warning' && 'text-text-warning',
        tone === 'success' && 'text-text-success',
        tone === 'muted' && 'text-text-secondary',
        className,
      )}
      style={minWidth ? { minWidth } : undefined}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block size-1.5 shrink-0 rounded-full',
          tone === 'accent' && 'bg-state-accent-solid',
          tone === 'destructive' && 'bg-state-destructive-solid',
          tone === 'warning' && 'bg-state-warning-solid',
          tone === 'success' && 'bg-state-success-solid',
          tone === 'muted' && 'bg-text-tertiary',
        )}
      />
      {label}
    </span>
  )
}
