# Marketing — GSAP scroll motion (reveal + Surfaces horizontal pin)

**Date:** 2026-06-22
**Scope:** `apps/marketing` home + `/how-it-works`

## Why

Owner asked to "加 GSAP" — add scroll motion to the landing: sections that reveal
on scroll, and a **horizontal** Surfaces section. Built as pure progressive
enhancement so the no-JS and reduced-motion experiences stay fully intact.

## What

New dependency: `gsap@3.15.0` (added to the workspace catalog).

### 1 · Scroll-reveal

- `marketing.css`: `.m-js [data-reveal] { opacity:0; translateY(18px) }` — the
  pre-reveal hidden state applies **only** when JS is on. A
  `@media (prefers-reduced-motion: reduce)` override keeps everything visible.
- `BaseLayout.astro`: an `is:inline` head script adds `.m-js` to `<html>` **before
  first paint**, so no-JS visitors never see a flash of hidden-then-shown content.
- `data-reveal` added to 9 sections: Villain, HowItWorks, Notice, Sources, Compare,
  Security, Faq, Close (home) + SeeItWork (`/how-it-works`). Hero is excluded
  (above the fold). Surfaces is excluded (it gets the horizontal pin instead).
- `ScrollMotion.astro` (new): GSAP `ScrollTrigger` reveals each `[data-reveal]`
  (`start: 'top 82%', once`) with a fade + rise. Wrapped in try/catch with a
  `showAll()` fallback — a motion failure can never leave content hidden.

### 2 · Surfaces horizontal rail

- `Surfaces.astro`: the 4-card grid became a horizontal flex **track**
  (`overflow-x: auto` + scroll-snap, cards `width: clamp(280px, 74vw, 384px)`).
  Without JS / on touch this is a swipeable rail. `data-surfaces` /
  `data-surfaces-track` hooks added.
- `ScrollMotion.astro`: on `min-width: 1000px` (via `ScrollTrigger.matchMedia`),
  pins the section and scrubs the track horizontally as you scroll. The section is
  clipped (`overflow: hidden`) so the off-screen cards don't cause page overflow;
  the native rail overflow is disabled while GSAP drives the transform. Cleaned up
  on media-query exit.
- `ScrollMotion` included on home + `/how-it-works` (EN + zh).

## Verified (headless)

Headless preview can't drive scroll, so the **motion itself** is for live review.
What was verified structurally:

- `.m-js` set; hero fully visible; the 8 reveal sections start at opacity 0 with
  their content intact (DOM present) — gating works, no FOUC path.
- No console errors; GSAP bundled locally (no CDN).
- Surfaces: 4 cards in a horizontal row (384px each), section overflow clipped,
  **no horizontal page overflow** (docScrollW 1425 ≤ 1440), pin-spacer present
  (pin initialized).
- `pnpm --dir apps/marketing build` → 76 pages, clean.

## Live-review checklist (owner)

- Sections fade + rise as they scroll into view (and respect reduced-motion).
- Surfaces: on desktop the section pins and the four cards slide across as you
  scroll; on mobile it's a swipe rail.
