# 2026-06-09 — Alert detail: fill the panel column, cap the reading measure

## Problem

Yuqi: "so what is the design decision for the right side?" — the alert detail
panel (`AlertDetailDrawer` panel mode) left a ~96px **dead white strip** between
the `#f2f2f2` panel and the viewport edge.

Measured live at 1512px: the `<aside>` was **980px wide, ending at x=1416**,
while its column ran to x=1512. There was no design intent — the aside had no
`flex-1`/`w-full`, so it shrank to its content's intrinsic width and the leftover
column showed through as the parent's white background. It read as "the panel
ends early."

## Decision (Yuqi: option B, then "center the content")

Fill the surface, cap the reading measure, **center** it:

- The `<aside>` now fills its column (`w-full`) so the `#f2f2f2` surface reaches
  the viewport edge — the calm gray now breathes **by design**, not by accident.
- The document **content** is capped to a **760px** reading measure and
  **centered** in the column (Yuqi follow-up: "have the content at the center of
  the right panel"), so prose lines don't stretch to the full ~980px column and
  the gray gutters are symmetric (158px each side at 1512px) rather than a single
  lopsided trailing margin.
- **Chrome borders/backgrounds stay full-width** (top BackStrip, SheetHeader
  divider, SheetFooter border + bg) so no bar ever looks cut off; only the
  content _inside_ each region is capped.

## Implementation

`apps/app/src/features/alerts/AlertDetailDrawer.tsx` (panel mode only):

- aside root: added `w-full`.
- Top BackStrip: content wrapped in `mx-auto flex w-full max-w-[760px]`
  (border/px-12 stay on the full-width outer).
- `SheetHeader`: `[&>*]:mx-auto [&>*]:w-full [&>*]:max-w-[760px]` (border stays
  full-width).
- Scroll body: `[&>*]:mx-auto [&>*]:w-full [&>*]:max-w-[760px]` (scrollbar stays
  at the panel's right edge).
- `SheetFooter`: actions wrapped in `mx-auto flex w-full max-w-[760px]`
  (border/bg stay full-width).

## Verify

- `npx tsgo --noEmit -p apps/app` — clean.
- Live at 1512×861: aside `left 436 → right 1512` (fills, no white strip); header
  - body content both `484 → 1244` (uniform 760px, left-pinned, aligned); footer
    "Mark reviewed" aligns to the same right edge; kbd hints still fit; no
    horizontal scroll.

Note: sheet mode (off-route fallback) is unchanged — it has its own
viewport-capped width.
