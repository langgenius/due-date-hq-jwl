# 2026-05-25 — Deadlines header nested-button fix

## Context

The `/deadlines` table emitted React's invalid HTML warning:

`In HTML, <button> cannot be a descendant of <button>.`

The stack traced to the `Internal Due` column header. The sortable header
wrapped the range-filter dropdown trigger, and both rendered as buttons.

## Change

- Split `ObligationQueueSortableHeader` into sibling controls:
  - the column label + chevron remains the sort button
  - the range filter renders as a separate icon trigger
- Exported the shared `tableHeaderFilterIconTrigger` helper so range filters
  can use the same compact filter affordance as other sortable/filterable
  headers.

## Verification

- `pnpm --filter @duedatehq/app test -- obligations.test.ts` — 26 tests passed
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check`
- `pnpm --filter @duedatehq/app build`
- Playwright demo-login smoke on `http://localhost:5173/deadlines`:
  - `button button` count: 0
  - `button[aria-label="Sort Internal Due"]` count: 1
  - `button[aria-label="Filter by Internal Due"]` count: 1
  - nested-button console messages: 0
