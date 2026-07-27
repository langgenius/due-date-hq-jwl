# 2026-07-27 · Marketing GEO entity hardening + AI-citation tracking

## Context

Reviewed AI-answer-engine (GEO/AEO) visibility for the CPA/accounting-tools use case. Decision (with Yuqi):
**DueDateHQ is the canonical entity** AI engines should surface — especially for the "active deadline /
rule-change monitoring" category, which live searches show is **unclaimed** (competitors and Thomson Reuters
ONESOURCE currently answer "software that monitors IRS deadline changes" while DueDateHQ is absent).
cpafieldguide.com drops to a **supporting citation source** only, because a brand-entity collision with the
well-funded namesake **Fieldguide.io** makes fighting for the "CPA Field Guide" entity a losing play.

The marketing site (`apps/marketing`) is already GEO-mature per `docs/dev-file/13`: Organization + WebSite +
SoftwareApplication + Service + FAQPage graph, `llms.txt`/`llms-full.txt`, AI-crawler-permissive robots,
sitemap, hreflang, full zh-CN mirrors. This change closes the small, unambiguous entity-anchoring gaps and
stands up Phase 4 measurement. It does **not** add the category-definition page (pending Yuqi's framing call).

## Changes

- `apps/marketing/src/pages/robots.txt.ts` — explicitly name the AI crawlers previously covered only by the
  `*` wildcard: `Google-Extended`, `Perplexity-User`, `Applebot-Extended`, `CCBot` (all still `Allow: /`,
  per §7-2 pre-launch all-allow). Belt-and-suspenders visibility + lets a future tightening be per-bot.
- `apps/marketing/src/lib/structured-data.ts`:
  - `Organization` gains `alternateName: ['Due Date HQ', 'DueDate HQ', 'Duedatehq']` — real spelling variants
    only, so entity resolution folds them into one node instead of splitting/colliding.
  - `SoftwareApplication` gains a stable `@id` (`${SITE}/#software`) and `brand: { @id: ORG_ID }`, making it a
    first-class, referenceable node in the `@graph` (aligns with §Phase-1 "@id 互引" goal).
- `docs/marketing/geo-citation-tracking-2026-07-27.md` — new Phase-4 tracking battery: the exact prompts to
  run monthly across ChatGPT/Gemini/Perplexity/Claude/Copilot/AI-Overviews, seeded with the 07-27 baseline
  (DueDateHQ absent for its own category; cpafieldguide absent for "Karbon alternatives"; Fieldguide.io
  collision confirmed).

## Honesty / guardrails

- No `sameAs` fabrication: still gated on real off-repo profiles (LinkedIn/Crunchbase/G2/Capterra) per §7-3.
  `alternateName` values are true spellings of the existing brand, not invented profiles.
- No new capability or coverage claims; no unshipped-integration language. Within §1.2 rails.

## Not done (next)

- **Category-definition page** (`/what-is-deadline-monitoring` or rule-change-framed) with `FAQPage` +
  `DefinedTerm` schema, EN + zh-CN — the centerpiece; blocked on Yuqi's framing decision (deadline-monitoring
  vs rule-change-monitoring naming).
- **`sameAs`** — Yuqi to create the off-repo company profiles; then wire the real URLs into `ORG_SAME_AS`.
- **Index submission** — Bing Webmaster / IndexNow / GSC request-index (needs account access).
