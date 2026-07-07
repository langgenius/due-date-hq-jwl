# Marketing: IRS disaster-relief hub (3 surfaces) + homepage compare-matrix integrity fix

**Date:** 2026-07-07
**Area:** `apps/marketing/` (Astro)

## 1. IRS disaster-relief content hub — new

Three SEO/top-of-funnel surfaces driven from ONE verified dataset (`src/lib/disaster-notices.ts`,
every notice cited to its irs.gov release):

- **Per-notice/state pages** — `src/pages/irs-disaster-relief/[slug].astro` + `DisasterNoticePage.astro`,
  targeting "[state] IRS disaster relief 2026 deadline / affected filings". JSON-LD Article + FAQ + Breadcrumb.
- **Pick-your-state lookup** — `src/pages/irs-disaster-relief/index.astro` hub + interactive island: select a
  state → current IRS relief (notice #, postponed deadline, affected area, covered filing types) or an
  empty-state + app CTA. Progressive-enhancement (full roster renders without JS).
- **Neutral CPA response playbook** — `src/pages/irs-disaster-relief/cpa-response-playbook.astro`. Editorial,
  vendor-neutral 6-step guide (confirm notice → check state conformity → covered area → identify affected
  clients → adjust/document → notify). DueDateHQ appears once, neutrally, in the "identify affected clients"
  step among honest alternatives; transparent "practice guide from DueDateHQ" byline (no fake third party).

Data: 6 real 2026 notices (AZ/GA/HI/WA/NMI live, MO expired), each transcribed from its irs.gov page. Notices
carry `isLive` freshness so expired ones are marked, not silently shown as current. Shared structured-data +
content-metadata helpers added. Verified: `astro check` clean; all three surfaces screenshot-QA'd on-brand;
lookup interaction confirmed.

## 2. Homepage compare-matrix integrity fix — `components/home/Compare.astro`

A capability + competitor audit (competitor claims sourced from vendors' own public materials; DueDateHQ column
code-audited as genuinely shipped) flagged a **P0 on the live homepage matrix**: the named vendors **File In
Time** and **TaxDome** were hard-coded `'no'` on five monitoring rows (watches sources 24/7, reads what changed,
flags affected clients, one-click apply, source on every date). Those capabilities are **not advertised** in the
vendors' materials — not confirmed absent — so a bare product-named "No" is an unsourced negative / trade-libel
risk.

Fix (keeps the design, the vendor names, and the "DueDateHQ is the only ✓" rhetoric):

- New `na` mark ("Not advertised") for the two named vendors on those five rows. Renders the same neutral dash;
  the accessible label now says "Not advertised" instead of "No". (Excel + Outlook stays `no` — a spreadsheet
  genuinely doesn't monitor; not a vendor.)
- Added a dated public-materials **disclaimer** line ("Based on each vendor's public materials as of July 2026;
  features change. A dash means the capability isn't advertised, not that it's impossible…") + the DueDateHQ
  **apply gating/draft-review nuance** (detects & drafts for review; one-click apply on Pro plans for
  owner/partner/manager roles). EN + zh-CN.
- Reworded the screen-reader `ariaSummary` so it no longer asserts competitors "do none of it".

The generated `/compare/*` pages and the in-progress `works-with-your-stack` content were audited as already
safe (hedged category phrasing, shipped-only claims) and were NOT modified.

Verified: `astro check` — 0 errors.

## Notes

- Nothing here touches the app, server, outreach-kit, or send machinery.
- Related research this session (not shipped as claims): IRS-vs-state **conformity-divergence detection is
  NET-NEW** (the product tracks federal + state independently and does not compute the divergence) — so
  "auto-flags when your state doesn't conform" must NOT be marketed as shipped.
