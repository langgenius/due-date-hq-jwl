# SEO moonshots T1–T5 — one-evening build (2026-07-16)

13 research agents + serial build pipeline. Everything below is sourced (official state DOR pages
/ irs.gov releases), agent-verified with the same no-fabrication discipline as the disaster DB.

## T1 — state × entity-type deadline matrix (46 jurisdictions)

- 8 regional agents verified **individual / C-corp / passthrough** due dates + extension rules for
  45 states + DC (the CA/NY/TX/WA/FL five already have repo rule data). 41/46 fully complete;
  nulls only where an official page states nothing (or the state has no such tax — recorded as
  the fact, e.g. NV Commerce Tax, TN F&E, OH CAT, NH BPT/BET).
- Dataset: `apps/marketing/src/lib/state-filing-deadlines.json` (46 entries, per-category
  form/due/extension/sourceLabel/sourceHref, many with verbatim official quotes).
- Rendered as a new **"Verified filing deadlines"** section on every `/states/[state]` page
  (`StateDetailPage.astro`), EN pages only (sourced fact strings are English; zh mirrors skip the
  section rather than machine-translate facts). Per-row official source link + disclaimer.
- Catches that justify the verification pass: IA individual Apr 30; VA May 1; DE Apr 30; HI
  Apr 20; AR passthrough Apr 15 (not Mar 15); PA/NJ/AL/CO corporate May 15; OK federal+30;
  OR month-after-federal; DC taxes S corps and rejects federal extension forms.
- Discovery: the federal layer already existed (14 `/rules/` form pages + 50 `/states/` pages
  with one sourced headline deadline) — this pass deepened states to a 3-category matrix.

## T2 — AI-search surface

- `llms.txt` / `llms-full.txt` already existed (index + full reference). Added the missing
  **live disaster-relief sections**, generated from `disaster-notices.ts` at build (never drifts):
  llms.txt lists live postponements + hub/feed/widget; llms-full adds covered returns + official
  release URL per notice.

## T5 — historical archive (2020–2026)

- 4 yearly agents transcribed **206 relief notices** from the IRS yearly indexes + release pages
  (one entry per relief code, final deadline after updates; COVID-19 nationwide entry included;
  known IRS quirks preserved — duplicate TN-2021-01 reuse, uncoded 2020 OR wildfires).
- Dataset: `apps/marketing/src/lib/disaster-archive.json`. New page
  **`/irs-disaster-relief/archive`**: grouped by year, per-code anchors (`#tn-2023-02`), each
  entry links its irs.gov release. Hub cross-links it. Long-tail: relief-code + per-year queries.

## T4 — citable stats (v1)

- "By the numbers" block on the archive page, computed from the dataset at build: 206
  postponements 2020–2026, 47 states/territories, peak year 2024 (62), most-postponed TN/MS/LA/CA/FL.
  Free-to-cite framing for press. Full narrative report = follow-up.

## T3 — free tools (queued)

- Next build: disaster-relief eligibility checker (county → live relief lookup, pure verified
  data). Then a penalty calculator (IRS-sourced formulas + disclaimers).

## Verification

`astro build` clean at every step (208→209 pages). Spot-checks: GA Form 500 / IA Apr 30 /
NV Commerce Tax render; zh state pages unchanged; archive page renders all 206 with source links;
llms.txt carries the live LA/MS/WI/etc. postponements.
