# Marketing home — Agentation feedback pass (16 items)

**Date:** 2026-06-22 · `apps/marketing/src/components/home/*`. Yuqi left 16 element-level comments on `/` via Agentation. Working top-to-bottom by page, my judgment, refine via further Agentation comments. This log tracks the pass; commits are per batch.

## Batch 1 — hero · nav delicacy · compare (commit c736bd75)

- Hero: folded the strong "first sourced deadline in ~10 min" line into the subhead, dropped the faint duplicate (#6); point gap 15→9px (#4); point 4 "no card required" (de-dup).
- Nav visual: clean white floating pill + hairline + micro-shadow (was a murky translucent surface, #9); links are ghost-buttons w/ hover bg + accent-tint active (#3); Sign-in smaller/quieter (#2); whole nav to 13px (delicacy, #1).
- Compare: added an h2 heading + matched section width (was 940px-narrow, headless, #16); table constrained so it doesn't stretch.

## Batch 2 — HowItWorks (commit f2777d33)

- Distinct step icons: Watch=eye, Match=target (was a magnifier, too like Watch, #10), Apply=lightning (#13); clean chevron-over-dashed-line connector, dropped the bordered circle (#11); real ∞ infinity loop icon (#12).

## Batch 3 — nav scroll/dark interactions + spyrail (this commit)

- **Nav scroll:** rAF-throttled scroll handler — solidify (canvas blur + hairline) + slight shrink (70→60px) once scrolled past 24px. CTA always stays reachable (no hide). prefers-reduced-motion respected.
- **Nav-on-dark:** when the nav overlaps a `[data-nav-dark]` band (the villain), it flips white — brand mark/name/links/Sign-in white, pill translucent-white, **CTA inverts to white-pill/navy-text** (accent in the container, no coloured text on dark). Verified static state over the navy band.
- **Spyrail (#5):** renamed "How it works" → "The loop" (the #how section is the watch→match→apply loop; removes the overlap with the nav's "How it works"). Added the same on-dark white-out when the rail sits over the villain.
- IntersectionObserver deliberately avoided (doesn't fire headless); scroll handlers run live in a real browser.

## Remaining (top-to-bottom)

#7,8 Villain redesign (weak + simplify the white levels on dark) · #14 Notice multi-example toggle + product-UI component + drop money/penalty · #15 Sources redesign.
