# Deadlines group-by options

**Date:** 2026-06-06
**Surface:** `/deadlines`

## Change

Removed `Urgency` from the `/deadlines` Group by menu and added `Filing`.

- Limited Group by to `Due date`, `Client`, and `Filing` in
  `apps/app/src/routes/obligations.tsx`.
- Changed the default grouping from urgency-band sections back to the flat due-date
  view.
- Added `Filing` grouping by `taxType`, with filing-type section headers that show
  deadline count, next due date, and late count.
- Kept legacy `?group=urgency` URLs safe by relying on the existing literal parser
  rejection path, which falls back to `Due date`.
- Updated the queue URL helper test seed to match the new default group.

## Docs Alignment

No `DESIGN.md` update is needed. This is a control-option cleanup inside the
existing deadlines queue toolbar.

## Validation

- `pnpm exec vp check apps/app/src/routes/obligations.tsx apps/app/src/routes/obligations.test.ts docs/dev-log/2026-06-06-deadlines-group-by-options.md`
  - Passed with 0 errors; existing `no-unsafe-type-assertion` warnings remain
    in `apps/app/src/routes/obligations.tsx`.
- `pnpm --filter @duedatehq/app test -- src/routes/obligations.test.ts`
  - Passed: 54 tests.
- `git diff --check -- apps/app/src/routes/obligations.tsx apps/app/src/routes/obligations.test.ts docs/dev-log/2026-06-06-deadlines-group-by-options.md`
- Browser: `http://localhost:5173/deadlines`
  - Verified the default trigger renders `Group by Due date`.
  - Verified `?group=client` renders `Group by Client`.
  - Verified `?group=filing` renders `Group by Filing`.
  - Verified Filing grouping renders filing-type headers, e.g. `Form 1040`
    as one section with 3 deadlines and `Form 1065` as one section with 3
    deadlines in the current demo data.
  - Verified legacy `?group=urgency` falls back to `Group by Due date`.
  - Verified the rendered page text no longer includes `Urgency`.
