# 2026-05-22 E2E UI locator refresh

## Summary

- Refreshed Playwright expectations for the current Dashboard action list, obligation drawer tabs, migration dry-run preview, clients detail drawer, and Rule Library review flow.
- Kept the coverage focused on user-visible behavior: queue navigation, drawer opening, ready-to-import counts, fact readiness, and the URL-backed Rule Library review workspace.

## Validation

- Reproduced the GitHub Actions E2E failures from run `26236570442` locally before changing tests.
- `pnpm exec playwright test e2e/tests/rules-console.spec.ts --project chromium --workers=1 --retries=0`
- `pnpm exec playwright test e2e/tests/obligations.spec.ts e2e/tests/clients.spec.ts e2e/tests/migration-wizard.spec.ts e2e/tests/rules-console.spec.ts --project chromium --workers=1 --retries=0`
