import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * SeverityChip — the canonical color-coded "level" pill. ONE home for every
 * severity / priority / risk tier across the app: alert priority (urgent / high
 * / normal), dashboard triage severity (critical / high / upcoming), rule risk
 * (high / med / low). Replaces the inline `style={{ backgroundColor, color }}`
 * chips that had drifted across two token families (`--state-*` in alerts vs
 * `--severity-*` in rules) for the same meaning.
 *
 * Treatment (Yuqi 2026-06-18): the soft-tint `--severity-*` ramp — a light
 * tinted ground + saturated text — so the four tiers read as one family and
 * track the theme. Color encodes URGENCY / severity ONLY; a factual qualifier
 * that sits on a different axis (e.g. "high impact" = client reach) uses
 * `level="neutral"` so a row never wears two alarms (see PulseAlertRow: the row
 * owns a single red on the urgent pill, reach is a neutral tag).
 *
 * Not for: status pills (needs-action / closed), AI-confidence pills, or status
 * dots — those are different axes with their own primitives.
 */
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'neutral'

// Static class strings (never interpolate `bg-severity-${level}` — Tailwind
// can't see dynamic class names, and the token utilities would tree-shake out).
const LEVEL_CLASS: Record<SeverityLevel, string> = {
  critical: 'bg-severity-critical-tint text-severity-critical',
  high: 'bg-severity-high-tint text-severity-high',
  medium: 'bg-severity-medium-tint text-severity-medium',
  neutral: 'bg-severity-neutral-tint text-severity-neutral',
}

export function SeverityChip({
  level,
  children,
  size = 'md',
  shape = 'pill',
  icon,
  className,
}: {
  level: SeverityLevel
  children: ReactNode
  /** `md` (h-5, default) for rows + headers; `sm` (h-[18px]) for dense insets. */
  size?: 'sm' | 'md'
  /** `pill` (rounded-full, default) for alert rows; `square` (rounded-sm) for
   * the registry-table eyebrow-tag treatment. */
  shape?: 'pill' | 'square'
  /** Optional leading glyph (size it `size-3`); rendered before the label. */
  icon?: ReactNode
  className?: string | undefined
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 font-semibold tracking-eyebrow whitespace-nowrap uppercase',
        shape === 'pill' ? 'rounded-full' : 'rounded-sm',
        size === 'md' ? 'h-5 px-2 text-xs' : 'h-[18px] px-1.5 text-caption-xs',
        LEVEL_CLASS[level],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
