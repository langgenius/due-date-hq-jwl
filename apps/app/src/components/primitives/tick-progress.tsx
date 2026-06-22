import { motion } from 'motion/react'

import { cn } from '@duedatehq/ui/lib/utils'

import { EASE_APPLE, MOTION_DURATION } from '@/lib/motion'

/**
 * TickProgress — a segmented tick-mark progress bar (Yuqi ref: the "Almost
 * There" setup card). A fixed row of thin vertical ticks; the filled run ramps
 * brand cyan → navy across its own length so progress reads as a little gradient
 * climbing the bar, while the remainder stays a quiet divider grey.
 *
 * Decorative rendering only — the caller owns the accessible value (pass
 * `aria-label` / wrap in a labelled region). `tickCount` is the resolution of
 * the bar (not the number of real steps): a 3-step checklist still renders a
 * smooth ~28-tick bar so it reads as a bar, not three dashes.
 */
export function TickProgress({
  value,
  max = 100,
  tickCount = 28,
  className,
}: {
  /** Current progress, in the same unit as `max`. */
  value: number
  /** Full-scale value (default 100, i.e. `value` is a percent). */
  max?: number
  /** Number of ticks rendered (visual resolution, not step count). */
  tickCount?: number
  className?: string
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const filled = Math.round(tickCount * ratio)
  const lastFilled = Math.max(filled - 1, 1)
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('flex items-center gap-[3px]', className)}
    >
      {Array.from({ length: tickCount }).map((_, i) => {
        const on = i < filled
        // Per-tick gradient: filled ticks ramp cyan → navy across the filled
        // run, so the bar carries the brand gradient rather than one flat fill.
        // Computed per tick (like StatusRing's arc) — a token can't express the
        // position.
        const tickClass = cn(
          'h-3.5 w-[3px] shrink-0 rounded-full transition-colors duration-300',
          !on && 'bg-divider-regular',
        )
        // Filled ticks fade up L→R on mount (opacity 0.35 → 1, ~25ms apart,
        // capped ~200ms) so the gradient appears to climb the bar instead of
        // painting at full width instantly. Opacity-only — colour/size/class
        // are untouched. Empty ticks stay static. Reduced-motion is governed
        // globally by the root <MotionConfig reducedMotion="user">.
        if (!on) {
          return <span key={i} aria-hidden className={tickClass} />
        }
        return (
          <motion.span
            key={i}
            aria-hidden
            className={tickClass}
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: MOTION_DURATION.enter,
              ease: EASE_APPLE,
              delay: Math.min(i, 8) * 0.025,
            }}
            style={{
              backgroundColor: `color-mix(in srgb, var(--color-brand-ink) ${(i / lastFilled) * 100}%, var(--color-brand-highlight))`,
            }}
          />
        )
      })}
    </div>
  )
}
