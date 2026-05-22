# 2026-05-22 Weekly Rule Registry Reconcile

## Summary

Implemented the product-owned weekly source/rule reconcile flow. Worker scheduled runs now gate a
weekly Monday `09:00 UTC` reconcile pass, queue one source check per registered rule source, record
freshness/snapshots/proposals in ops tables, and keep all rule-pack edits behind product developer
review.

## Implementation

- Added `rule_registry_reconcile_run` and `rule_registry_change_proposal` tables plus ops repo
  helpers for run idempotency, proposal recording, open proposal listing, and catalog fan-out.
- Added `rule.registry.source.reconcile` and `rule.registry.catalog.sync` queue messages.
- Added schema-validated `rule-registry-reconcile@v1` analyzer prompt. Analyzer failures are
  recorded as operational proposals and do not fail the batch.
- Catalog sync now compares deployed core rules to stored `rule_template` rows, creates
  `new_template` / `source_changed` review tasks, supersedes older open tasks, and leaves active
  practice rules unchanged.
- Source-defined concrete draft cache keys now include `rule.version`, so stale drafts are hidden
  from `rules.listConcreteDrafts` and rejected by bulk verification.
- Removed the scheduled always-missing concrete-draft sweep from Pulse cron. Catalog sync enqueues
  current-version draft generation for new/changed source-defined rules and backfills current-version
  source-defined rules that still lack a successful global draft.
- Added `pnpm rules:reconcile:report` for local/remote proposal review.

## Product Notes

- Freshness-only source checks do not invalidate or regenerate concrete drafts.
- `manual_review`, `email_subscription`, and `api_watch` sources create `manual_check_due`
  proposals instead of pretending machine verification happened.
- Product developers must manually update `packages/core/src/rules/index.ts`; evidence timestamp
  edits do not bump `rule.version`, but semantic changes must bump/add a rule version.

## Validation

- `pnpm --filter @duedatehq/server test -- src/jobs/rules/reconcile.test.ts src/jobs/queue.test.ts src/jobs/rules/concrete-draft.test.ts src/procedures/rules/concrete-draft.test.ts`
- `pnpm --filter @duedatehq/db test -- src/repo/rules.test.ts src/repo/ai.test.ts`
