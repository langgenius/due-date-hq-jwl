# Dialog modal motion — split from the anchored-popup transition

_2026-07-22_

## What

Dialog and alert-dialog were animating with `overlayPopupAnimationClassName`,
the class tuned for anchored popovers (symmetric 150ms default `ease`, scale
from the anchor's `--transform-origin`). A centered modal is a different
surface: it has no anchor, and open/close deserve different tempos.

New `overlayModalAnimationClassName` in `packages/ui/src/lib/overlay.ts`
(transitions.dev modal recipe):

- **Open**: 250ms, `cubic-bezier(0.22,1,0.36,1)` (strong deceleration),
  scale 0.96→1 + fade, from the modal's own center.
- **Close**: 150ms to the same scale/fade — dismissal feels immediate,
  not a replay in reverse.
- Backdrop fade timing mirrors the popup (250/150), scoped in
  `dialog.tsx` / `alert-dialog.tsx` so the sheet backdrop keeps its own timing.
- `motion-reduce:transition-none` preserved.

Anchored surfaces (popover, select, dropdown-menu, tooltip, preview-card)
still use `overlayPopupAnimationClassName` unchanged.

## Verification

Live on /preview gallery (session dev server, port 5177): computed styles on
`[data-slot="dialog-content"]` show `transition: scale, opacity · 0.25s ·
cubic-bezier(0.22, 1, 0.36, 1)`, center transform-origin, starting frame
scale 0.96/opacity 0; with `data-ending-style` stamped, duration reads 0.15s
on both popup and overlay. Screenshot of settled dialog confirmed rendering.

Canon updated: `docs/Design/motion-microinteraction-catalog-2026-06-20.md`
(2026-07-22 update block).
