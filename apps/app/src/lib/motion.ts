/**
 * Motion grammar — the framer-motion side of the app's single motion
 * vocabulary (2026-06-11, Yuqi: "一套 motion 词汇").
 *
 * The CSS side lives in `packages/ui/src/styles/tokens/primitives.css`:
 *   • micro-interactions (hover/press/fade) — the Tailwind DEFAULT
 *     (150ms, decelerating ease-out). Call sites should NOT restate
 *     `duration-*`/`ease-*` for ordinary states.
 *   • full-surface slides (sidebar/drawer/panel width) — `ease-apple`
 *     with an explicit longer duration.
 *   • `prefers-reduced-motion` — globally killed in preset.css.
 *
 * This module is the SAME grammar for `motion/react` components, which
 * Tailwind defaults can't reach. Root-level `<MotionConfig
 * reducedMotion="user">` (main.tsx) handles reduced-motion for all of
 * these — never hand-roll `useReducedMotion` guards per call site.
 *
 *   ENTER  (content mount, tab panel, card reveal)  180ms ease-apple
 *   EXIT   (dismiss, quick fade)                    120ms ease-apple
 *   SURFACE(drawer/sheet/large container)           300ms ease-apple
 */
export const EASE_APPLE = [0.32, 0.72, 0, 1] as const

export const MOTION_DURATION = {
  enter: 0.18,
  exit: 0.12,
  surface: 0.3,
} as const

/** Canonical tab-panel / content-mount enter: slide 12px + fade, 180ms. */
export const contentEnterMotion = {
  initial: { x: 12, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  transition: { duration: MOTION_DURATION.enter, ease: EASE_APPLE },
} as const

/** Plain fade for small elements (badges, hints). */
export const fadeMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: MOTION_DURATION.exit, ease: EASE_APPLE },
} as const
