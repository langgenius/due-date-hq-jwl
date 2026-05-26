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
- Stabilized the command-palette E2E helper after CI still missed `Control+K` on Chromium, and
  aligned the clients spec with the current full filing-state display (`California`).
- Matched the Rule Library pending-filter review CTA wait to the route's initial 20s wait after
  CI showed the second render path could exceed Playwright's default 5s timeout.

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
- `pnpm exec playwright test e2e/tests/authenticated-shell.spec.ts e2e/tests/clients.spec.ts e2e/tests/obligations.spec.ts --project=chromium --workers=1 --retries=0`
  - 16 passed.
- `pnpm exec playwright test e2e/tests/rules-console.spec.ts --project=chromium --workers=1 --retries=0`
  - 3 passed.
