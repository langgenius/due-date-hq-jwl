# Motion grammar — layer-3 sweep close-out (2026-06-11)

Batch 1 (76be81f2, agent) migrated the framer configs in the alerts detail
pane + obligation drawer to `@/lib/motion`. The batch-2/3 agent stalled on the
platform throttle, so this close-out finishes the remaining call sites by hand.

## Per-site disposition

- `AlertDetailDrawer` header + title collapse: `transition-all duration-200` →
  `transition-all` (inherits the 150ms decel default; matches the deadline
  drawer's collapse tempo).
- `lifecycle-strip-cell` hover: drop `duration-200` → default.
- `deadlines-at-a-glance` expand + `app-shell` route progress:
  `ease-out` → `ease-apple` (surface moves keep `duration-300`).
- Progress fills ×3 (`progress.tsx` primitive, queue `primitives.tsx`,
  `WizardShell`): unified on `transition-[width] duration-300 ease-apple`
  (were 200/200/500 ease-out).
- Chevron rotates (`obligations.tsx`, `rules.library.tsx`): explicit
  `ease-out` deleted — the default timing function is already the decel curve.
- `obligations.tsx`: local `DETAIL_SWIFT_EASE` constant = the same cubic as
  `EASE_APPLE` → now aliases the shared token; one straggler inline
  `duration: 0.18` → `MOTION_DURATION.enter`.

## Deliberate outliers (kept, documented)

- Sidebar collapse choreography (`sidebar.tsx`) — hand-tuned coordinated
  sequence, owns its timings.
- Detail-pane stagger ladder (`obligations.tsx` 0.08–0.64) + the alerts 0.64s
  paper-rise — choreographed sequences on the shared curve.
- `animate-in fade-in duration-150` entrances — animations keep explicit
  durations per the house recipe (primitives.css).
- Billing CTA shimmer — decorative marketing accent.

tsgo clean; obligations 91/91. With this, layers 1-3 are closed: one curve
(ease-apple / decel default), one tempo set (150 default · 300 surface ·
framer 180/120/300), reduced-motion globally covered (CSS kill switch +
MotionConfig), pressed states via the Button primitive.
