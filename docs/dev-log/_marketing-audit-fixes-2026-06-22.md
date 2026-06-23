# Marketing — technical-audit fixes (a11y / perf / responsive)

**Date:** 2026-06-22
**Scope:** the P2/P3 findings from the `/audit` pass (15/20 → tightening the weak
dimensions). All fixes use existing `--m-*` tokens (no new colours).

## Fixed

- **A11y — Notice tablist** (`Notice.astro`): upgraded from a partial pattern to a
  full WAI tablist — `id` + `aria-controls` on tabs, `id` + `aria-labelledby` on
  panels, roving `tabindex` (active 0 / rest -1), and ←/→/↑/↓/Home/End keyboard
  navigation (activate + move focus).
- **A11y — Hero mock semantics** (`Hero.astro`): the decorative jurisdiction-filter
  chips are non-interactive `<span>`s; dropped the misleading `role="group"` +
  `aria-label` and marked the strip `aria-hidden` so it isn't announced as an
  interactive control.
- **Perf — Sources scan wave** (`Sources.astro`): replaced 51 per-tile infinite
  animations of `background` + `box-shadow` (paint every frame) with a single
  `.ust::after` cyan overlay animating **opacity** (GPU-composited). Same cyan
  ripple, ~51× cheaper; `.ust__c` gets `z-index:1` so the state code stays crisp.
  Reduced-motion now disables `.ust::after`.
- **Responsive — footer touch targets** (`Footer.astro`): footer links + locale
  switcher get `min-height: 44px` (flex-centred) at ≤720px; desktop keeps the tight
  6px rhythm.

## Kept intentionally

- **Nav collapse animates layout props** (`TopNav.astro`, P2): left as-is — the
  morph is the smooth collapse the owner specifically asked for, runs once per
  scroll-threshold cross on one small sticky element, and a transform-only rewrite
  would lose the effect. Negligible real cost.
- **No dark mode** (light-only by design) and the desktop-only ScrollRail a11y —
  documented decisions, not defects.

## Verified

Build 76 pages clean. Live: 51 navy tiles + cyan opacity-overlay scan; Notice tab0
`aria-controls=npanel-0` / panel `aria-labelledby=ntab-0` / roving tabindex; footer
links 44px tall at 390px; no horizontal overflow at 1440 or 390.
