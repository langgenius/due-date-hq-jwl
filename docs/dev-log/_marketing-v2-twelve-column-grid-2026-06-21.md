# Marketing v2 — put the landing page on a real 12-column grid

**Date:** 2026-06-21 · `docs/marketing/design-explorations/production-v2.html` only. (`/layout-grid` audit → critique → polish.)

## Audit / critique

There _was_ a shared container (`.wrap`, `--maxw: 1140`, `--gutter` margins) and two sections already landed on a 12-col rhythm (trust band `repeat(3)` = 4+4+4; surfaces grid `repeat(4)` = 3+3+3+3). But there was **no actual column grid**:

- **The hero broke the container** — `.hero` carried a bespoke `max-width: 1240px` (it's `class="hero wrap"`, so its own max-width overrode `.wrap`'s 1140). Its edges lined up with nothing below it.
- **Two-column sections used arbitrary fractions**, not grid spans: hero `0.96/1.04`, villain `0.82/1.18`, sources `1/0.92`, surfaces-head `1.5/1`, security `0.9/1.1`. No two sections shared a vertical column line.
- **Inter-column gutters varied** section to section (84 / 76 / 72 / 44…), so even where ratios were close the split points wandered.

## Polish — one shared 12-column grid

- New token **`--col-gap: clamp(20px, 2.4vw, 32px)`** — the single gutter every section's columns use.
- **Unified the container** — removed the hero's `max-width: 1240`; it now inherits `.wrap`'s 1140 like everything else, so the nav, hero, and every section share one set of margins.
- **Converted the five page-level multi-column sections to `grid-template-columns: repeat(12, minmax(0,1fr))` + `column-gap: var(--col-gap)`**, with clean integer spans via `> :nth-child(n)`:
  - hero **6 / 6** (copy | alerts panel)
  - villain **5 / 7** (headline | prose)
  - sources **6 / 6** (coverage map | monitoring feed)
  - surfaces-head **7 / 5** (title block | intro)
  - security **5 / 7** (copy | 2×2 cluster)
- Kept each section's existing `gap` as the **row-gap** (mobile vertical rhythm) and let `column-gap` override the horizontal — so mobile spacing is untouched.

### Verified

A 12-col overlay + DOM measurement confirm alignment: every converted section's content now **starts at x=127 and ends at x=1139** with a uniform ~31px gutter — hero copy and villain headline share column 1; hero panel and villain prose share column 12. Same grid, top to bottom.

### Mobile gotcha (caught + fixed)

First attempt at the ≤1000px stack reset used `.grid > *` (specificity 0,1,0) — **weaker** than the desktop span rules `.grid > :nth-child(1)` (0,2,0), so the spans weren't cleared and the children spawned phantom implicit columns (grids measured 6–7 cols on a phone). Fixed by matching specificity with `.grid > :nth-child(n)` (also 0,2,0; wins by media-query source order). All five grids now measure `cols=1` with full-width children at 390px.

## Deliberately left off the 12-col conversion (with reasons)

- **Notice / `.extract`** — it's a connected _diagram_ (`gap: 0`, a fixed 108px beam whose dashed line bridges the document and the extracted fields). Forcing column-gaps there would visually sever the beam. Left intentional.
- **Footer `.footer__top`** — terminal section; keeps its `1.5fr repeat(3,1fr)` ratio (reads fine, low alignment stakes).
- **Trust band / surfaces grid** — already 12-col-aligned (4+4+4 and 3+3+3+3).

## Noticed, not changed (out of scope)

The security section still has a **"No password to leak — Sign in with Google"** item, which sits oddly against the earlier decision to drop the "Start free with Google" line from the hero. Flagging rather than silently editing copy during a layout pass — worth a separate look.
