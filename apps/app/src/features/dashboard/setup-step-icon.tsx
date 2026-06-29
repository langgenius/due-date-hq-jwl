import { AnimatePresence, motion } from 'motion/react'
import { CircleIcon, CircleCheckIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

import { EASE_APPLE, MOTION_DURATION } from '@/lib/motion'

/**
 * SetupStepIcon — the checklist leading glyph shared by SetupProgressCard and
 * SidebarSetupCard (its only two callers). A plain checkbox metaphor that reads
 * at a glance: green check = done, hollow circle = to do. "Next" is just a
 * stronger-toned hollow circle (the label weight does the rest) — no dashed or
 * spinning markers, which read as broken/loading rather than "not yet".
 *
 * When a step flips `done` the icon hard-swaps; an `<AnimatePresence mode="wait">`
 * keyed on the visual state pops the incoming check in (scale 0.6→1 + fade) so
 * the completion lands as a small beat rather than an instant cut — the only
 * motion here, governed globally by the root `<MotionConfig reducedMotion="user">`.
 *
 * `variant="sidebar"` is just the smaller form (size-3.5); the markers are
 * otherwise identical across both callers.
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
          <CircleIcon
            className={cn(size, isNext ? 'text-text-secondary' : 'text-text-tertiary')}
            aria-hidden
          />
        </motion.span>
      )}
    </AnimatePresence>
  )
}
