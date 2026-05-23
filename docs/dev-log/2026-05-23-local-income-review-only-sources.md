---
title: '2026-05-23 · Local income review-only sources'
date: 2026-05-23
author: 'Codex'
---

# Local income review-only sources

## Change

- Added local-source metadata to rules contracts/core without widening `RuleJurisdiction` beyond
  `FED + 50 states + DC`.
- Added structured `localFactRequirements` to local sources, local candidate rules, preview input,
  and preview output so local applicability remains data-gated without adding a local UI surface.
- Registered the first five local income coverage packs in the existing Rule Library source flow:
  MD local income, IN county LIT, NYC/Yonkers, PA EIT/LST, and OH municipal income. PA and OH now
  use more granular source records under those packs: PA EIT / Act 32 withholding / LST are separate,
  and OH The Finder is separate from the Ohio Revised Code filing sources.
- Generated only review-only local candidate rules from those sources. They use
  `source_defined_calendar`, `applicability_review`, and local source evidence, so they cannot
  become reminder-ready without concrete practice review.
- Added a local concrete-draft backfill script that calls the real AI Gateway path and writes
  successful global `ai_output(kind='rule_concrete_draft')` rows into local D1. It does not return
  synthetic drafts from `rules.listConcreteDrafts`.
- Backfilled the selected local candidates in local D1. The latest successful rows for all eight
  local context refs use `model='google/gemini-2.5-flash-lite'` and `guard_result='ok'`.
- Retired the old deterministic concrete-draft fallback. `generateConcreteDraft` no longer writes
  synthetic `deterministic-source-text` success rows, and both cache reuse and Rule Library listing
  ignore that retired model.
- Reprocessed the existing local D1 rule concrete-draft cache with the real AI Gateway model.
  Real AI output replaced 92 of the 141 latest deterministic context refs. The remaining 49 refs
  failed schema, source-text, or concrete-date guards and were marked `retired_fallback` instead of
  staying visible as successful drafts.
- Accepted local concrete rules also stay reminder-blocked when required local facts are missing;
  preview marks `local_fact_requirements_missing` and lists the missing structured facts.
- Kept UI scope unchanged: no new Local Coverage surface, Client local-facts panel, or local-only
  filter was added.

## Product boundary

Local coverage is available only where explicitly listed and reviewed. This change does not claim
full county/city coverage and does not cover local-heavy sales/use, property, lodging, or business
license regimes.

## Validation

- `pnpm check`
- `AI_GATEWAY_MODEL_QUALITY_JSON=google/gemini-2.5-flash-lite pnpm exec tsx scripts/generate-local-concrete-drafts.ts`
- `AI_GATEWAY_MODEL_QUALITY_JSON=google/gemini-2.5-flash-lite pnpm exec tsx scripts/generate-local-concrete-drafts.ts --all-deterministic --concurrency=4`
- `sqlite3 ... "select count(*) from ai_output where kind='rule_concrete_draft' and model='deterministic-source-text' and guard_result='ok';"` → `0`
- `pnpm --filter @duedatehq/server test -- src/procedures/rules/concrete-draft.test.ts src/procedures/rules/review-audit.test.ts src/procedures/rules/_obligation-generation.test.ts src/procedures/rules/onboarding-activation.test.ts`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm --filter @duedatehq/contracts test -- contracts.test.ts`
- `pnpm --filter @duedatehq/server test -- src/procedures/rules/_obligation-generation.test.ts src/procedures/rules/onboarding-activation.test.ts src/procedures/rules/review-audit.test.ts`
- `pnpm --filter @duedatehq/app test -- --run src/routes/rules.library.test.tsx`
- `curl -I -sS https://dced.pa.gov/local-government/local-income-tax-information/act32-faq/`
- `curl -I -sS https://dced.pa.gov/local-government/local-income-tax-information/local-services-tax/`
- `curl -I -sS https://codes.ohio.gov/ohio-revised-code/section-718.05`
- `curl -I -sS https://codes.ohio.gov/ohio-revised-code/section-718.051`

`pnpm rules:check-sources` was also attempted. The new PA/OH official URLs returned HTTP 200 in
direct HEAD checks, but the repo-wide checker still exits 1 in this local environment because
pre-existing probes for `il.ui_wage_report` and `ar.temporary_announcements` failed remotely.
