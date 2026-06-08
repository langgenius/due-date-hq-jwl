# 2026-06-08 — /deadlines table: eliminate horizontal scroll

## What

The queue table overflowed the viewport (Status column + its signal badges
clipped off-screen) after the EXPOSURE column landed. Reworked the column-width
budget so the table fits the container with **zero horizontal overflow**
(measured `table-container` scrollWidth − clientWidth = 0).

## Root causes (two real ones)

1. **`table-fixed` sizes columns from the header cells**, but the column widths
   were set on `meta.cellClassName` (body `td`) only — so Filing/Client/State/
   Assignee/Internal/Status all fell back to an equal ~142px share. Fix: set the
   width on `meta.headerClassName` too (and added `table-fixed w-full` to the
   table so columns hard-respect their widths).
2. **Cell padding was `px-5` (40px/cell × 9 ≈ 360px)** plus oversized columns
   (Filing 180, Official 210, State 160, Assignee 90 for a 26px avatar). Trimmed
   to a realistic budget and dropped cell padding to `px-3` for this table.

## Changes (apps/app/src/routes/obligations.tsx)

- `<Table className>`: add `table-fixed` + `[&_th]:px-3 [&_td]:px-3`.
- Column widths (header + cell): Filing 104 · Client 168 · State 64 · Assignee
  56 · Internal 110 · Official 110 · Exposure 88 · Status fills the rest (~351).
- Dropped the `min-w-[…]` floors on the date/exposure columns that were
  blocking `table-fixed` from shrinking them.
- Status cell content wraps (`flex-wrap`) so multiple signal badges stack to a
  second line instead of widening the row.
- Shortened the date headers "Internal due date"/"Official due date" →
  "Internal due"/"Official due" — narrower _and_ matches the production design.

## Verification

- `pnpm check` — 0 errors, 47 (pre-existing) warnings.
- Live preview: `table-container` overflow = 0px, `document` no horizontal
  scroll; all status badges (Payment-late / Awaiting-signature / Accepted /
  Rejected) visible, client names fuller.

## Follow-up — panel-open regression

The first pass broke the **panel-open** layout (the list shrinks to ~2/5 width
when the detail drawer is open): the fixed `table-fixed` widths overflowed the
narrow column (left columns clipped) and the conditional `flex-wrap` stacked the
compact status icons vertically. Fixes:

- `flex-wrap` on the Status cell is now gated on `!panelOpenIntent` — the
  compact panel-open icons stay on one row.
- Added `filingDueDate` + `estimatedExposureCents` to
  `PANEL_OPEN_AUTO_HIDDEN_COLUMN_IDS`, so the panel-open list collapses to the
  row anchor (Filing · Client · Internal due · Status) and fits the narrow
  column. Both columns return when the panel closes.

Verified live: panel-open list shows Filing/Client/Internal due/Status with
compact icons on one row, full client names, no clipping; no document scroll.
