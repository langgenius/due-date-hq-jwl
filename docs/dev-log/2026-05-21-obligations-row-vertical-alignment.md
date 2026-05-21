# 2026-05-21 · Obligations row vertical alignment

## Background

The obligations queue rows rendered the selection checkbox at the
table primitive's default middle alignment, but several dense data
columns overrode their cells to `align-top`. In rows with stacked due
date content, this made the checkbox appear vertically disconnected
from the rest of the row.

## What Changed

- `apps/app/src/routes/obligations.tsx`
  - Removed `align-top` from the Client, Owner, and Internal deadline
    column metadata.
  - Added a queue-table-level `td` `!align-middle` guard so row cells
    stay centered even when column metadata changes later.

## Verification

- `pnpm --filter @duedatehq/app test -- obligations.test.ts` -> 26
  passed.
- `pnpm check` -> 0 errors, 8 existing warnings.
- Manual Playwright check against
  `http://localhost:5173/obligations?row=20000000-0000-4000-8000-000000000009&tab=readiness`:
  the target row's first six cells, including the checkbox cell,
  computed `vertical-align: middle`; measured content-center offsets
  were approximately 0.0-0.3px.

## Docs Alignment

No stable architecture or DESIGN.md change needed. This was a local
queue-table presentation fix.
