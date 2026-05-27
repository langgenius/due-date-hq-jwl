# Rule Library Missing Empty State

**Date:** 2026-05-27
**Scope:** `/rules/library?scope=missing`

## Bug

The Missing scope reused the first-time empty catalog state when there were no
coverage gaps. That made `Missing 0` show "Import from sources" and "New rule"
CTAs, even though the Missing workflow should be driven by the prefilled row-level
`Add rule` action when a jurisdiction/entity gap exists.

## Fix

- Added a scope-specific empty state for Missing with "No missing rules" copy.
- Added a "View all rules" reset action instead of import/new-rule CTAs.
- Hid the unseeded header `New rule` action while the Missing scope is active.
- Left row-level `Add rule` unchanged for real missing-rule gaps.

## Validation

- `pnpm --filter @duedatehq/app test -- rules.library.test.tsx`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- Playwright smoke check via `/api/e2e/demo-login?role=manager`, confirming
  `/rules/library?scope=missing` shows "No missing rules" and no
  "Import from sources" or "New rule" text.
