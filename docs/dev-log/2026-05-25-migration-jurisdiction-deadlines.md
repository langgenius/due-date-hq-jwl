# 2026-05-25 · Migration jurisdiction-aware state deadlines

## Context

Drake-style exports can include a filing state while the tax type column only names a federal return
type, such as `Form 1120`. Migration previously treated the presence of any tax type column as a
reason to skip the default matrix, so the import generated Federal obligations but silently missed
state suggestions.

## Changes

- Added a shared default-matrix mode that distinguishes missing tax types from federal-return-plus-
  state rows.
- Updated Step 3 preview and server dry-run logic so federal-only return types keep their explicit
  Federal tax type and add state tax type suggestions from the filing jurisdiction.
- Preserved explicit user data priority: rows that already contain a state tax type for that
  jurisdiction do not get duplicate matrix suggestions, and disabled matrix cells still suppress
  generation.
- Added dry-run rule-review warnings for state suggestions that cannot produce a deadline from the
  firm's active practice rules.
- Added a Step 4 warning panel with affected states/entities and a Rule Library link, using `jur`
  only when a single jurisdiction is affected.
- Reused the exact commit-plan path for dry-run obligation counts after mapping normalization, so
  preview and apply use the same tax type merge behavior.
- Simplified the Step 4 warning panel after browser review: removed the inline Rule Library button
  and replaced raw tax type identifiers with a compact per-state summary of affected clients,
  entity labels, and state rule type counts.
- Simplified Step 3 normalization rows after browser review: removed free-text editing of internal
  normalized values, replaced `Needs review` badges with read-only fallback outcomes, and allowed
  imports to continue when an optional state value is not recognized.

## Validation

- Passed: `pnpm --filter @duedatehq/server test -- src/procedures/migration/_service.test.ts`
- Passed: `pnpm --filter @duedatehq/app test -- src/features/migration/Step3Normalize.test.tsx src/features/migration/Step4Preview.test.tsx`
- Passed: `pnpm exec vp check apps/app/src/features/migration apps/server/src/procedures/migration packages/contracts/src/migration.ts packages/core/src/default-matrix/index.ts`
- Passed: `pnpm --filter @duedatehq/app i18n:extract`
- Passed: `pnpm --filter @duedatehq/app exec lingui compile`
- Still blocked: `pnpm --filter @duedatehq/app i18n:compile` fails because `zh-CN` has 179
  missing translations after extraction. The new migration strings are translated; the compile
  failure is broader catalog debt, not a runtime issue in this migration path.
