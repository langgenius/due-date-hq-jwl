# /today — brief padding parity + shorter rows (Yuqi)

Date: 2026-06-08

Three page-feedback items.

- **#1 Daily Brief padding** (`daily-brief-card.tsx`): outer padding `px-[18px]
  py-4` (18/16) → `p-[18px]` (18 all sides) so it matches the alert cards below.
  Confirmed in preview: brief padding 18px == card padding 18px.
- **#2 Import "+" button**: already fully round — `rounded-full` is applied and the
  32×32 square clamps to a circle (computed radius confirms). No change needed.
- **#3 Row height** (`actions-list.tsx`): the Actions rows used the canonical
  TableCell `py-4` (16px). Added `[&_td]:py-2.5` (10px) on the `<Table>` so every
  cell is tighter — row height 68px → 59px.

## Verify

- tsgo 0; `vp check` 0 errors; dashboard tests 10/10; verified in preview @1512.
