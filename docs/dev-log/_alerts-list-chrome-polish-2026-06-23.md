# Alerts list — chrome polish (alignment, day band, checkbox)

**Date:** 2026-06-23
**Surface:** `apps/app/src/features/alerts/AlertsListPage.tsx`,
`apps/app/src/features/alerts/components/PulseAlertRow.tsx`

Page-feedback batch on `/alerts` (Yuqi):

- **Flush-left alignment (#2 "remove the px-5", #4 "header looks weird with no
  side border").** The toolbar, day bands, and rows carried an internal `px-5`,
  so their content sat 20px right of the page header title. Removed it from all
  three — everything now lines up on the page content column (measured: header,
  toolbar, band text, row content all at the same left edge). The list is
  borderless by design, so the inset was reading as a phantom card edge.

- **Day band thinner + de-barred (#3 "thinner — and apply to everything else",
  #4).** The day header was a full-bleed `bg-background-subtle` gray bar
  (`py-2`, 35px) — on a borderless list it read as a weird floating header.
  Now a quiet uppercase date eyebrow on an opaque `bg-background-default` fill
  (kept opaque only so the sticky band masks rows scrolling under it), `py-1.5`
  (31px). Reads as a section marker, not a bar. Shared component → applies to
  both the active list and `/alerts/history` (both render `PulseAlertList`).

- **Checkbox less obvious (#5).** The bulk-select checkbox (row + day-band
  select-all) was hover-revealed at full opacity. Now reveals as a quiet ghost
  (60%) on row/band hover and only goes solid when the box itself is focused or
  a selection is active — a read-first triage list isn't fronted by checkboxes.

## Icon weight — 1.5 product-wide (#5)

Yuqi: "the icon line weight in sidenav is different to the rest of the product."
The sidenav forced `[&_svg]:[stroke-width:1.5]` (a deliberate 2026-06-09
"精致/elegant" choice); the rest used Lucide's default 2px. Asked which way to
unify — Yuqi chose **1.5 everywhere (refined)**.

- Added a global `.lucide { stroke-width: 1.5 }` rule (globals.css). Scoped to
  the `.lucide` class so raw SVGs — brand marks, the `StatusRing`, source-logo
  art — keep their own widths (verified: a non-Lucide SVG still reports its own
  stroke; a content-area `lucide-file-pen` now reports 1.5px, matching the nav).
- It intentionally overrides the few per-icon `strokeWidth` props (1.75 delight,
  2 fun-icon) so the weight is uniform. The sidebar's local override is now
  redundant but harmless (same value); left untouched to avoid editing shared
  packages/ui.

## Verified

- tsgo + build clean.
- Live (1648×812): header / toolbar / day band / rows all flush at one left
  edge; band 31px tall, white (no gray bar). Checkbox change compiles + applies.

## Correction — frame the list, re-colour the band (same day)

Yuqi, seeing the result: "the alert list needs left and right border… and the
date header row needs colour." The borderless/white-header direction was wrong —
reversed:

- **List frame back:** `border border-divider-regular` on the list wrapper (the
  canonical bordered table frame, like /today + /deadlines). Supersedes the
  2026-06-12 "hide the border" pass.
- **Rows + day band re-padded:** restored `px-5` so content clears the new
  border (a framed card needs cell padding).
- **Day band colour back:** `bg-background-default` → `bg-background-subtle` (the
  tinted section band now reads correctly *because* the frame contains it). Kept
  the thinner `py-1.5`.
- The toolbar stays flush (no px-5) above the card, aligned with the frame's
  left edge + the page header.

## Correction 2 — checkbox always showing + view toggle size (same day)

- **Checkbox always showing.** Earlier I read "checkbox always showing but less
  obvious" as "hover-reveal it" — wrong. Yuqi: "alert list should have the
  checkbox always showing." Reverted the hover-reveal on both the row checkbox
  and the day-band select-all: they're now `opacity-100` always (the unchecked
  outline box is quiet enough that a persistent column stays subtle).
  `selectionActive` is now an unused-but-harmless prop.
- **View-mode Segmented `size="sm"`.** The /alerts list/map toggle had no `size`
  (default, larger); /deadlines + /clients use `size="sm"`. Added `size="sm"` so
  it matches ("should follow the size on deadlines").
