# Migration State-First Deadline Generation

## What changed

- Added a migration-only state-first preview selector in the server commit plan.
- When an imported filing profile has a state tax type for the same return workflow, matching FED previews are filtered before obligations are written.
- If the state counterpart is present in the profile but no active state rule can generate a concrete preview, the matching FED fallback is also filtered; dry-run rule review warnings remain the guidance path.
- PTET, franchise/entity tax, sales/use, payroll, and information-return tax types are not treated as replacements for FED return workflows.

## Scope notes

- No public contract or database schema changes.
- Add deadline dialog matching remains separate from migration runtime matching.
- The selector keys are entity-aware for generic state business income tax mappings.

## Validation

- `pnpm --filter @duedatehq/server test --run src/procedures/migration/_service.test.ts`
- `pnpm check`
- `pnpm --filter @duedatehq/app build`
