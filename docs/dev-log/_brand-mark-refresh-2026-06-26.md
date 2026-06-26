# Brand mark refresh — tilted-bar logo + #1F315C navy

**Date:** 2026-06-26 · Supplied by Yuqi (`logo-svg.svg`).

Adopted the refreshed stacked-bars mark across the product. Two changes vs the prior mark:

1. **Geometry** — the third bar is now **tilted ~2.4°** (`rotate(-2.43169)`) and nudged right,
   where it used to be indented (`x27`). A schedule with one row knocked askew — a deadline
   off-line. New artwork box `170×129`, bars `147.678×26.6898 rx8`.
2. **Navy** — brand-ink moves `#0A2540` → **`#1F315C`** (the supplied logo's navy). Scoped to
   brand surfaces only (logo tile, wordmark, favicon, meta theme-color); the UI accent navy
   (`util-colors-primary-600` `#22488C`) is untouched.

## Files

- `apps/app/src/components/primitives/brand-mark.tsx` — new `Bars()` geometry; framed form
  re-fit into the 64 tile (`translate(8 13.8) scale(0.282)`); frameless viewBox → `170×129`.
- `packages/ui/src/styles/tokens/primitives.css` — `--color-brand-ink` → `#1f315c`.
- `packages/ui/src/theme/theme.ts` — `THEME_COLOR_LIGHT` → `#1F315C`.
- `apps/app/index.html` — `<meta theme-color>` → `#1F315C`.
- Static brand SVGs (new geometry + navy): `packages/ui/src/assets/brand/brand-mark.svg`
  (256), `brand-favicon.svg` (32), `brand-favicon-dark.svg` (32, keeps `#071A2E` dark tile),
  `apps/app/public/favicon.svg`, `apps/marketing/public/favicon.svg`.
- `apps/marketing/src/layouts/BaseLayout.astro` — `<meta theme-color>` → `#1F315C`.
- `packages/ui/src/assets/brand/README.md` — asset table + prose updated.

The in-app entry surfaces (`auth-chrome` `AuthBrandAnchor`, `_entry-layout`,
`entry-brand-lockup`) consume the `BrandMark` component / `brand-favicon*.svg` assets, so
they pick up the new mark with no further change.

## Verify

`tsgo` ui + app clean; `vp run @duedatehq/app#build` clean; `#1f315c` confirmed in the built
CSS bundle; no old `187×36 / x27` geometry left in source. Rendered the framed + frameless
forms at 96/48/32/16 px — bars stay centered and legible, the tilt survives to 16px.

## Open / flagged (not changed — needs a call)

- **Marketing nav mark** (`TopNav.astro`) uses a _different_ inline mark — vertical ascending
  bars in `--m-ink`/`--m-accent`, not the stacked-bars silhouette. Left as-is (marketing-owned,
  themed with `--m-*`). To fully unify the product, it should switch to this same tilted-bar
  mark — flagged for a decision.
- **`brand-ink-deep` `#071A2E`** (dark-tile / pressed app-icon) kept as-is; if the new navy
  should drive a matching deeper stop, retune separately.
- Raster OG images (`apps/marketing/public/og/`) regenerate from `brand-mark.svg` via the
  marketing build pipeline — re-export if they bake the mark in.
