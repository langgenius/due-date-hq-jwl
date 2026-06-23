# Marketing — critique P2/P3 fixes + Close payoff

**Date:** 2026-06-22. From the full-site critique (33/40): knocked out every P2/P3

- strengthened the Close to resolve the hero's question. All `--m-*` tokens.

## Fixed

- **Surfaces "wasteful" feed (P2)** — rebuilt the bench grid from a 3-row layout
  where the alert feed spanned two rows (forced tall + empty) into a clean **2×2
  quadrant** (Alert feed | Coverage; Worklist | Apply&audit). Re-drew the list seam
  as a vertical border. The feed now matches just the map row, not map+worklist.
- **`<title>` ↔ H1 mismatch (P2)** — both home titles rewritten to the question
  framing ("…a tax deadline just moved. Do you know who it hits?" / zh mirror) so
  the `<title>`, JSON-LD-adjacent meta, and the visible H1 agree.
- **zh heading emphasis (P3)** — the `.ital` accent (faux-italic killed for CJK) now
  carries emphasis via **accent colour** on light bands, with an override keeping it
  white on the dark Villain/Close bands (no coloured text on dark).
- **Map cyan dots (P3)** — removed the 51 per-tile cyan "live" dots + their breath
  animation; the single "live" cue now lives in the legend. The map reads as a calm
  coverage grid.
- **Skip-to-content link (P3, a11y)** — added an off-screen-until-focus `.m-skip`
  link in BaseLayout (localized) + an inline script tagging `<main id="main-content"
tabindex="-1">` site-wide.

## Strengthened (creative)

- **Close finale** — now explicitly resolves the new question hero. H2:
  "Next time a deadline moves, you'll already **know.**" (serif bookend); body lands
  the relief: "…the moment a date moves you see exactly who it hits. **No more finding
  out from your client.**" EN + zh.

## Verified

Build 76 pages clean. Live: Surfaces 2×2 balanced; Close payoff renders; map dots
gone (51 clean tiles); skip-link present + main tagged; title matches H1; no overflow.
