# CI markdown format drift

**Date:** 2026-06-26.

GitHub Actions `CI` run `28207714805` failed in `vp run ci` because `vp check` found
markdown formatting drift in two brand dev-log notes:

- `docs/dev-log/_brand-mark-refresh-2026-06-26.md`
- `docs/dev-log/_brand-wordmark-component-2026-06-26.md`

Ran `pnpm check:fix` to apply the formatter's blank-line and emphasis normalization. No
product code changed.

## Verify

- `pnpm check`
- `git diff --check`
