# Marketing Phase C — restyle the long-tail templates to --m-* (4 of 5)

**Date:** 2026-06-22 · `apps/marketing/src/styles/marketing.css` (shared kit), `src/components/{GeoResourcePage,TrustPage,StateCoveragePage,StateDetailPage}.astro`. Brings the SEO/AEO/GEO pages onto the home's design language so the whole EN site reads as one product. Pricing template is the 5th — handled with the beta-free frame separately.

## Shared long-tail page kit (one source of truth)

The four templates all share the same hero / split-section / card / cta pattern, so instead of four copies of scoped styles I promoted them to a **`.m-page-*` / `.m-card` / `.m-btn` kit in `marketing.css`** (`@layer components`), built on the `--m-*` tokens. Now every long-tail template (and Pricing, later) consumes the same primitives:

- `.m-page-hero/-title/-lead/-note/-reviewed` — page header (Instrument Sans title, mono meta).
- `.m-page-block` — stacked content block with a contained editorial top-rule + tighter padding than the home's airy `.m-section`.
- `.m-page-split / __lead / -cards` — the 5/7 lead-plus-cards section; `.m-page-grid-3` for faq grids.
- `.m-card / __t / __d` — white surface + hairline card (replaces the product-UI `bg-bg-panel` cards).
- `.m-page-dl` — key-dates definition list; `.m-page-cta` + `.m-btn--primary/secondary` — closing CTA.

## Templates restyled

- **GeoResourcePage** (rules + comparisons + guides, hubs + leaves — the most pages) — rebuilt on the kit; dropped its product-UI utilities.
- **TrustPage** (about / security / privacy / terms / status) — kit; security is the nav-linked core page.
- **StateCoveragePage** (`/state-coverage`) — kit + a scoped state-card grid (mono abbreviation + accent-tint "Monitored" pill, hover→accent).
- **StateDetailPage** (`/states/[state]`) — kit + scoped 2-col grids (official sources, faq) and a back-to-coverage eyebrow link.

All content, structure, i18n labels, and structured-data are unchanged — this is a pure restyle.

## Verification

`pnpm --dir apps/marketing build` → **74 pages, 0 errors**. Screenshotted `/rules` (hub), `/state-coverage` (state grid), `/security` (trust) — all match the home (Instrument Sans headings, faint eyebrows, mono meta, white hairline cards). State leaf `/states/texas` renders the kit + scoped grids. Earlier headless caveat doesn't apply (static content, no scroll/IO JS).

## Remaining

Pricing template (5th) — restyle + add the "currently free during beta" frame (tiers stay, per the reconciled decision: real pricing, beta-free now). Then zh-CN repoint + i18n of the new surface; home interactions.
