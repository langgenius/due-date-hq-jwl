import { cn } from '@/lib/utils'

/**
 * StatusRing — the obligation lifecycle status mark (adopted 2026-06-18,
 * replacing the per-status lucide glyph set). Rendered app-wide via `StatusMark`
 * in status-control.tsx. The ring fills as a deadline advances down the happy
 * path so a queue scan reads *how far along* each row is, not just *what state*
 * — "status is the primary key of the product."
 *
 *   not_started → empty dashed ring
 *   in_review   → ~50% filled arc
 *   filed       → ~85% filled arc
 *   completed   → solid disc + check
 *
 * Off-path states break the ring pattern with a distinct glyph, because they are
 * not "more progress":
 *   waiting     → ring + pause bars
 *   blocked     → ring + slash
 *
 * Monochrome via `currentColor` (like a lucide glyph) so the parent's status
 * tone class drives the color — a drop-in for `STATUS_ICON` if adopted. The
 * track of a partial ring is the same hue at low opacity, so each mark stays one
 * color. Maps off the 6-state v2 collapse (`useLifecycleV2StatusLabels`).
 */
export type StatusRingLevel =
  | 'not_started'
  | 'waiting'
  | 'blocked'
  | 'in_review'
  | 'filed'
  | 'completed'

// Circumference for r=6 (2π·6 ≈ 37.7); arc dasharray = filled-length C·pct.
const RING_CIRCUMFERENCE = 37.7

export function StatusRing({
  level,
  className,
}: {
  level: StatusRingLevel
  className?: string | undefined
}) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={cn('size-4 shrink-0', className)} aria-hidden>
      {level === 'completed' ? (
        <>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path
            d="M5 8.2 L7 10.2 L11 6"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : level === 'not_started' ? (
        <circle
          cx="8"
          cy="8"
          r="6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="2 2.2"
        />
      ) : level === 'waiting' ? (
        <>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
          <rect x="6" y="5.2" width="1.3" height="5.6" rx="0.55" fill="currentColor" />
          <rect x="8.7" y="5.2" width="1.3" height="5.6" rx="0.55" fill="currentColor" />
        </>
      ) : level === 'blocked' ? (
        <>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
          <line
            x1="5.5"
            y1="5.5"
            x2="10.5"
            y2="10.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" opacity="0.25" />
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray={`${level === 'filed' ? 32 : 18.85} ${RING_CIRCUMFERENCE}`}
            transform="rotate(-90 8 8)"
          />
        </>
      )}
    </svg>
  )
}
