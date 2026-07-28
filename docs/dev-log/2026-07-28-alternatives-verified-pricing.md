# duedatehq: verified pricing on all alternatives pages

2026-07-28

## Why

Owner directive: extend the competitor-page matrix with the pricing / free-version pattern.
Standing rule: CPA-facing facts must be verified against a source — no invented prices.

## What

Every `ALT_NOTES` entry (and `DDHQ_ALT`) now carries a starting-price sentence quoted from the
vendor's public pricing page as verified for the CPA Field Guide directory (Jul 2026), EN+zh,
with the verification date inline: TaxDome $67/user/mo · Karbon $59 · Canopy $45 ·
Financial Cents $19 · Jetpack $36 · Keeper $200/mo · File In Time paid desktop license (no
public per-seat price) · DueDateHQ free during beta. **Aero Workflow carries no price** — it is
not in the fact-checked 25-tool set, and facts-only means omit, not guess. Meta descriptions
now say "with starting prices" (EN) / 「起步定价」 (zh) to match `[tool] pricing` intent.

Verified: build OK, prices render on EN+zh pages, 24/24 tests.

## Maintenance

Prices go stale. When cpafieldguide re-verifies its pricing table, mirror changes here (grep
`public pricing, Jul 2026`).
