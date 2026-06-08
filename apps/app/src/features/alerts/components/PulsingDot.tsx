import { cn } from '@duedatehq/ui/lib/utils'

/**
 * Canonical tone ladder for the PulsingDot.
 *
 * Semantics (use `alertTone()` for Alerts; other surfaces
 * may pick a tone directly using the same meaning):
 *
 *   • `error`    (red)    — critical: needs immediate attention
 *                            (very-low AI confidence, blocked, overdue).
 *   • `warning`  (amber)  — needs attention soon (matched alert,
 *                            new untouched item).
 *   • `success`  (green)  — healthy / no action required (applied,
 *                            on-track, no impacted clients).
 *   • `normal`   (blue)   — neutral / informational signal.
 *   • `disabled` (gray)   — paused / source-revoked / closed-out.
 *
 * Every site that uses this dot SHOULD pass a `label` so users
 * hovering get a one-line explanation. Without a label the dot is
 * decorative — fine for paired-badge contexts where adjacent copy
 * already carries the meaning.
 */
export type PulsingDotTone = 'success' | 'warning' | 'error' | 'normal' | 'disabled'

interface PulsingDotProps {
  tone?: PulsingDotTone
  /** When true, the outer ring expands rhythmically — the actual "pulse". */
  active?: boolean
  className?: string
  /**
   * Human-readable explanation of what this dot signals in the
   * current context. Renders as both `title` (tooltip on hover) and
   * `aria-label` (screen-reader announcement). Without a label the
   * dot is decorative — surrounding copy must carry the meaning.
   */
  label?: string
}

const FILL_BY_TONE: Record<PulsingDotTone, string> = {
  success: 'bg-components-badge-status-light-success-bg',
  warning: 'bg-components-badge-status-light-warning-bg',
  error: 'bg-components-badge-status-light-error-bg',
  normal: 'bg-components-badge-status-light-normal-bg',
  disabled: 'bg-components-badge-status-light-disabled-bg',
}

// A flat 8px status dot. 2026-06-08 (Yuqi): the shadow halo and the
// `animate-ping` expanding ring were both removed — the dot now reads as a
// calm status color, not a heartbeat/glow. `active` is retained only as a
// data attribute hook for callers that style on it.
export function PulsingDot({ tone = 'success', active = true, className, label }: PulsingDotProps) {
  return (
    <span
      // When a label is provided we promote the dot to an accessible
      // status indicator (role=img + aria-label + title). Without a
      // label it stays aria-hidden — decorative only, surrounding copy
      // must carry the meaning.
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      title={label}
      className={cn('relative inline-flex size-2 shrink-0', className)}
      data-slot="pulsing-dot"
      data-tone={tone}
      data-active={active || undefined}
    >
      <span
        className={cn('relative inline-flex size-2 rounded-full', FILL_BY_TONE[tone])}
      />
    </span>
  )
}
