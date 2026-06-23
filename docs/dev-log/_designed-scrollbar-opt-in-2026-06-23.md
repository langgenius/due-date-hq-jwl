# Opt-in designed scrollbar — /today Priorities

**Date:** 2026-06-23
**Surface:** `apps/app/src/styles/globals.css`,
`apps/app/src/features/dashboard/merged-brief-card.tsx`

Scrollbars are **hidden globally** (Yuqi, 2026-05-26 — dense scroll regions read
as clean unframed surfaces). But the `/today` **Priorities** list scrolls its
body internally inside the dashboard's bounded frame (`xl:overflow-y-auto`), and
with no visible scrollbar there's no cue that more rows exist below. Yuqi: "add a
designed scroll bar on the right."

## What changed

- **New opt-in utility `.scrollbar-designed`** (globals.css) that re-shows the
  scrollbar over the global hide. Reuses the existing flat **2px-radius,
  tertiary** thumb tokens (`color-mix(text-tertiary 32% / 56% hover)`); a thin
  thumb floats in a transparent 10px gutter via a 3px transparent border +
  `background-clip: padding-box`, so it reads as a quiet workbench detail, not a
  web-app default. Firefox gets `scrollbar-width: thin` +
  `scrollbar-color: <thumb> transparent`.
- **Applied it to the Priorities scroll container** in `merged-brief-card.tsx`.
  Covers both axes, so the horizontal overflow on narrow widths gets the same
  treatment as the vertical (right-side) scroll on xl.

The global hide stays the default; this is a sanctioned per-region exception
where a scroll affordance genuinely helps. Other regions can opt in the same way.

## Verified

- tsgo + build clean.
- Live (1648×812, the reported viewport): `.scrollbar-designed` applied,
  `overflow-y: auto`, body overflows (scrollHeight 322 > clientHeight 265), and
  a visible classic scrollbar occupies the right gutter (offsetWidth − clientWidth
  ≈ 11px). Firefox `scrollbar-width: thin` confirmed.
