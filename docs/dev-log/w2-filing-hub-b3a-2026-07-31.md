# /w2-filing-deadlines — state×tax matrix B3a shipped (12 states, incl. the WA income-tax discovery)

**Date:** 2026-07-31 · marketing SEO/GEO · third batch under docs/marketing/state-form-matrix-spec-2026-07-31.md

Same two-pass pipeline (4 agents), 12 states' W-2 / annual withholding
reconciliation rules. Editorial angle from the diff: "January 31" is not the
whole answer — NJ is Feb 15, CA and NY have no state W-2 filing at all
(quarterly DE 9/DE 9C and NYS-45 instead), MI's W-2s are Jan 31 while its
Form 5081 is Feb 28 (the commonly-confused pair), NC's e-file mandate carries
a $200 format penalty + $50/day late.

## The Washington discovery

Both passes independently flagged that dor.wa.gov's income-tax page no longer
says "no income tax" — it now reads "recently enacted an income tax on
individuals with an annual adjusted gross income of $1,000,000 or more."
Third-pass fetched (same wording) and grounded against the legislature:
**ESSB 6346, "Establishing a tax on millionaires," Chapter 238, Laws of 2026,
signed March 30, 2026** (app.leg.wa.gov). Published as a RULE CHANGE cell:
individual obligation, no employer withholding stated by the DOR. This is a
live example of the product's category — a fact the whole "WA has no income
tax" content ecosystem is now wrong about. Follow-up candidate: a dedicated
newsjack/legislation page once DOR publishes implementation guidance
(effective tax years and filing mechanics were NOT published on the DOR page;
firm summaries say TY2028+ but that was not first-party verified, so it is
not on our page).

## What shipped

- `lib/state-w2-rows.ts` — 12 verified rows (EN+zh): 7 filing states, CA/NY
  quarterly-instead cells, TX/FL verified-negative cells, WA rule-change cell.
- `components/StateW2Page.astro` + `/w2-filing-deadlines` EN & zh wrappers —
  FAQPage JSON-LD; cross-linked with the sales-tax and franchise hubs and the
  federal payroll guide.
- Registered: `/resources` related links, llms.txt, content-metadata.
- Single-pass extras not published (OH IT 941 detail). OH page's dated
  sentence still reads "January 31, 2025" — we publish the generic rule, not
  a 2026 calendar date, until their page updates.

## Verification

Marketing tests + astro check clean. Live-checked EN + zh: 12 cards, 12
official source links, WA card carries the ESSB 6346 identifiers, no console
errors.

Matrix totals after B3a: 40 published cells across three hubs. Remaining:
B1b leaf pages (await GSC), IL franchise standby (needs human network),
WA implementation-guidance watch.
