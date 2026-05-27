# 2026-05-27 Clients State Filter And Sort

## Context

Browser feedback on `/clients` called out that the States filter dropdown showed
state abbreviations like `CA 3`, and that clicking the `Next due` and `Open`
table headers did not visibly sort the directory rows.

## Changes

- Kept state filter values as postal codes for URL/filter compatibility, but
  changed the visible dropdown labels to full jurisdiction names.
- Added accessor values for the computed `Next due` and `Open` columns so
  TanStack Table can include those columns in its sorted row model.
- Made `Next due` start with soonest-deadline sorting and keep clients with no
  upcoming deadline at the end.
- Renamed the ambiguous `Open` column to `Open deadlines` and added a header
  title describing the statuses counted by that number.

## Verification

- `pnpm check` (passes; existing 6 warnings unchanged)
- `pnpm --filter @duedatehq/app test -- src/features/clients/client-readiness.test.ts`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- Browser check on `http://localhost:5173/clients`: States menu shows `California 3`;
  `Next due` click orders dated rows by due date with no-deadline rows last; `Open`
  click orders clients with 2 open deadlines before 1 and 0.
