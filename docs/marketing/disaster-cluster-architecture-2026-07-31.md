# Disaster-relief content cluster — grounded architecture & rollout (2026-07-31)

This is the operating doc for the five-layer disaster-relief cluster, **adjusted from the
external strategy draft Yuqi supplied on 2026-07-31 to match what the repo actually has**.
The draft's skeleton is sound; several of its data assumptions were wrong. This doc is the
corrected, executable version. Everything in §1 shipped 2026-07-31.

## 0. Corrections to the draft (verified 2026-07-31)

| Draft claim                                  | Reality                                                                                                                                                                                                                                 |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "州对齐 5 年历史爬虫已在跑"                  | **False.** No conformity tracking existed anywhere. L3 is manual per-state research (now started: 5 states done via sourced agent research).                                                                                            |
| `county_fips[]` exists                       | **False.** `affectedArea` is verbatim IRS free text. County pages need a parser + county master table first.                                                                                                                            |
| H.R. 1491 signed "January 2026"              | **Wrong.** It became **P.L. 119-64 on Dec 26, 2025** (House 423-0 Apr 1 2025; Senate UC Dec 11 2025). Substance confirmed: postponement periods count for the §6511(b)(2)(A) refund lookback and for §6303(b) collection-notice timing. |
| P.L. 119-29 = governor-request postponements | Confirmed (H.R. 517, Jul 24 2025) — **plus a second change the draft missed**: mandatory automatic §7508A(e) extension went 60 → 120 days.                                                                                              |
| — (not in draft)                             | **New find: P.L. 119-21** (Jul 4 2025) made the qualified-disaster casualty-loss deduction permanent and, beginning 2026, extends it to state-declared disasters. Pairs with P.L. 119-29 on any legislation page.                       |
| L2 pages to be built                         | Already existed (`/irs-disaster-relief/[slug]`) covering ~5 of the draft's 7 H2s.                                                                                                                                                       |
| Free data download to be built               | JSON feed already existed; CSV + Dataset schema + archive merge shipped today (§1).                                                                                                                                                     |

Sources for the legislation rows: congress.gov / govinfo BILLSTATUS + PLAW texts
(agent-verified 2026-07-31; URLs in the dev-log entry of the same date).

## 1. Shipped 2026-07-31

- **Dataset layer (L1 upgrade).** `lib/disaster-dataset.ts` joins the 206-notice 2020–2026
  archive with the current verified notices (archive is a strict superset by relief code;
  current entries enrich their rows). Emits:
  - `/data/disaster-notices.csv` — full dataset, one row per relief code.
  - `/data/disaster-notices.json` — unchanged `notices` shape (widget-safe) + new
    `archive`, `stats`, `csvUrl` fields.
  - `Dataset` JSON-LD (`/irs-disaster-relief#dataset`, shared `@id`) on the hub and
    archive pages, with both distributions. Stats computed from rows — can't drift.
- **L3 state-conformity pages** at `/irs-disaster-relief/state-conformity/[state]` from
  `lib/state-conformity.ts` (same one-source-of-truth + verbatim-source discipline as
  `disaster-notices.ts`). Live: **WA, HI, MI, LA, WI** — all five target states.
  Cross-linked: hub section + a conformity card on each state's notice page.
- **L2 data fix:** LA-2026-02 updated 7/28 by the IRS — six parishes (added Lafourche,
  Pointe Coupee). Same "update banner" trap as WA-2025-03; comment updated in
  `disaster-notices.ts`.

### What L3 found (the moat is real)

Every state researched so far **fails to mirror the federal date** in a way CPAs must know:

- **WA:** no income tax; only TY2025 capital-gains moved (May 1) — nothing followed the
  IRS's second move to Aug 5. All other relief request-based via My DOR.
- **HI:** waiver of penalties/interest only — the deadline itself never moved; income tax
  only; **Form L-115 required** by Aug 20.
