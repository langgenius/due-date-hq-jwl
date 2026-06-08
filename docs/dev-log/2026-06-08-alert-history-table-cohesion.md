# /alerts/history — table cohesion + smaller checkboxes

Date: 2026-06-08

Feedback: _"the checkbox can be slightly smaller, and the table's every
element should be cohesive with other places' table."_

The history table is a hand-rolled flex grid (kept that way to avoid
horizontal scroll), so it's aligned to the canonical `<Table>` primitive's
visual tokens rather than rebuilt:

- **Checkboxes**: `size-[18px]` → `size-4` (16px) across the header, bulk
  bar, and per-row.
- **Header row**: now `bg-background-section` with the canonical
  `<TableHead>` treatment — `px-5 py-3`, `text-[11px]` / `font-semibold` /
  `tracking-[0.5px]` / `text-text-tertiary` (was `px-4 py-2.5` / `font-bold`
  / `tracking-[0.6px]` / `text-text-muted`). Added `rounded-t-xl` so the
  fill respects the table's rounded top corners.
- **Month-group bands**: the same gray-200 (`#e9ebf0`) group-header band the
  /today Actions table uses, `px-5`, `font-semibold tracking-[0.5px]` (was
  `bg-background-subtle` / `px-4` / `font-bold tracking-[0.6px]`).
- **Row + empty/loading cells**: horizontal padding `px-4` → `px-5` so cells
  align under the header columns.
- Status pills already used the shared `<Badge>` primitive — unchanged.

Verified live on :5177. Typecheck clean.
