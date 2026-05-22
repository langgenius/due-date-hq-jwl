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
  - `pnpm rules:concrete-drafts:report -- --group-by=refusal,acquisition`
  - `pnpm rules:concrete-drafts:inspect -- --category=SCHEMA_INVALID --limit=10`
  - `pnpm rules:concrete-drafts:backfill -- --retry-failed`
  - `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=4`
- Added Browserless fallback support to concrete draft live source fetches when
  `PULSE_BROWSERLESS_URL` is configured, with `PULSE_BROWSERLESS_SOURCE_IDS`
  still available to prefer Browserless for known difficult sources.
- Added a second normalization pass for common wrapped AI payloads, missing
  due-date kind aliases, fixed-date outputs with date-only evidence in the
  source excerpt, and worded tax-year-relative due dates.

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

Follow-up diagnostics showed the remaining local failures are dominated by
manual-review sources without source-backed due-date text:

- `SOURCE_TEXT_UNAVAILABLE | manual_review`: 146
- `SOURCE_TEXT_UNAVAILABLE | pdf_watch`: 17
- `SOURCE_TEXT_UNAVAILABLE | html_watch`: 10
- `AI_GATEWAY_ERROR | manual_review`: 54
- `AI_GATEWAY_ERROR | html_watch`: 35

The report command now supports grouping by refusal, source, source type,
acquisition method, domain, jurisdiction, and error message. The inspect command
prints bounded per-rule/source diagnostics, including latest attempt metadata,
latest source snapshot key, source-text availability, and error messages.

## Follow-up Backfill Pass

A later local backfill pass added operational source snapshot support for
curl-fetched HTML/PDF source text, including local PDF text extraction through
the Codex runtime `pypdf` dependency. Source snapshot text shorter than the
minimum usable threshold, access-denied pages, and official 404/error pages are
ignored on read so a bad snapshot cannot poison concrete draft generation.

Concrete draft generation now also falls back to deterministic source-text
extraction when the AI output is missing, schema-invalid, or guard-rejected.
The deterministic parser covers month/day installment schedules and relative
installment prose such as the 15th day of the fourth, sixth, ninth, and twelfth
months.

This pass raised the local successful global cache count from 131 to 294 of 431
source-defined targets. The remaining 137 missing targets are dominated by
source acquisition gaps:

- `SOURCE_TEXT_UNAVAILABLE`: 103
- `GUARD_REJECTED`: 14
- `SCHEMA_INVALID`: 10
- `AI_GATEWAY_ERROR`: 10

Known source cleanup found and fixed current URLs for Louisiana individual
income tax and the Louisiana 2026 filing calendar; the individual income source
then backfilled both Louisiana individual drafts. The Louisiana calendar index
still lacks concrete day-level dates and needs deeper event-page extraction or
more specific rule-source mappings.

## Verification

- `pnpm --filter @duedatehq/ai test -- src/ai.test.ts`
- `pnpm --filter @duedatehq/server test -- src/procedures/rules/concrete-draft.test.ts src/jobs/rules/concrete-draft.test.ts`
- `pnpm rules:concrete-drafts:report -- --failures --limit=60`
- `pnpm --filter @duedatehq/server test -- src/procedures/rules/concrete-draft.test.ts src/procedures/rules/source-text.test.ts`
- `pnpm rules:concrete-drafts:report -- --group-by=refusal,acquisition --limit=20`
- `pnpm rules:concrete-drafts:inspect -- --category=SCHEMA_INVALID --limit=6`
- `pnpm check`
- `pnpm rules:concrete-drafts:snapshot-sources -- --concurrency=4`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1`
- `pnpm rules:concrete-drafts:report -- --group-by=refusal,acquisition,source --failures --limit=100`
