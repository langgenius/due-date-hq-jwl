# Brand wordmark component + cleaner mark geometry

**Date:** 2026-06-26 · Supplied by Yuqi (`logo-svg.svg` mark + `wordmark.svg` lockup).
Follows [the mark refresh](./_brand-mark-refresh-2026-06-26.md).

Centralized the logo + wordmark into reusable, token-driven components so the art
swaps in one place.

## Components (the single source for in-app rendering)

- **`BrandMark`** (`components/primitives/brand-mark.tsx`) — the icon. Updated to the
  cleaner re-export: bars `74×12 rx3.5` at y 0 / 17 / 51, third tilted from
  `x10.4111 y35.6758`, in an `85×65` box (supersedes the 170×129 export — same layout,
  thinner bars, now matched to the wordmark's bars). Framed-tile fit recomputed:
  `translate(8 13.65) scale(0.5647)`.
- **`BrandWordmark`** (`components/primitives/brand-wordmark.tsx`) — NEW. The full
  horizontal lockup (bars + "DueDateHQ" drawn as outlined letterforms, `viewBox 592×77`).
  Replaces the old mark + serif-**font** composition, so the wordmark no longer depends on
  a loaded font. **Color = `currentColor`** (default `text-brand-ink` navy; pass
  `text-brand-ivory`/`text-white` on dark) — one knob, theme-aware, no light/dark asset pair.

## Consumers routed through the components

- `AuthBrandAnchor` (auth-chrome) → renders `BrandWordmark` (+ the optional "for CPA firms"
  tagline). Dropped the inline `BrandMark` + serif `DueDate`/`HQ` spans. `frame` prop kept
  but deprecated/ignored (the lockup has no square); `markClassName` now sizes the lockup.
  Used by login / splash / 2FA / accept-invite / error.
- `_entry-layout` shell header → `BrandWordmark` (replaced the two favicon `<img>` variants +
  serif spans; theme via `dark:text-brand-ivory`).

## Assets (single source for favicon / OG / email)

- New geometry in: `brand-mark.svg` (256), `brand-favicon.svg` (32), `brand-favicon-dark.svg`
  (32), `apps/app/public/favicon.svg`, `apps/marketing/public/favicon.svg`.
- NEW `packages/ui/src/assets/brand/brand-wordmark.svg` — the standalone lockup (`#1F315C`).
- README: added the wordmark row + the "two components" + geometry notes.

## Verify

`tsgo` app clean; `vp run @duedatehq/app#build` clean; no dangling imports. **Live on
`/splash`**: renders the `592×77` drawn lockup, `fill=currentColor`, the legacy serif
wordmark gone, navy on the light surface, zero console errors. (UI accent navy `#22488C`
on the "Go to Today" button is untouched — brand-navy scoping held.)

## Still open (unchanged — flagged)

- Marketing `TopNav.astro` still renders its own inline mark (vertical bars, `--m-*`) and a
  text wordmark — not yet switched to `BrandMark`/`BrandWordmark`. Unify on request.
- Raster OG PNGs re-export from `brand-wordmark.svg` / `brand-mark.svg` via the marketing build.
