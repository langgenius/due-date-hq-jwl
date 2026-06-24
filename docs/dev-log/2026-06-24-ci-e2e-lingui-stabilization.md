# 2026-06-24 CI, E2E, and Lingui stabilization

- Replayed the failing GitHub runs on `main`: CI failed in `vp check` because
  nine files needed formatting, Lingui failed on catalog drift from the
  rule-detail required/recommended label update, and E2E failed because the
  `/deadlines` page now defaults to card view while the affected tests exercise
  table workflows.
- Ran the app Lingui extract/compile flow and kept the generated English and
  Simplified Chinese catalog output with the rule-detail label change.
- Updated the obligations E2E page object to explicitly select table view before
  table-oriented interactions, while still recognizing the card-view deadline
  buttons for deep-link assertions.
- Updated the clients filtered-empty assertion to the current `Clear filters`
  action instead of the removed helper copy.
- Moved public marketing lead persistence behind the `@duedatehq/db` repo
  boundary so `apps/server/src/routes/leads.ts` no longer imports schema
  directly, and tightened the honeypot body check to avoid unsafe assertions.

Validation:

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm format`
- `pnpm check`
- `pnpm --filter @duedatehq/server test -- src/routes/leads.test.ts`
- `pnpm test`
- `pnpm build`
- `CI=true E2E_WORKER_PORT=8788 E2E_MARKETING_BASE_URL=http://127.0.0.1:4322 ./node_modules/.bin/playwright test e2e/tests/audit-log.spec.ts e2e/tests/clients.spec.ts e2e/tests/obligations.spec.ts e2e/tests/pulse.spec.ts e2e/tests/workload.spec.ts --workers=1 --retries=0 --reporter=list`
