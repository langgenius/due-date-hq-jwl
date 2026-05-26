# 2026-05-26 · Manual Deadline Initial Status

## What Changed

- Fixed the Add deadline/manual rule-backed creation path so a newly created
  deadline starts as `pending` / `not_started`.
- Kept rule/applicability review metadata from the preview from promoting a
  manually created deadline into the workflow `In review` status.
- Left accepted-rule auto-generation behavior unchanged for existing
  review-only/missing-fact generation coverage.

## Validation

- `pnpm --filter @duedatehq/server test -- --run src/procedures/obligations/index.test.ts`
- `pnpm --filter @duedatehq/server test -- --run src/procedures/rules/_obligation-generation.test.ts`
- `pnpm --filter @duedatehq/server exec tsc --noEmit`
- `git diff --check`
