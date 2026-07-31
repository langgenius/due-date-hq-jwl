# GEO: statutory-authority FAQs on disaster pages + vendor-honest category roundup

**Date:** 2026-07-31 · marketing SEO/GEO

Two shipping moves from the 07-31 AI-citation-source analysis (Yuqi's T0–T4
tiers, see `docs/marketing/geo-citation-source-plan-2026-07-31.md`):

## 1. T0 — legal-authority anchors on every disaster notice page

`lib/disaster-notices.ts` `getNoticeFaq()` gains two shared FAQ entries that
render on all 11 `/irs-disaster-relief/[slug]` pages and flow into the FAQPage
JSON-LD automatically (same builder feeds both):

- **"Can a client outside the listed area still qualify?"** — the Treas. Reg.
  §301.7508A-1(d)(1) records-in-the-area nuance + the 866-562-5227 hotline
  (both stated in every IRS release's "Filing and payment relief" section).
- **"What legal authority does the IRS use to postpone these deadlines?"** —
  IRC §7508A, applied by the page's own relief code; covered disaster area per
  Treas. Reg. §301.7508A-1(d)(2); P.L. 119-29 (Filing Relief for Natural
  Disasters Act, enacted July 24, 2025) for state-declared disasters.

Why: AI models align facts on statutory identifiers (reg cites, relief codes).
Pages that carry them verify cleanly and get cited; pages without them don't.
Facts verified against congress.gov (PLAW-119publ29) and IRS release language
before writing. Note the subsection mapping: **(d)(2) = covered disaster area,
(d)(1) = affected taxpayer** — the tiers doc's shorthand cited (d)(2) for both.

## 2. T1 — `/guides/best-tax-deadline-tracking-software` (EN + zh)

New head-query category roundup in `lib/seo-content.ts`
(`categoryRoundupPage()`, exported as `categoryRoundupPages`, appended in
`getGuidePages()` so it auto-joins the guides route, `/resources`, llms.txt,
and the guardrails test).

Positioning attack: incumbent "best X" results are vendors ranking themselves
first without disclosure. This page does the opposite — the hero note declares
DueDateHQ publishes the guide and appears in it; all seven tools reuse the
already-verified `ALT_NOTES` facts (public positioning + Jul-2026 prices); and
the taxonomy (static library / workflow suite / monitoring layer) plus a
"When should you _not_ pick DueDateHQ?" section says plainly when a suite is
the right answer. FAQ questions mirror four of the 30 target prompts verbatim
(practice-management-or-calendar, automatic state-change tracking, IRS
postponement alerts, how small firms avoid missed deadlines).

## Verification

- `pnpm --filter marketing test` (24 passed) + `astro check` (0 errors).
- Live-verified on this session's dev server: EN + zh guide pages render, the
  WA-2025-03 page shows both new FAQs, and the page's JSON-LD contains
  `7508A` / `119-29` / the hotline number. No console errors.
