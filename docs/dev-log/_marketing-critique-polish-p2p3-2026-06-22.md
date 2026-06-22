# Marketing — critique polish (P2/P3)

**Date:** 2026-06-22
**Scope:** the P2/P3 list from `docs/marketing/design-critique-2026-06-22.md` §6.
Multi-agent workflow, one agent per cluster (distinct files), verified + committed
by the main loop.

## Changes

- **Hero** (`Hero.astro`) — calmed the over-dense alert panel: filter rail 7→5 chips;
  the urgent row is now the single anchor (`row--anchor`), the two info rows recede
  (`row--secondary`: lighter title, no per-row status line); sub-lead measure 46→53ch;
  removed the dead no-op `row__delta` ternary.
- **Villain ↔ Close** (`Villain.astro`, `Close.astro`) — pushed the two navy moments
  apart: Villain is now a **deeper** navy (`color-mix(accent-strong, ink)` + a soft
  edge vignette) reading as the somber problem beat (~rgb(31,40,98)); Close leans
  **brighter** (cyan top-edge 2→3px + glow, corner-light 16→24%, serif 68→74px) as the
  triumphant finale (brand navy rgb(46,54,140)). Both static (reduced-motion-safe),
  white-only text.
- **Notice** (`Notice.astro`) — the example-type panel swap gets a short fade+rise
  (`notice-swap-in`, `--m-dur`/`--m-ease`, gated by reduced-motion) instead of the
  `display:none` snap; tab transitions routed through the motion tokens.
- **Footer** (`Footer.astro`) — dropped the duplicate `/state-coverage` (Resources slot
  → an evidence-backed guide link); the wordmark is now a locale-aware home `<a>` (a
  home affordance once the top nav scrolls away on mobile).
- **Copy** (`i18n/en.ts` + `zh-CN.ts`) — pricing reframed to one coherent frame
  ("Free during the beta. Honest tiers after launch." — tier numbers kept, labelled
  post-launch); container noun standardized on "workbench" (retired console/intelligence
  workbench); stray English localized in zh long-tail prose. Legacy hero/problem/workflow
  blocks deliberately KEPT (required by the `LandingCopy` contract + rendered by
  `/legacy`).
- **Pricing** (`Pricing.astro`) — de-templatized the recommended plan (asymmetric
  emphasis, not just a ribbon-on-equal-grid) and bumped the price so it out-weights the
  plan name.
- **a11y** (`marketing.css`, `Sources.astro`, `ScrollMotion.astro`) — darker green
  on-tint INK for the status-pill text (AA); a one-time post-load reveal sweep so a
  deep-linked / short-viewport `[data-reveal]` already in view never sticks at opacity 0.

## Verified
`pnpm --dir apps/marketing build` → 76 pages clean. Live: Hero panel calmer (5 chips,
anchor + receding rows), Villain deeper navy vs Close brand navy, no horizontal overflow.
Motion (Notice fade, reveal sweep) still wants a real-browser glance (headless can't
advance transitions).

## State
Critique baseline was 2.5/4; P0/P1 (prior commit) + this P2/P3 pass close essentially
the whole report's fix list. Remaining deferred items are intentional (e.g. uniform
eyebrows kept for coherence; `--m-canvas`/`--m-section` luminance left to hairlines).
