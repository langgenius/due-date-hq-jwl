---
title: 'Penalty formula v3 facts and source metadata'
date: 2026-05-04
author: 'Codex'
---

# Penalty formula v3 facts and source metadata

## Background

Deadline readiness v2 split stored 90-day legacy penalty estimate from runtime accrued penalty, but the engine
still depended on client-level legacy inputs and had no place to persist formula facts, missing fact
lists, or source references. The requested all-state rollout also made one boundary explicit:
state penalties cannot reuse federal formulas or fake `$0` when an official formula has not been
entered.

## What Changed

- Added versioned obligation-level `penaltyFactsJson` with `penalty-facts-v1` and persisted formula
  metadata: missing facts, source refs, formula label, and facts version.
- Moved federal penalty calculations to read `penaltyFactsJson` first. Legacy client inputs are now
  only used by import/backfill to prefill facts when the value is knowable.
- Bumped the engine to `penalty-v3-allstates-2026q2`.
- Split the penalty formula registry into `packages/core/src/penalty/catalog.ts` so source-backed
  formula entries are no longer embedded in the evaluator.
- Added source-backed federal catalog entries for Form 1065, Form 1120-S, Form 1120, and Form 2220 /
  IRC 6655 corporate estimated-tax underpayment.
- Added source-backed explicit state formula entries and evaluators for CA corporation / S
  corporation / LLC penalties, NY CT-3 / CT-3-S / IT-204 / IT-204-LL / PTET payment penalties, TX
  franchise report / extension / PIR-OIR penalties, FL F-1120 and estimated-tax underpayment, and
  WA combined excise late-payment penalties.
- Extended migration mapping targets and import parsing for catalog-needed facts including gross
  receipts, receipt bands, no-tax-due flags, WA subtotal minus credits, TX prior/current year
  franchise tax, FL tentative tax, NY PTET election/payment facts, and withholding/UI report counts.
- Changed federal corporate estimated tax to return `needs_input` unless installment facts and
  underpayment rates are present.
- Kept remaining generic `xx_state_*` tax types explicitly `unsupported` until each state/program
  formula is entered with official source refs. This prevents accidental federal fallback.
- Extended obligation, Obligations, Dashboard, migration import, and maintenance backfill paths to
  carry the new fact/source metadata.
- Updated Obligations detail breakdowns to show formula label, fact version, missing facts, inputs,
  and official sources without adding a new top-level dollar metric.
- Extended `pnpm rules:check-sources` so penalty formula catalog entries must include official URL,
  excerpt, effective date, and last-reviewed date.
- Clarified the user manual wording for Dashboard `Legacy penalty estimate` / Deadline Radar so users
  understand it as a 90-day estimated exposure queue, not an official penalty notice or fake `$0`
  when facts are missing.

## Boundary

This does not complete the requested `50 states + DC` generic state penalty formula catalog. The
explicit legacy state formulas above are source-backed; remaining generic state programs still need
source-by-source official formula entry. Until then, those obligations return `unsupported` rather
than an estimated or federal-derived amount.

## Validation

- `pnpm check`
- `pnpm rules:check-sources`
- `pnpm --filter @duedatehq/core test -- penalty`
- `pnpm --filter @duedatehq/contracts test`
- `pnpm --filter @duedatehq/server test -- src/procedures/_penalty-exposure src/procedures/obligations migration`
- `pnpm --filter @duedatehq/db test -- dashboard obligations`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm db:migrate:local`

## Follow-up

- Applied `0028_penalty_facts_v3.sql` to local Miniflare D1 after Dashboard load failed on
  `obligation_instance.penalty_facts_json`; verified the new columns exist on
  `obligation_instance` and a direct select against the new fields succeeds.
- Restarted the local Wrangler Worker after `pulse.revert` hit stale D1/Drizzle JSON mapping state;
  verified `/api/health` and a fresh D1 binding can read all local obligations through
  `repo.obligations.findById`.
