# Client Delete Copy + Deadline Filter State

## Scope

- Browser comments on `/clients/[id]` and `/deadlines`.
- Kept changes inside the existing client-detail overflow menu, delete confirmation, and
  deadline queue route-link state.

## Changes

- Replaced the client-detail overflow action from `Archive client` to destructive
  `Delete client`, using the trash icon and red dropdown/dialog/action styling.
- Kept the existing `clients.delete` mutation, which removes the client and its deadlines
  from active client, deadline, and dashboard surfaces while retaining audit/compliance
  history server-side.
- Added `deadlineDetailSearchFromQueueState()` so opening a deadline detail builds the
  detail URL from parsed queue filter state instead of a stale React Router search string.
  This preserves quick filters such as `?evidence=needs` when the detail route opens.
- Added focused route tests for stale-search detail links and explicit show-all column state.
- Refreshed Lingui catalogs and filled the new zh-CN delete-client strings.

## Validation

- `pnpm --filter @duedatehq/app test -- src/routes/obligations.test.ts` — passed
  (48 tests).
- `pnpm --filter @duedatehq/app i18n:extract` — passed.
- `pnpm --filter @duedatehq/app i18n:compile` — passed after adding zh-CN strings.
- `pnpm --filter @duedatehq/app test` — passed (66 files, 447 tests).
- `pnpm --filter @duedatehq/app build` — passed.
- `pnpm check` — formatting passed, then Vite+ printed existing lint warnings and panicked
  while writing the large output stream. The warnings were unrelated to this change.
- Browser QA on `localhost:5173`:
  - `/deadlines` → `Needs evidence` → first row open kept
    `/deadlines/<ref>?evidence=needs`, the chip stayed pressed, and console logs were clean.
  - `/clients/lakeview-medical-partners-10000000-0000-4000-8000-000000000007`
    showed a red `Delete client` menu item with trash icon; the confirmation dialog showed
    red delete title/description/action copy, including active deadline/dashboard removal
    and retained audit history, with no Archive copy.

## Docs Alignment

- The migration-copilot product design already documents the single-client destructive CTA
  as `Delete client`; older Archive mentions remain in dated critique/dev-log artifacts.
