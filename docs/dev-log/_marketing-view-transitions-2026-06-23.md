# Marketing — cross-page View Transitions (smooth navigation)

**Date:** 2026-06-23. Added Astro `<ClientRouter />` so page-to-page navigation
animates smoothly instead of a hard reload. The work was making every bespoke script
survive a client-side swap.

## What changed

- **BaseLayout**: `<ClientRouter />` in `<head>`; the `<main>` skip-link tagging moved
  to an `astro:page-load` handler so the swapped-in page gets re-tagged.
- **marketing.css**: `::view-transition-old/new(root)` — a calm cross-fade with an 8px
  rise on the incoming page, fully disabled under `prefers-reduced-motion`.
- **Script re-init** (the core of the work). Astro bundled scripts run once and do NOT
  re-run on a VT swap, so each was made to re-init on `astro:page-load` and tear its
  global listeners down on `astro:before-swap` (AbortController pattern):
  - `ScrollMotion` (GSAP reveals) — re-runs + `ScrollTrigger.kill()` before swap.
  - `TopNav` ×2 (scroll/dark-collapse + mobile sheet) — AbortController per page-load.
  - `Notice` (tablist) — re-binds per page-load.
  - `ScrollRail` (spy-rail) — AbortController per page-load.
  - `Pricing` (billing toggle) — `DOMContentLoaded` → `astro:page-load` (DOMContentLoaded
    never fires on a swap).
- **Left as-is**: `PreferenceSwitcher` (only on the orphaned, noindex `/legacy` page;
  its window/media listeners aren't cleanup-safe to re-run, and it isn't nav-reachable).

## Verified (live, real click-navigations)

- Home → Pricing → Home all swap client-side (no full reload), nav persists.
- GSAP reveals re-touch all 9 sections on return to home (`_gsap` present) — no leak.
- Pricing billing toggle re-inits and works after the swap.
- Zero console errors across the navigations. Build 76 pages clean.
