# Marketing — subpages depth pass

**Date:** 2026-06-22
**Scope:** `apps/marketing` core subpages + long-tail templates. Multi-agent
workflow (one agent per page/template, balanced bias), verified + committed by the
main loop. Goal: each subpage becomes the deeper, bolder, reworked-copy version of
its landing counterpart (overlap allowed, near-duplicates not).

## Changes

- **/how-it-works** (flagship) — rebuilt from a thin re-stack of landing sections
  into a real product walkthrough. New page-specific components
  `home/LoopDeep.astro` (the loop expanded to four stages — Watch · Match · Rank ·
  Apply — as numbered editorial rows on a connector rail) and `home/SurfaceDeep.astro`
  (each of the four surfaces gets its own alternating split section: larger product
  mini-UI + how-it-works paragraph + a "why it matters to a CPA" aside + capability
  bullets). Bold display-serif hero with a "one change, start to finish" worked
  example. Keeps nav `current="how"` + the `#how`/`#work` anchors. EN + zh.
- **/pricing** — display-serif hero ("One price to never miss a deadline change."),
  beta-free banner integrated, the recommended **Pro** plan made unmistakably dominant
  (ribbon + accent frame + micro-lift), a derived feature-comparison matrix and an
  "in every plan" recap band (both from existing data — no fabricated facts), 6-item
  objection FAQ. Every plan id / price / checkout href / `data-pricing-*` hook intact.
  Copy in `i18n/en.ts` + `i18n/zh-CN.ts` (t.pricing only).
- **TrustPage** (/security, /about, /privacy, /terms, /status) — display-serif heroes
  on the signature pages + a bold navy CTA finale, a pull-quote "statement" card, a
  numbered "on this page" contents rail, and `01/03` editorial section indices.
  /security reads evidence-first; /about gets a real-team mission. Copy sharpened in
  `lib/trust-pages.ts` with all security/legal facts left intact (no invented certs or
  metrics). Deliberately NO `data-reveal` (trust route doesn't load ScrollMotion).
- **GeoResourcePage** (rules / guides / comparisons) — page-hero trust bar (reviewed
  date + "sourced on every date" cue), key-dates promoted to a sourced fact table,
  confident related-links + CTA. Template-only (no data files touched).
- **State pages** — StateCoveragePage + StateDetailPage pushed bolder, echoing the
  landing Sources "all states watched live" energy; clearer detail hierarchy +
  cross-links. Template-only.

## Verified

- `pnpm --dir apps/marketing build` → 76 pages, clean.
- Orphan-reveal check: every `data-reveal` component is only used on index +
  how-it-works (both load ScrollMotion). TrustPage + Pricing have none.
- Live: /how-it-works, /pricing, /security render strong; no horizontal overflow.

## Next

- Phase 3: site-wide system pass (type scale, spacing, grid, color, motion,
  micro-interactions, localization, error states).
- Phase 4: whole-site design-critique.
