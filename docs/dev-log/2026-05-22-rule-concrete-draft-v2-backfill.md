---
title: 'Rule concrete draft v2 backfill'
date: 2026-05-22
author: 'Codex'
area: rules
---

# Rule concrete draft v2 backfill

## Context

Initial global prewarm moved AI concrete draft generation out of the customer
open-rule path, but the local backfill still exposed many failed targets:
source text unavailable, schema-invalid AI shapes, guard rejections, and slow
AI gateway calls.

## Change

- Bumped the concrete draft prompt target to `rule-concrete-draft@v2`.
- Added JSON source extraction, browser-like source fetch headers, source fetch
  timeout, and focused source-text selection before sending to AI.
- Expanded normalization for common model aliases such as installment schedules,
  fixed-date aliases, `dueDates`, `due_date`, and tax-year-relative prose.
- Added source excerpt fallback for relative due-date and operational source
  lines while keeping final contract validation and guard checks.
- Added AI gateway timeout for concrete drafts and a fast-json fallback when the
  primary quality-json request fails at the gateway layer.
- Added internal ops commands:
  - `pnpm rules:concrete-drafts:report -- --failures`
  - `pnpm rules:concrete-drafts:backfill -- --retry-failed`
  - `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=4`

## Backfill Result

Local initial v2 backfill inspected 431 source-defined targets and recorded at
least one v2 attempt for every target. Final local report:

- successful global cached drafts: 131
- missing successful drafts: 300
- `SOURCE_TEXT_UNAVAILABLE`: 173
- `AI_GATEWAY_ERROR`: 89
- `SCHEMA_INVALID`: 24
- `GUARD_REJECTED`: 14

The remaining failures are now operational data for source/schema cleanup rather
than customer-facing render latency.

## Verification

- `pnpm --filter @duedatehq/ai test -- src/ai.test.ts`
- `pnpm --filter @duedatehq/server test -- src/procedures/rules/concrete-draft.test.ts src/jobs/rules/concrete-draft.test.ts`
- `pnpm rules:concrete-drafts:report -- --failures --limit=60`
