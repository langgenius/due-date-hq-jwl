# Deadlines table header casing

**Date:** 2026-06-06
**Surface:** `/deadlines`

## Change

Unified the `/deadlines` table column headers to sentence case.

- Added a route-level `normal-case` override to the table header cells in
  `apps/app/src/routes/obligations.tsx`.
- Kept the existing header labels and column behavior unchanged.

## Docs Alignment

No `DESIGN.md` update is needed. This is a copy/casing correction inside the
existing deadlines table header treatment.

## Validation

- `pnpm exec vp check apps/app/src/routes/obligations.tsx docs/dev-log/2026-06-06-deadlines-header-case.md`
  - Passed with 0 errors; existing `no-unsafe-type-assertion` warnings remain
    in `apps/app/src/routes/obligations.tsx`.
- `git diff --check -- apps/app/src/routes/obligations.tsx docs/dev-log/2026-06-06-deadlines-header-case.md`
- Browser: `http://localhost:5173/deadlines?group=urgency`
  - Verified rendered table headers are `Filing`, `Client`, `State`,
    `Assignee`, `Internal due date`, `Official due date`, and `Status`.
  - Verified header cells compute `text-transform: none`.
