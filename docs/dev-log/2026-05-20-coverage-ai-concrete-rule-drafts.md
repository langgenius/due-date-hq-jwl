# Coverage AI concrete rule drafts

## Summary

Implemented the source-defined review path for rules:

- `rules.coverage` now returns `entityCoverage` computed from practice active rules and pending templates; source-defined placeholders remain review state until CPA accepts a concrete draft.
- Source-defined templates remain review candidates; `acceptTemplate` and bulk accept skip/reject them until an AI concrete draft is reviewed.
- Added `rules.draftConcreteRule`, `rule-concrete-draft@v1`, AI run persistence, deterministic due-date/source-excerpt guards, and `aiOutputId` provenance on accepted rule evidence.
- Rules UI now renders coverage cells from API data and shows an AI draft review panel in the rule detail before `Accept rule`.
- Business source-backed candidates are generated only from explicit business source seeds, with tax type aliases aligned to default matrix output.

## 2026-05-21 Follow-up

- Replaced the visible "generating" copy in the rule detail AI concrete draft panel with the shared `Skeleton` primitive, matching the rest of the app's loading pattern.
- Kept `Accept rule` disabled while the AI draft is still pending, but removed the separate generating text prompt from the review panel and disabled-reason line.
- Reused successful `rule_concrete_draft` AI outputs from `ai_output` by `rule/source/sourceSignal + inputHash + promptVersion`, so reopening the same rule no longer calls the model again unless the source-backed input changes.
- No DESIGN.md change was needed; the panel now uses the existing app skeleton token and spacing pattern.

## Validation

- `pnpm --filter @duedatehq/contracts test -- --run`
- `pnpm --filter @duedatehq/core test -- --run`
- `pnpm --filter @duedatehq/ai test -- --run`
- `pnpm --filter @duedatehq/app test -- --run src/features/rules/rules-console-model.test.ts src/features/rules/coverage-tab.test.tsx`
- `pnpm --filter @duedatehq/server test -- --run`
- `pnpm exec vp check --no-fmt`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/db test -- --run src/repo/ai.test.ts src/db.test.ts`
- `pnpm --filter @duedatehq/server test -- --run src/procedures/rules/_obligation-generation.test.ts src/procedures/rules/onboarding-activation.test.ts`
- `pnpm exec vp check --fix apps/app/src/features/rules/rule-detail-drawer.tsx`
- `pnpm check` (passes with 6 existing warnings outside this change)
