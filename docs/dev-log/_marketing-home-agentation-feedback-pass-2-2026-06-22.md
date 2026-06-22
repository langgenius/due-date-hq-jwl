# Marketing home — Agentation feedback pass 2 (10 items)

**Date:** 2026-06-22 · `apps/marketing/src/components/home/*` + `index.astro` + `zh-CN/index.astro`. A second round of element-level comments on `/`. Done top-to-bottom across two commits.

## Batch 1 (commit 7f0ddd3e)

- **Reorder (#10):** Surfaces (the product/UI showcase) now comes right after Villain — introduce the product before "how it works." Also breaks the villain↔how-it-works **3-column collision (#6)**.
- **Villain (#5,6):** off the plain 3-up card grid → a 2-column editorial layout (claim left; pains as a vertical icon-list right, globe/inbox/clock).
- **Nav (#1,2):** on scroll the whole bar **collapses into a centered floating pill** ([mark] links [Start free]; brand text / Beta / Sign-in hidden); removed the pill shadow. On-dark scrolled pill goes translucent-white.
- **Spyrail (#3,8):** hidden at the hero, **revealed once scrolled past it**; polished dots/spacing + active ring.
- **Notice tabs (#7):** lighter accent-tint active instead of the heavy solid-navy pill.

## Batch 2 (this commit)

- **Hero hierarchy (#4):** pulled the "~10 min" line out of the subhead (it was a bold clause competing with the bold point-leads) into a clean, readable reassurance line below the CTA. Subhead is now the value-prop only.
- **Notice clip (#9):** the document/source card now uses the product's source-link affordance — the URL renders accent + a trailing **↗ external-link** icon (mirrors `AlertSourceLink` in the app). A closer 1:1 with the product's source card can follow if needed.

## Verification

Build 74 pages, 0 errors (each batch). Verified live: section order (hero→villain→surfaces→how→…), nav collapse static state, villain 2-col, rail visibility/polish, lighter tabs, hero reassurance line, clip ↗ source link. Scroll-driven bits (nav collapse, rail reveal) run live in a real browser (headless can't fire scroll/rAF; verified by toggling classes). Reminder: the dev server goes stale on new CSS classes — cleared cache + restarted between batches.
