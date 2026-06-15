# Alert source-link unification — one `AlertSourceLink` primitive

**Date:** 2026-06-15
**Surface:** Alerts (list row, detail rail, detail masthead)
**Type:** design-system cohesion (DS Batch 3, the structural half of "a-b")

## Problem

The "open source" affordance — a source name followed by a trailing `↗`
external-link icon — was hand-rolled three separate times across the
alerts feature:

1. **`PulseAlertRow`** (active list) — a `role="link"` span with
   `onClick`/`onKeyDown` → `window.open(..., '_blank')` and
   `stopPropagation` (the row itself is clickable), wrapped in an
   "Open source · `<url>`" tooltip.
2. **`AlertListRail`** (detail secondary sidebar) — the same
   `role="link"` span pattern, but **no** tooltip and a slightly
   different class string (no `font-medium`).
3. **`AlertDetailDrawer`** (detail masthead) — a real `<a target="_blank">`
   (correct here — the masthead is not inside a clickable row, so native
   middle-click / open-in-new-tab should work) with yet another class
   string (`underline-offset-2`, no `font-medium`).

Three implementations of one visual, drifting on weight, the no-URL
fallback, and `rel`. Two of them also rendered the `↗` icon on the
**no-URL** (non-clickable) caption — a dishonest affordance (a
"there's a link here" glyph on something that isn't a link).

## Fix

New `features/alerts/components/AlertSourceLink.tsx` — the single home.

- **Default (in-row) variant:** `role="link"` span + `stopPropagation`
  so opening the source never also fires the surrounding row's
  navigation. Used by `PulseAlertRow` (with `withTooltip`) and
  `AlertListRail`.
- **`standalone` variant:** renders a real `<a target="_blank"
  rel="noopener noreferrer">` for contexts that are NOT inside a
  clickable row (the detail masthead) — native middle-click and
  open-in-new-tab are preserved. Used by `AlertDetailDrawer`.
- **No-URL:** a plain caption with **no** `↗` icon — the honest choice
  (aligns the row to the rail's prior, correct behaviour).
- One token contract everywhere: `text-sm font-medium text-text-tertiary`,
  trailing `↗` (the app-wide external-link order), hover →
  `text-text-secondary` + underline, accent focus ring.

## Verification

- `tsc --noEmit` clean across all three call sites + the new component.
- `check-token-discipline.mjs` — no new violations.
- Live (app-5177): `/alerts` list rows + rail render the `role="link"`
  span at 13px/500/tertiary with the `↗`; the detail masthead renders a
  real `<a href target="_blank" rel="noopener noreferrer">` at
  13px/500. No error boundary.

## Notes

`AlertDetailDrawer`'s adoption of the primitive is committed separately
from the row/rail/component unit — the file was carrying an unrelated
in-flight `heroScrolled` change from a parallel session at the time, so
its source-link hunk lands once that settles to avoid sweeping their
work.
