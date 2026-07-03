# CI/E2E format stabilization

**Date:** 2026-07-03

## Problem

CI was blocked before tests/build by `vp check` formatting failures in launch
and outreach collateral. The same checkout's functional Playwright suite was
not locally red once the app and Worker started cleanly.

## Fix

Ran the repository formatter through `pnpm check:fix`, which normalized the
affected Design, dev-log, and outreach-kit files without changing product
behavior.

## Verification

- `pnpm test:e2e` - 66 passed, 2 skipped
- `pnpm ready` - check, unit tests, app/server/marketing builds passed
- `pnpm secrets:scan` still reports local-only ignored files
  (`.claude/worktrees/*`, `apps/app/.env.local`, `apps/server/.dev.vars`);
  those paths are not tracked and are excluded from the CI checkout.
