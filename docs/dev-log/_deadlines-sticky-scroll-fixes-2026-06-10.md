# /deadlines scroll + sticky fixes (2026-06-10)

Yuqi: "inspect all of the scroll interaction and sticky on top, across the
application" + "the sticky on top should always have a page-consistent top
padding and bottom padding."

Ran a cross-app sticky/scroll audit. The `/deadlines` list sticky stack was
verified correct (filter bar + table header pin flush via a dynamically-measured
offset, opaque bgs, no bleed). One real bug on the detail page, plus the new
padding rule:

## Detail page — sticky tab bar bleed-through (fixed)

A 2026-06-10 change had removed the sticky tab bar's background ("reads as part
of the page"). That's fine for the `/clients` panel, but on the standalone
**page** the tab content scrolls directly behind the bar, so a transparent fill
let rows bleed through it when pinned — a jumbled overlap of hero / tab bar /
content on scroll. Restored an opaque page-matching fill
(`bg-background-subtle`) on the sticky tab bar **in page mode only**; panel/sheet
keep the seamless warm-canvas look.

## Page-consistent sticky padding

- **Detail tab bar** (`ObligationQueueDetailDrawer.tsx`): symmetric `pt-3 pb-3`
  (page mode) so the pinned band reads as a clean, balanced strip.
- **List toolbar** (`obligations.tsx`): added a plain `pt-3` (the rows already
  carry `pb-3`) so the pinned toolbar has consistent top + bottom padding. Uses
  NO negative margin — unlike the earlier `-mt-6/pt-6` hack that cropped the
  focused search ring — so it's crop-safe.

## Verified

`pnpm check` 0 errors. Live: list toolbar pins at top-0 with 12px top padding
(status pill-strip fully visible, uncropped); detail tab bar opaque
(`242,244,247`) + 12px top/bottom padding, content scrolls cleanly under it.

Known minor: on the detail hero collapse, the meta + tax-year rows hide
correctly but the title doesn't shrink the last few px (22 vs intended 16) —
cosmetic, the page reads clean. Deferred.

Audit also flagged (pre-existing, not changed): `/clients` date-strip + tabs
both `sticky top-0` (overlap by design), detail sticky footer missing z-index,
table-header z-10 vs documented z-30, settings sticky sidebar missing bg.