- **MI:** state waiver capped at **May 26** and explicitly disclaims federal dates;
  request-based per taxpayer (MI-1040 lines 35b–35d; no bulk requests); state and IRS
  county lists differ (Washtenaw on IRS list only).
- **LA:** **no state relief issued at all** for Arthur as of 7/31; when RIBs come they're
  automatic-by-address but historically match the IRS date only for income _filing_
  (Francine: payment interest kept accruing; sales/withholding got earlier dates).
- **WI (the one "yes"):** standing policy auto-extends income/franchise + estimated
  payments to the federal disaster date, interest waived, no event notice ever published —
  but withholding and sales/use are covered by no statement, and the return must be
  marked (Special Conditions + disaster name).

This heterogeneity is the page family's value: it cannot be templated from federal data.

## 2. Layer status & next moves

| Layer                  | Status                                                                                                                                                                                                          | Next                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| L1 hub + Dataset + CSV | **live**                                                                                                                                                                                                        | Add conformity + archive links to /widget outreach copy                                                               |
| L2 notice pages        | live (11 notices)                                                                                                                                                                                               | Adopt remaining draft H2s: per-form original→new deadline table; bulk-request (866-562-5227 / CAF) para exists in FAQ |
| L3 conformity          | **9 live** (WA/HI/MI/LA/WI + GA/MS/MT/AZ — every state with an active notice)                                                                                                                                   | Next: remaining states by disaster frequency (archive stats: top = the most-postponed states)                         |
| L4 county pages        | **parser built, gate HOLDS** — `scripts/parse-disaster-areas.mjs`: 177/206 fully parsed, 19 partial, 10 unparsed, 1,291 state+county pairs; audit awaiting human sign-off (`l4-area-parse-audit-2026-07-31.md`) | Human-review the 29 flagged rows + sample; then county master table; then batched pages                               |
| L5 decision pages      | **4 live** (playbook + conformity explainer + P.L. 119-29 page + P.L. 119-64 page)                                                                                                                              | Candidates: bulk-request procedure page, penalty-abatement-during-postponement page                                   |

## 3. L4 gating — do NOT ship until these hold

1. **Tribal-jurisdiction landmine (draft missed this).** Relief areas include tribal
   nations that don't map to counties (WA's 25 tribal nations, San Carlos Apache, Crow
   Reservation, Oneida). A county page answering "No active relief" while a tribal area
   inside that county IS covered is a _wrong answer to the page's own question_. Every
   county page must carry a tribal-lands caveat whenever the county overlaps any
   tribal-designated relief area — and the parser must track tribal designations as
   first-class rows, not county aliases ("Samish" was already mis-listed as a county
   once; see disaster-notices.ts 2026-07-28 note).
2. **Parser accuracy.** 206 archive `affectedArea` strings → structured county lists
   (counties, parishes, boroughs, municipios, "all 64 parishes", city-only entries like
   MI's Ann Arbor). Human sample-audit ≥30 rows incl. every format family before build.
3. **"No" pages are claims.** The empty state ("no active postponement for X County")
   must be derivable as: not in any live notice's parsed area, checked as of build date,
   with the daily-check claim true (CI rebuild cadence) before we print it.
4. **Batching.** Ship counties with ≥1 historical declaration first (~half), watch
   indexing, then the rest.

## 4. Annual report (战线 3) — nearer than the draft thought

`stats` already computes: 206 postponements 2020–2026, 48 states/territories, per-year
counts (peak 2024 = 62). Feasible now from existing data: yearly trend, average/median
postponement length (deadline − incidentStart where present), state frequency table,
busiest months. **Cut for v1:** "which states conform fastest" — needs L3 coverage ≥
~20 states plus per-event state dates. Realistic v1 window: after L3 wave 2.

## 5. Discipline (unchanged)

Official source fetched → one spec entry (`disaster-notices.ts` / `state-conformity.ts` /
archive JSON) → pages, feed, CSV, schema all derive. Never hand-edit a derived surface.
Negative findings ("state issued nothing") must be dated and re-verified before reuse —
they expire. Read the IRS update banner, not the body.
