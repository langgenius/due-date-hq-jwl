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

## Arizona Source Fetch Repair

Arizona DOR and DES pages were visible in a normal browser, but local
server-side fetches returned `403` JavaScript/cookie challenge pages. The
concrete draft source builder therefore saw only source registry metadata and
recorded `SOURCE_TEXT_UNAVAILABLE` for all Arizona source-defined candidate
rules.

Added Arizona-specific source-backed excerpts for individual income, estimated
tax, fiduciary, corporate, pass-through entity, TPT, withholding, and UI wage
report candidate rules. The TPT excerpt uses an explicit 2026 monthly electronic
return/payment date table so the AI draft can normalize it into a period table
without relying on the blocked live page.

Targeted local backfill reran the Arizona sources with `--retry-failed`; all 9
Arizona candidate rules now have successful global cached drafts. Follow-up
report:

- successful global cached drafts: 305
- missing successful drafts: 126
- Arizona failures: 0

## Rule Library Display Repair

The `/rules/library` page had a separate selected-rule detail path from the
coverage tab. It loaded candidate rules but did not call `listConcreteDrafts`,
so source-defined candidate rules rendered `AI concrete draft is not ready`
even when the global concrete draft cache already contained successful drafts.

The library route now fetches concrete drafts for source-defined rules and
threads the cached draft into both the selected rule dialog and batch-review
dialog. `RuleDetailInline` also accepts the same `concreteDraft` prop as the
compact detail surface so cached AI drafts are displayed consistently across
Rule Library entry points.

## DC Source Fetch Repair

DC had two different source-text issues. The individual income tax forms page
now has a usable snapshot with the 2026 D-40 and D-40ES filing-date rows, but
the failed AI output attempts were created before the retry. The broader
`dc.tax_filing_deadlines` source pointed at a sparse OTR page that produced only
title/URL/review metadata, so fiduciary, business, sales/use, and withholding
candidate rules had no source-backed text. The UI wage source also pointed at a
general DOES page instead of the reporting FAQ page that states the UC-30
quarterly due dates.

Added DC-specific source-backed excerpts for individual income, estimated
individual income, fiduciary income, business income/franchise, business
estimated tax, partnership, sales/use, withholding, and UI wage report candidate
rules. Updated the DC UI wage source URL to the DOES reporting questions page.

Targeted local backfill reran the DC sources with `--retry-failed`; all 9 DC
candidate rules now have successful global cached drafts. Follow-up report:

- successful global cached drafts: 314
- missing successful drafts: 117
- DC failures: 0

## Georgia PDF Source Repair

Georgia fiduciary income tax was a direct PDF source, not an HTML page. The
source was correctly marked `pdf_watch`, but it still pointed at the 2024
fiduciary instruction booklet and had no source snapshot, so the concrete draft
builder saw only source metadata and returned `SOURCE_TEXT_UNAVAILABLE`.

Updated `ga.fiduciary_income_tax_booklet` to the 2025 Georgia 501 and 501X
fiduciary instruction booklet PDF. The PDF snapshot command downloaded the
official PDF, extracted 49,077 characters of text, and archived the text as a
source snapshot. Targeted local backfill then generated the Georgia fiduciary
global cached draft successfully. Follow-up report:

- successful global cached drafts: 315
- missing successful drafts: 116
- Georgia failures: 0

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
- `pnpm --filter @duedatehq/app test -- src/routes/rules.library.test.tsx`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=2 --source=dc.income_tax`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=2 --source=dc.tax_filing_deadlines`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=dc.ui_wage_report`
- `pnpm rules:concrete-drafts:report -- --group-by=jurisdiction,source,refusal --failures --limit=40`
- `pnpm rules:concrete-drafts:snapshot-sources -- --source=ga.fiduciary_income_tax_booklet --concurrency=1`
- `pnpm rules:concrete-drafts:backfill -- --retry-failed --fast-model --concurrency=1 --source=ga.fiduciary_income_tax_booklet`
- `pnpm rules:concrete-drafts:inspect -- --source=ga.fiduciary_income_tax_booklet --limit=3 --show-source-excerpt`
