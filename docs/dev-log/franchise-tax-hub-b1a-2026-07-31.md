# /franchise-tax-deadlines — state×tax matrix B1a shipped (15 cells, two-pass verified)

**Date:** 2026-07-31 · marketing SEO/GEO · executes docs/marketing/state-form-matrix-spec-2026-07-31.md

First real batch of the state×tax matrix. The verification pipeline ran as
specified: six parallel agents transcribed 13 states' franchise/privilege/
net-worth taxes in two fully independent passes from official state-agency
pages only; the passes were diffed and only agreeing facts kept. Divergences
were third-pass verified by hand (TX extension detail on the Comptroller's
extensions page; Georgia's odd "following the beginning of the tax year"
wording — real, because the net-worth year runs a year behind) or dropped
(Alabama's extension rule — a pass-2 overreach not actually on the cited FAQ).

## What shipped

- `lib/state-tax-rows.ts` — 15 verified rows (EN+zh), per-row official source
  - status (`active`/`phase-out`/`repealed`). Highlights CPAs actually miss:
    DE's two different dates (Mar 1 corps / Jun 1 LLCs), NC's extension change
    to 7 months for TY2025+, NY's Mar 15 vs Apr 15 S/C split, CA first-year
    exemption expiry, and the repeal wave — OK (TY2023 final), LA (periods on/
    after 1/1/2026, Act 6), MS phase-out ($0.50/$1k TY2026 → repeal 1/1/2028).
- STANDBY cells documented in the lib header, NOT published: CA corporate
  minimum franchise timing (FTB due-dates page 404 in both passes) and
  Illinois (ilsos.gov 403-blocks bots; possible 2026 repeal signal
  unconfirmed — needs manual verification from a normal browser/network).
- `components/StateFranchisePage.astro` + `/franchise-tax-deadlines` EN & zh
  wrappers — grouped active vs repealed/phasing-out cards, source link on
  every card, cross-link to each `/states/[slug]` page, FAQPage JSON-LD with
  direct answers (TX May 15, DE dates, who repealed, CA $800).
- Registered: `/resources` related links, llms.txt Free tools & data,
  content-metadata freshness.

## Verification

Marketing tests (24) + astro check clean; 256 pages build. Live-checked EN +
zh on this session's dev server: 15 cards (12 active / 3 ending), 15 official
source links, no console errors.

Next batches per spec: B1b = per-state leaf pages once GSC shows demand;
B2 = sales-tax cadence pages. Also revisit the two standby cells.
