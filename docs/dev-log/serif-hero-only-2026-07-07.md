# Instrument Serif → hero-only (site-wide sans pass)

**Date:** 2026-07-07 · marketing design direction (Yuqi)

Direction from Yuqi: **reduce the serif.** Instrument Serif (`--m-font-display`)
had crept well past its "hero headline ONLY" intent into ~10 surfaces. Pulled it
back to the two editorial bookends and moved everything else to Instrument Sans.

## Serif kept (only these two)

- `home/Hero.astro` — the home hero H1
- `home/Close.astro` — the home finale

## Converted serif → sans (weight 400 → 600)

- `marketing.css` `.m-page-title` — **every subpage H1** (coverage, pricing,
  rules, states, trust, how-it-works, works-with-your-stack, …)
- `marketing.css` `.m-display-2` — the secondary statement heading (also
  **re-added**: it had been dropped from marketing.css by `ced7d7363`, leaving the
  works-with-your-stack promise + CTA headings unstyled on prod — this restores
  them, as sans)
- `FoundingBanner.astro` — modal title + success title
- `StateCoveragePage.astro`, `StateDetailPage.astro` — page-title overrides
- `TrustPage.astro` — two headings
- `home/Creed.astro`
- `zh-CN/how-it-works.astro`
- `irs-disaster-relief/cpa-response-playbook.astro`

## Notes

- `.m-display-2` is now a **sans** primitive (one tier below `.m-h2`); the token
  `--m-display-2-size` = `clamp(26px, 3.2vw, 40px)` is restored.
- Verified live (dev): `.m-page-title`, `.m-display-2` (promise + CTA), and the
  modal title all compute to `Instrument Sans` / 600; serif remains only on Hero
  - Close. `vp check` clean (0 errors).
