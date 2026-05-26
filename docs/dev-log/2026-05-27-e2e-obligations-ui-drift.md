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

## Validation

- `pnpm exec playwright test e2e/tests/obligations.spec.ts --project=chromium --workers=1 --retries=0`
  - 6 passed.
- `pnpm exec playwright test e2e/tests/authenticated-shell.spec.ts e2e/tests/obligations.spec.ts --project=chromium --workers=1 --retries=0`
  - 10 passed.
