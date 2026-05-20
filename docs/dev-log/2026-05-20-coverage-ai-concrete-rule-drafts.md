# Coverage AI concrete rule drafts

## Summary

Implemented the source-defined review path for rules:

- `rules.coverage` now returns `entityCoverage` computed from practice active rules, pending templates, and legacy source-defined active rows.
- Source-defined templates remain review candidates; `acceptTemplate` and bulk accept skip/reject them until an AI concrete draft is reviewed.
- Added `rules.draftConcreteRule`, `rule-concrete-draft@v1`, AI run persistence, deterministic due-date/source-excerpt guards, and `aiOutputId` provenance on accepted rule evidence.
- Rules UI now renders coverage cells from API data and shows an AI draft review panel in the rule detail before `Accept rule`.
- Business source-backed candidates are generated only from explicit business source seeds, with tax type aliases aligned to default matrix output.

## Validation

- `pnpm --filter @duedatehq/contracts test -- --run`
- `pnpm --filter @duedatehq/core test -- --run`
- `pnpm --filter @duedatehq/ai test -- --run`
- `pnpm --filter @duedatehq/app test -- --run src/features/rules/rules-console-model.test.ts src/features/rules/coverage-tab.test.tsx`
- `pnpm --filter @duedatehq/server test -- --run`
- `pnpm exec vp check --no-fmt`

`pnpm check` still stops at formatting because of the unrelated untracked
`docs/report/cpa_saas_competitor_client_export_research.md`; this task did not modify that file.
