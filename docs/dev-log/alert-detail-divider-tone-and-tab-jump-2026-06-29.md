# Alert detail: uniform grid hairlines + smooth tab switch

**Date:** 2026-06-29
**Files:** `apps/app/src/features/alerts/components/AlertStructuredFields.tsx`,
`apps/app/src/features/alerts/AlertDetailDrawer.tsx`

## 1. Grid hairlines were two different shades

`--divider-subtle` is a TRANSLUCENT ink (`rgb(16 24 40 / 0.04)` — 4% black). The fact grids draw their
inner hairlines by letting that bg show through 1px `gap-px` gaps over white cells (= 4% gray). But the
padding-fix added a `border-y` (Change grid) / `border-t` (Source grid) for the top/bottom edges — and a
border paints ON TOP of the grid's own `bg-divider-subtle`, so 4% + 4% stacked to ~8% → the edge lines
came out visibly darker than the inner ones (Yuqi: "why are the lines … different colour").

Fix: dropped the borders; the outer edges now come from `py-px` / `pt-px` (the same bg-bleed as the
inner hairlines), so every line is one uniform shade.

## 2. Tab switch jumped

In panel/tab mode, switching tabs fired `scrollIntoView({ block: 'start' })` — INSTANT (no smooth) and
UNCONDITIONAL, so even at the top it hard-yanked the hero off-screen to pin the panel under the sticky
nav (Yuqi: "the switch of tab … is jumping").

Fix: the realign now only fires when `heroScrolled` (you're already down in the content); at the top,
switching tabs just swaps the panel in place — hero stays, no jump. And the scroll is `behavior:
'smooth'`, matching scroll-spy mode.

## Verification

`tsgo` clean. Live screenshot blocked (folder at its 5 dev-server limit from other chats); changes are
a CSS-class swap + an effect guard, verified by code.
