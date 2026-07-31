# /sales-tax-deadlines — state×tax matrix B2a shipped (12 states, two-pass verified)

**Date:** 2026-07-31 · marketing SEO/GEO · second batch under docs/marketing/state-form-matrix-spec-2026-07-31.md

Same pipeline as B1a: four agents, two fully independent transcription passes
over 12 states' sales-tax cadence from official agency pages only, diffed cell
by cell. The page's editorial angle is the diff's own finding: "the 20th" is
not universal — CA is month-end, OH the 23rd, WA the 25th, NC's quarterly
returns are month-end, NY's quarters aren't calendar quarters, and FL's
effective e-pay deadline is a business day before the 20th.

Discipline notes: details the passes stated differently were NOT published —
WA's frequency thresholds (the passes cited different measures: tax liability
vs gross income), OH's vendor-discount cap and accelerated-payment rule, GA's
e-file/prepayment thresholds (single-pass only). NJ's $30,000 + $500 monthly-
remittance rule and NC's three liability tiers WERE published — both passes
agreed on the numbers.

## What shipped

- `lib/state-sales-rows.ts` — 12 verified rows (EN+zh), per-row official
  source + assigned-frequency rule where both passes agreed.
- `components/StateSalesPage.astro` + `/sales-tax-deadlines` EN & zh wrappers —
  card per state, source link + `/states/[slug]` cross-link on every card,
  FAQPage JSON-LD (the 20th-is-not-universal answer, NY non-calendar quarters,
  FL 1st/20th, frequency assignment).
- Registered: `/resources` related links, llms.txt, content-metadata
  freshness; cross-linked from `/franchise-tax-deadlines`.

## Verification

Marketing tests + astro check clean. Live-checked EN + zh on this session's
dev server: 12 cards, 12 official source links, no console errors.

Matrix remaining: B1b per-state leaf pages (await GSC signal), B3 withholding
cadence, IL franchise standby cell (manual verification).
