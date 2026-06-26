# CI/E2E login stabilization

## Context

GitHub `main` at `e85acc7` had two unrelated red paths:

- E2E smoke login tests still expected the older product-scoped login heading
  (`Sign in to DueDateHQ` / `登录 DueDateHQ`).
- CI `vp check` failed on markdown formatting drift in two marketing readability dev logs.

The app's login route now renders a compact lockup: the brand is separate from the short
heading (`Sign in` / `登录`), and the zh-CN reassurance copy is
`每个申报截止日期的唯一事实来源。`.

## Changes

- Updated the shared login page object to match the compact heading while keeping the locator
  role-based and locale-aware.
- Updated the persisted-locale E2E assertions to the current zh-CN login copy.
- Ran `pnpm check:fix` and normalized the affected marketing dev-log prose so inline plus
  wording does not format as a markdown list item.

## Verification

- `pnpm check`
- `E2E_WORKER_PORT=8788 E2E_MARKETING_BASE_URL=http://127.0.0.1:4322 pnpm exec playwright test e2e/tests/auth-gate.spec.ts e2e/tests/entry-locale.spec.ts --workers=1 --reporter=list`
  (9 passed)
- `E2E_WORKER_PORT=8788 E2E_MARKETING_BASE_URL=http://127.0.0.1:4322 pnpm exec playwright test --workers=1 --reporter=list`
  (66 passed, 2 skipped)
- `pnpm ready` (passed; `vp check` still reports the existing 3 warnings)
- `gitleaks detect --source . --no-git --redact --verbose` from a CI-shaped temp checkout
  excluding local-only env/worktree files (no leaks found)

Raw local `pnpm secrets:scan` still reports local-only findings in `.claude/worktrees/*`,
`apps/app/.env.local`, and `apps/server/.dev.vars`; those files are not part of the CI checkout.
