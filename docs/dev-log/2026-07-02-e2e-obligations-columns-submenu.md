# E2E obligations columns submenu stabilization

## Context

GitHub Actions E2E run `28567697403` failed on commit `c98df77f` while CI and
Lingui were green. The failing job was the functional `e2e` job, not the
non-blocking visual job.

The failed spec was
`e2e/tests/obligations.spec.ts`:
`AC: E2E-OBLIGATIONS-COMPLETE hides columns and bulk updates rows`.
All retries timed out waiting for the `Assignee` `menuitemcheckbox` after opening
the Deadlines `View` menu.

## Root Cause

The failure screenshot showed the top-level `View` menu open, with the `Columns`
submenu closed. The page object treated a transiently visible submenu checkbox as
proof that `View -> Columns` was ready. On the Linux CI runner the submenu could
open briefly, close again, and leave `toggleColumn('Assignee')` waiting for an
option that was no longer mounted.

## Changes

- Kept the test on the real UI path: `View` menu, `Columns` submenu, column
  checkbox.
- Changed `ObligationQueuePage.openColumnsMenu()` to stop treating transient
  submenu visibility as a durable ready signal.
- Moved submenu reveal, checkbox state reads, and checkbox clicks into retryable
  page-object helpers, so the CI runner must keep the target option visible
  through the actual state change.
- Updated the obligations completion test to request explicit column states
  (`Assignee` hidden, then visible) instead of depending on two blind toggles.
- Updated the Pulse evidence assertion to use the same explicit column-state
  helper before looking for the Evidence button.

## Verification

- `E2E_WORKER_PORT=8788 E2E_MARKETING_BASE_URL=http://127.0.0.1:4322 pnpm exec playwright test --workers=1 --reporter=list`
  passed before the fix locally with 66 passed and 2 skipped, confirming the red
  was CI-only.
- `E2E_WORKER_PORT=8788 E2E_MARKETING_BASE_URL=http://127.0.0.1:4322 pnpm exec playwright test e2e/tests/obligations.spec.ts --grep E2E-OBLIGATIONS-COMPLETE --workers=1 --reporter=list --repeat-each=3 --retries=0`
  passed after the helper change with 3 passed.
- `pnpm check` passed after formatting, with the existing
  `calendar-page.tsx` array-index-key warning still present.
- `E2E_WORKER_PORT=8788 E2E_MARKETING_BASE_URL=http://127.0.0.1:4322 pnpm exec playwright test --workers=1 --reporter=list`
  passed after the fix with 66 passed and 2 skipped.
