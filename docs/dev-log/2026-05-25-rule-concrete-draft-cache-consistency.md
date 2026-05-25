---
title: 'Rule concrete draft cache consistency'
date: 2026-05-25
author: 'Codex'
area: rules
---

# Rule concrete draft cache consistency

## Context

Local D1 had complete successful `ai_output(kind='rule_concrete_draft')` rows
for the current source-defined rule catalog, but the `rule_concrete_draft`
mirror table was not represented in repo schema or migrations and was missing
cache rows for some current contexts. Older `rule_template` rows also remained
available after they dropped out of the current core catalog, which made
coverage checks disagree depending on whether they counted current rules or
historical DB templates.

## Change

- Added the `rule_concrete_draft` Drizzle schema, repo port, DB repo, and an
  idempotent `0054_rule_concrete_draft_cache.sql` migration.
- Mirrored successful real v2 concrete draft generations from `ai_output` into
  `rule_concrete_draft`; schema failures, guard rejections, source-text
  failures, and retired deterministic drafts are excluded from the mirror.
- Added an idempotent local backfill script to create missing mirror rows from
  successful real `ai_output` rows.
- Added a concrete draft health check script that verifies current
  source-defined rule coverage, mirror coverage, retired deterministic drafts,
  and stale available `rule_template` rows.
- Updated catalog sync to mark global templates that are no longer present in
  `listObligationRules({ includeCandidates: true })` as `deprecated` instead of
  deleting historical practice/audit data.

`rules.listConcreteDrafts` continues to read from `ai_output` as the user-facing
authority path. The mirror table is treated as an audit and consistency cache.
DESIGN.md was not changed because this was a backend/data consistency repair
with no visible product or design-system surface change.

## Local Repair

Applied the idempotent migration and ran the backfill against local D1:

- inspected current source-defined targets: 439
- missing mirror rows before backfill: 51
- mirror rows inserted or updated: 51
- stale available templates deprecated: 18

Final health check:

- source-defined rules: 439
- ready AI drafts: 439
- missing AI drafts: 0
- ready mirror drafts: 439
- missing mirror drafts: 0
- retired deterministic drafts: 0
- available stale templates: 0

## Verification

- `pnpm db:migrate:local`
- `pnpm exec tsx scripts/backfill-rule-concrete-draft-cache.ts --deprecate-stale-templates`
- `pnpm exec tsx scripts/check-rule-concrete-drafts.ts`
- `CI=true pnpm --filter @duedatehq/db test -- src/repo/rule-concrete-drafts.test.ts src/repo/rules.test.ts src/db.test.ts`
- `pnpm --filter @duedatehq/server test -- src/jobs/rules/concrete-draft.test.ts src/jobs/rules/reconcile.test.ts src/procedures/rules/concrete-draft.test.ts`
- `pnpm check`
