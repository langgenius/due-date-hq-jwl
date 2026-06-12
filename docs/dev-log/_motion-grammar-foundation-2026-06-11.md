# Motion grammar — app-wide foundation (2026-06-11)

Yuqi: "一套 motion 词汇… 全产品一个 duration/easing 系统… reduced-motion 全
覆盖… 不要错过任何细节." Inventory found 9 distinct framer durations
(0.08–0.64s), 5 CSS durations, ease-out/ease-apple split ~50/50, reduced-motion
only on 12 ad-hoc spots, pressed states on 8.

Enforced at three layers — this commit is LAYER 1 (global) + the first of
LAYER 2 (primitives):

- **Global reduced-motion kill switch** (preset.css): one
  `@media (prefers-reduced-motion: reduce)` rule zeroes every CSS
  transition/animation (0.01ms, not `none`, so \*end events still fire).
  Spinner exception kept visible at 3s per WCAG 2.3.3.
- **`<MotionConfig reducedMotion="user">`** at the app root (main.tsx) —
  every motion/react component respects the OS setting from one config.
- **`apps/app/src/lib/motion.ts`** — the framer-side grammar: EASE_APPLE,
  durations (enter 180ms / exit 120ms / surface 300ms), canonical
  `contentEnterMotion` + `fadeMotion` presets. Pairs with the CSS-side
  default (150ms decel ease-out) the parallel token pass added to
  primitives.css.
- **Button primitive**: `transition-colors` → `transition` +
  `active:scale-[0.98]` — the app-wide pressed state for discrete controls
  (rows/cells get `active:bg` instead, applied in the sweep).

LAYER 3 (call-site sweep: off-system durations → default/system, framer
configs → motion.ts presets, missing hover transitions, row pressed states)
follows as its own pass.
