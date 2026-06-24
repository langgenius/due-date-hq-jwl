# CI / E2E / Lingui stabilization

**Date:** 2026-06-24 · **Surface:** CI checks, app E2E harness, Lingui catalogs

## Findings

- Lingui extraction and strict compile are clean: `@duedatehq/app` reports 3,937
  messages and `zh-CN` has 0 missing translations.
- `pnpm check` failed on Markdown formatting drift in several 2026-06-24 dev-log
  notes. `pnpm check:fix` normalized those files.
- Playwright failed six Deadlines-dependent specs because the shared
  `ObligationQueuePage.goto()` helper waited for the removed `Table view` toggle.
  `/deadlines` is now table-only, so the helper should treat the sortable table
  header as the stable ready signal.
- The first targeted rerun then exposed two stale assertions: the deadline detail
  section nav now labels the audit trail as `Activity`, and applied Pulse alerts
  move out of the Review/Active queues into `/alerts/history`.
- The history view renders alert detail as a sheet dialog, while the active
  `/alerts` workspace renders the same detail as an inline complementary panel.

## Changes

- Updated `e2e/pages/obligations-page.ts` to stop looking for the removed
  Table/Card segmented control and wait for `Sort Internal due` instead.
- Kept the column visibility `View options` helper unchanged; that control still
  exists and is unrelated to the removed view-mode toggle.
- Updated the Deadlines detail test to assert the current `Activity` section.
- Updated the Pulse apply/undo test to reopen the applied alert from Alert
  history before undoing it.
- Scoped the Pulse history assertion to the dialog surface instead of the active
  workspace's inline detail panel helper.

## Validation

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check:fix`
- `pnpm check`
- `pnpm test`
- `pnpm build`
- `E2E_WORKER_PORT=8788 E2E_MARKETING_BASE_URL=http://127.0.0.1:4322 pnpm exec playwright test e2e/tests/audit-log.spec.ts e2e/tests/obligations.spec.ts e2e/tests/pulse.spec.ts --workers=1 --reporter=list`
  passed with 12 specs.
- `E2E_WORKER_PORT=8788 E2E_MARKETING_BASE_URL=http://127.0.0.1:4322 pnpm exec playwright test --workers=1 --reporter=list`
  passed with 68 specs.
