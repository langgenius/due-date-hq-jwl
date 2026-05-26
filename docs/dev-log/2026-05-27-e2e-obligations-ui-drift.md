# 2026-05-27 E2E obligations UI drift

## Context

GitHub Actions E2E run `26458909826` failed in the authenticated shell and obligations specs. Local
reproduction showed the command palette path passing, while the obligations failures came from UI
locator and copy drift in the seeded deadline flows.

## Changes

- Updated the obligations page object for the collapsed `Filter clients` search affordance and
  expanded `Filter deadlines` input.
- Re-aligned dashboard action-row, deadline drawer, status badge, and column-visibility assertions
  with the current accessible roles and copy.
- Followed up on the same `main` push after CI surfaced catalog drift: formatted the client-detail
  panel dev-log note, refreshed Lingui catalogs, and filled the 40 missing `zh-CN` messages from
  the latest client/rules/deadlines UI.

## Validation

- `pnpm exec playwright test e2e/tests/obligations.spec.ts --project=chromium --workers=1 --retries=0`
  - 6 passed.
- `pnpm exec playwright test e2e/tests/authenticated-shell.spec.ts e2e/tests/obligations.spec.ts --project=chromium --workers=1 --retries=0`
  - 10 passed.
- `pnpm --filter @duedatehq/app i18n:extract`
  - Passed with 0 missing `zh-CN` translations.
- `pnpm --filter @duedatehq/app i18n:compile`
  - Passed.
- `pnpm check`
  - Passed with existing lint/type warnings only.
- `pnpm --filter @duedatehq/app test src/routes/rules.library.test.tsx`
  - 13 passed.
- `pnpm test`
  - 60 files passed, 386 tests passed.
- `pnpm build`
  - Passed.
