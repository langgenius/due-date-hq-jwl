# 2026-06-06 — Demo generator: restore Migration Copilot fixtures

## Context

The demo generator (`packages/db/seed/generate-demo.ts`) regenerates the
business + supporting-feature layer of `mock/demo.sql`, but it had no knowledge
of three tables the older hand-maintained seed carried, so every regeneration
silently dropped them:

- `migration_mapping` — AI column→field mapping with confidence
- `migration_normalization` — raw→normalized value mapping
- `migration_error` — skipped-row errors

Result: the Migration Copilot import-history detail (mapping confidence,
normalization, errors) rendered empty in the dev/demo workspace.

(The sibling Pulse-monitoring tables — `pulse_source_state` /
`pulse_source_snapshot` — were already added to the generator separately, so
only the migration trace remained missing.)

## Fix

Taught the generator to emit the three tables, tied to each firm's already-
generated `migration_batch` (`uuid('30', i*100+1)`):

- Added per-firm `add('migration_mapping' | 'migration_normalization' |
'migration_error', …)` calls in the supporting-layer loop (4 mappings + 3
  normalizations + 1 error per firm).
- Registered all three in `SUPPORT_ORDER` (flushed after `migration_batch`, so
  FK-safe) and `SUPPORT_COLS`.

Column lists verified against the current schema (`packages/db/src/schema/migration.ts`).

## Verification

- Regenerated `mock/demo.sql`. Counts: `migration_mapping` 20 (4×5 firms),
  `migration_normalization` 15, `migration_error` 5.
- Applied all D1 migrations to a throwaway SQLite, then loaded the regenerated
  seed: loads clean, `PRAGMA foreign_key_check` → no violations.
- `vp check`: 0 errors. `apps/server` `src/app.test.ts` (demo-seed alignment):
  14/14 pass.
