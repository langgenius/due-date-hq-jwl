import { AnimatePresence, motion } from 'motion/react'
import { CircleCheckIcon, CircleDashedIcon, CircleDotIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

import { EASE_APPLE, MOTION_DURATION } from '@/lib/motion'

/**
 * SetupStepIcon — the checklist leading glyph shared by SetupProgressCard and
 * SidebarSetupCard (its only two callers). Reads at a glance: green check =
 * done, accent "current" dot = the step to do next, dashed circle = later.
 *
 * The markers are STATIC (no spinner): a perpetually spinning loader read as
 * "loading…" on a step that is simply the next thing to do, and its motion
 * fought the otherwise-still card. "Next" is now an accent CircleDot (a filled
 * centre = you-are-here), distinct from the quiet dashed "later" circle.
 *
 * When a step flips `done` the icon hard-swaps; an `<AnimatePresence mode="wait">`
 * keyed on the visual state pops the incoming check in (scale 0.6→1 + fade) so
 * the completion lands as a small beat rather than an instant cut — the only
 * motion here, governed globally by the root `<MotionConfig reducedMotion="user">`.
 *
 * `variant="sidebar"` is the smaller form (size-3.5) and collapses both not-done
 * states into the dashed circle (tone carries next vs later); the default form
 * (size-4) uses the accent CircleDot for "next".
 */
export function SetupStepIcon({
  done,
  isNext,
  variant = 'default',
}: {
  done: boolean
  isNext: boolean
  variant?: 'default' | 'sidebar'
}) {
  const size = variant === 'sidebar' ? 'size-3.5' : 'size-4'
  // Key the swap on the rendered state so only a real visual change re-triggers
  // the pop (next→done is the one that matters; later→next reuses the loader).
  const state = done ? 'done' : isNext ? 'next' : 'later'
  return (
    <AnimatePresence mode="wait" initial={false}>
      {done ? (
        <motion.span
          key="done"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
          className="inline-flex shrink-0"
        >
          <CircleCheckIcon className={cn(size, 'text-text-success')} aria-hidden />
        </motion.span>
      ) : (
        <motion.span key={state} className="inline-flex shrink-0">
          {variant === 'sidebar' ? (
            // Static dashed circle for "to do" — matches StatusRing's
            // not_started mark. A spinning loader here read as "loading" and
            // its motion fought the otherwise-still cool rail; "next" is now
            // signalled by tone + the label weight, not perpetual spin.
            <CircleDashedIcon
              className={cn(size, isNext ? 'text-text-secondary' : 'text-text-tertiary')}
              aria-hidden
            />
          ) : isNext ? (
            <CircleDotIcon className={cn(size, 'text-text-accent')} aria-hidden />
          ) : (
            <CircleDashedIcon className={cn(size, 'text-text-tertiary')} aria-hidden />
          )}
        </motion.span>
      )}
    </AnimatePresence>
  )
}
