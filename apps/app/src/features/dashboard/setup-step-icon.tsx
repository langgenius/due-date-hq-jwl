import { AnimatePresence, motion } from 'motion/react'
import { CircleCheckIcon, CircleDashedIcon, LoaderIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

import { EASE_APPLE, MOTION_DURATION } from '@/lib/motion'

/**
 * SetupStepIcon — the checklist leading glyph shared by SetupProgressCard and
 * SidebarSetupCard (its only two callers). Reads at a glance: green check =
 * done, spinning loader = the step to do next, dashed circle = later.
 *
 * When a step flips `done` the icon hard-swaps; an `<AnimatePresence mode="wait">`
 * keyed on the visual state pops the incoming check in (scale 0.6→1 + fade) so
 * the completion lands as a small beat rather than an instant cut. The loader's
 * `animate-spin` carries `motion-reduce:animate-none`; the pop itself is
 * motion/react and is globally governed by the root `<MotionConfig
 * reducedMotion="user">`.
 *
 * `variant="sidebar"` is the smaller form (size-3.5) and collapses the "later"
 * state into a static, un-spinning loader to match the sidebar's two-state
 * checklist; the default form (size-4) uses the dashed circle for "later".
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
            <LoaderIcon
              className={cn(
                size,
                'text-text-tertiary',
                isNext && 'animate-spin text-text-accent motion-reduce:animate-none',
              )}
              aria-hidden
            />
          ) : isNext ? (
            <LoaderIcon
              className={cn(size, 'animate-spin text-text-accent motion-reduce:animate-none')}
              aria-hidden
            />
          ) : (
            <CircleDashedIcon className={cn(size, 'text-text-tertiary')} aria-hidden />
          )}
        </motion.span>
      )}
    </AnimatePresence>
  )
}
