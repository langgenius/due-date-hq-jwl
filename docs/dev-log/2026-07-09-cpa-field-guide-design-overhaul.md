---
title: 'CPA Field Guide — Design Overhaul (monograms, logo, hero, banners, rows view)'
date: '2026-07-09'
area: docs / marketing
---

# CPA Field Guide — Design Overhaul

Full visual pass on the CPA Field Guide directory (`docs/integrations/cpa-tools/`), driven by real page annotations. Source of truth stays `cpa-tools-directory.html` (body-only) → `deploy/build.mjs` generates 46 static pages into `deploy/`. Live at cpafieldguide.com (Vercel, deploys straight from `deploy/`, independent of git).

## What landed

- **Card logos → brand-color monogram tiles.** Raw vendor favicons were inconsistent, and three Intuit products (Lacerte/ProConnect/ProSeries) shared one identical icon. Cards now use a uniform monogram tile — initials on the vendor's brand color (DR/LA/PC/PS/UT/CC/AT…), distinct per product. Real favicons are kept on the tool detail-page heroes (white tile). Favicons stripped from cards dropped the homepage from ~119K to ~88K.
- **Logo → compass star.** Refined 4-point navigation mark (white, north point in accent blue) on the dark tile; wired into the header mark, favicon, and OG image. Also fixed a stale "26 tools" → 25 and the legend wording in the OG.
- **Section headers → banner.** Bigger icon anchor (34→44px), prominent title, "N tools" count pushed to the right edge, and a hairline framing the header from the card grid.
- **Homepage hero → two columns.** Headline/lede on the left; a 2×2 category overview (icon + name + tool count, each links to its section) fills the previously-empty right half. Stacks on mobile.
- **Card hierarchy.** Name up to 18px serif; a divider splits each card into identity (logo/name/desc) vs a "decision zone" — price as the headline datum, integration openness as a chip, domain demoted to a quiet link. Equal-height descriptions keep dividers aligned across a row (dropped on mobile).
- **Cards ⇄ rows view toggle.** A grid/list switch flips every category grid between cards and a dense, aligned row layout (logo+name | description | price | openness) for power-scanning. Reuses the card markup via `display:contents` (no duplicate DOM); remembered per visitor via `localStorage`; desktop/tablet only, falls back to cards on mobile. Lives on the homepage sticky bar and in each category page's banner.
- **Real screenshots.** User-provided Karbon + ProConnect UI captures on their detail pages (Karbon's marketing frame trimmed; both optimized + lazy-loaded, with an identification caption). A `deploy/detail-shots/<slug>` slot renders only on detail pages — never on the card grid, to keep it consistent.
- **Consistency pass.** All supporting-footer sections unified to white + hairline dividers (removed a stray blue block and a white-strip gap); guide pills → editorial text links; integer type scale (killed fractional px sizes); radii snapped to 12/8/4/999; 4-color openness spectrum (merged the orphan "no API yet" dot into the neutral no-API group).
- **Interaction spec + fixes.** `interaction-spec.md` documents the browse/filter interaction across states, micro-interactions, motion, gestures, feedback, error paths, and loading. Writing it surfaced two real bugs, both fixed: scroll-spy could light a hidden (filtered-out) section — guarded with `offsetParent`; and the mobile result count wasn't announced to screen readers — now visually-hidden + `aria-live`.

## Notes

- Monograms are approximate brand colors, not trademarked logos. The three Intuit products share the same blue but differ by initials (LA/PC/PS); left as-is since same-brand-same-color is accurate.
- `deploy/annotate.js` is a local-only annotation helper (loaded via a bookmarklet on localhost) — intentionally not committed or deployed.
- Landed on `main` as isolated linear commits — the repo ruleset forbids merge commits on `main`, so the CPA Field Guide work is applied directly on top of origin/main rather than merged.
