# Marketing home — readability/a11y audit fixes (2026-06-26)

Yuqi: "design critique and audit, ensure people read the website content and landing page
is functioning." Ran a two-track audit (link/route integrity + readability) over the home
+ core pages. Site is **functioning** — 191 routes resolve, every nav/footer/home link valid,
every interaction wired (verified live: Notice tabs, Surfaces juris tabs, FAQ, CTAs → app
login). Readability was mostly solid (the `--m-*` tokens already had an a11y pass), with a
cluster of sub-AA small labels that got the `-ink` swap in Sources but never reached
Hero/Notice. Fixed the real ones (measured live, before → after):

## Contrast / size (verified live against the rendered colours)

- **Hero `.row__delta--later`** (green "+202 days later", 11px on green tint): `--m-ok`
  green-600 ~4.4:1 → **`--m-ok-ink`** → 6.6:1.
- **Notice `.arow__status--ok`** (green "ELIGIBLE", 10px) → `--m-ok-ink` (6.6:1);
  **`.arow__status--warn`** ("REVIEW", 10px) → `--m-urgent-ink` (8.7:1);
  **`.field__delta`** (green, 11px) → `--m-ok-ink`. These are the same labels Sources
  already swept; Hero/Notice were missed.
- **Notice `.field__more`** ("+ 9 more…", 12px): `--m-faint` (~4.5:1, the floor) →
  **`--m-muted`** (5.3:1) — small + faint was stacking two weaknesses.
- **Villain `.vcap__sub`** (the 3 answer sentences on the dark navy band, 14px): white
  `0.6` (~4.85:1, right at AA) → **`0.7`** (~6:1). **`.villain__painline`** (the hook
  sentence): `0.66` → **`0.72`**.
- **Sources `.feed-row__body`** (real "verified, no change" sentences): 12px → **13px**
  (`--m-text-sm`) — was the smallest readable content in the section.

## Line length (snap to the house measure)

- **Sources `.sources__lead`** and **Compare `.compare__foot`**: `max-width: 72ch` →
  **`var(--m-measure)`** (68ch). Both ran past the 60–75ch comfort ceiling.

## Verified
Build 191 pages clean. Live re-measure confirms every changed label now clears WCAG AA at
its rendered size; feed body 13px; dark-band sub-line ~6:1.

## Flagged, not fixed here
- **One dead link:** the footer language toggle on `/404` derives `/zh-CN/404`, which has
  no route (no `src/pages/zh-CN/404.astro`). The only broken internal link in 191 pages.
  Spun off as a background task.
- P3 nits (noted, not fixed): Surfaces legend says "See in the tour" 3× (could predict its
  destination); a couple of 80ch limit-copy measures on the state pages; an authored-but-
  unused `legendPartial` explainer string in Compare.
