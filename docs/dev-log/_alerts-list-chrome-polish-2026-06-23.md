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

## Deferred — icon weight (#5)

Yuqi: "the icon line weight in sidenav is different to the rest of the product."
Confirmed: `packages/ui/src/components/ui/sidebar.tsx` forces
`[&_svg]:[stroke-width:1.5]` on every rail glyph (a deliberate 2026-06-09
"精致/elegant" choice), while the rest of the product uses Lucide's default 2px.
Either direction (coarsen nav → 2, or extend elegant 1.5 product-wide) reverses
a deliberate decision and is app-wide, so it's held for an explicit call.

## Verified

- tsgo + build clean.
- Live (1648×812): header / toolbar / day band / rows all flush at one left
  edge; band 31px tall, white (no gray bar). Checkbox change compiles + applies.
