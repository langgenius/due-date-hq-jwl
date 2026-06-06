# Deadlines official due width

**Date:** 2026-06-06
**Surface:** `/deadlines`

## Change

Widened the Official due date column so the header label can render on one line.

- Added a `210px` header/body width to the `filingDueDate` column.
- Kept the nowrap override scoped to that header only.

## Docs Alignment

No `DESIGN.md` update is needed. This is a column-width adjustment inside the
existing deadlines table.

## Validation

- `pnpm exec vp check apps/app/src/routes/obligations.tsx docs/dev-log/2026-06-06-deadlines-official-due-width.md`
  passed with 0 errors. One existing `columnOrder` unsafe assertion warning
  remains in `apps/app/src/routes/obligations.tsx`.
- `git diff --check -- apps/app/src/routes/obligations.tsx docs/dev-log/2026-06-06-deadlines-official-due-width.md`
  passed.
- Browser verified `http://localhost:5173/deadlines?group=urgency`: the Official
  due date column renders at 210px, the header label span computes
  `white-space: nowrap`, and the label stays on one line.
