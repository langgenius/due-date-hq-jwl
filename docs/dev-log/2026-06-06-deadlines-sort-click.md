# Deadlines internal due sort click

**Date:** 2026-06-06
**Surface:** `/deadlines`

## Change

Fixed the Internal due date column sort so the visible rows update immediately
when the CPA clicks the column header.

- Added a typed sort guard and URL-search sort reader so an explicit
  `sort=due_desc` in the address bar is treated as authoritative.
- Added optimistic sort state for header/dropdown interactions so the UI no
  longer shows the old `due_asc` state after writing `sort=due_desc` to the URL.
- Re-sorted the currently loaded buffer by the active sort before rendering.
  Client/Filing group modes keep their group key first, then sort rows inside
  each group by the active sort.
- Added focused unit coverage for loaded-buffer due date ascending/descending
  sort behavior.

## Docs Alignment

No `DESIGN.md` update is needed. This is a behavior fix for an existing table
sort affordance.

## Validation

- `pnpm exec vp check apps/app/src/routes/obligations.tsx apps/app/src/routes/obligations.test.ts`
  passed with 0 errors. One existing `columnOrder` unsafe assertion warning
  remains in `apps/app/src/routes/obligations.tsx`.
- `pnpm --filter @duedatehq/app test -- src/routes/obligations.test.ts` passed
  with 55 tests.
- `git diff --check -- apps/app/src/routes/obligations.tsx apps/app/src/routes/obligations.test.ts`
  passed.
- Browser verified `http://localhost:5173/deadlines?group=urgency`: clicking the
  Internal due date header changes the URL to `sort=due_desc`, updates the sort
  trigger to `Due date (latest)`, sets the header `aria-sort` to `descending`,
  and moves future deadlines such as `159 days` to the top.
