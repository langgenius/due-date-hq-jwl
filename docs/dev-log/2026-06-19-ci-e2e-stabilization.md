# CI + E2E stabilization

**Date:** 2026-06-19
**Surface:** `pnpm check`, `e2e/pages/audit-page.ts`, `e2e/pages/obligations-page.ts`

The local CI failure was formatter drift, mostly in the marketing docs and
static design artifacts. `pnpm check:fix` normalized those files and the app
catalog extraction left the nav catalog call in its canonical shape.

The E2E failures were stale page-object selectors, not missing seed data:

- Audit filters now expose the specific action selector inside the "More
  filters" popover. `AuditPage.selectAction()` opens that popover before
  selecting the `data-audit-filter-value`.
- Deadline rows now expose the row affordance as `role="button"` with
  `aria-label="Open deadline for …"`. `ObligationQueuePage.rowFor()` matches
  that current accessible row control before falling back to older row labels.

## Verification

- `pnpm check` — pass, with the existing warning set only.
- `pnpm test` — pass across workspaces. The sandboxed local run still prints a
  background `localhost:3000` EPERM, but the command exits 0 with all tests
  green.
- `pnpm build` — pass. Wrangler still reports the local log-file EPERM while
  writing under `~/Library/Preferences/.wrangler/logs`, but the dry-run build
  exits 0.
- Targeted Playwright run — 15 passed:
  `E2E_WORKER_PORT=8788 E2E_MARKETING_BASE_URL=http://127.0.0.1:4322 pnpm exec playwright test e2e/tests/audit-log.spec.ts e2e/tests/obligations.spec.ts e2e/tests/pulse.spec.ts e2e/tests/workload.spec.ts --workers=1 --reporter=list`
- Full Playwright run — 68 passed:
  `E2E_WORKER_PORT=8788 E2E_MARKETING_BASE_URL=http://127.0.0.1:4322 pnpm exec playwright test --workers=1 --reporter=list`
- Gitleaks CI-surface scan — pass when run from a temp copy containing only git
  tracked files plus this dev-log. The raw local `pnpm secrets:scan` still sees
  ignored machine-local `.dev.vars`, `.env.local`, and `.claude/worktrees/*`
  files, which are not present in a GitHub checkout.
