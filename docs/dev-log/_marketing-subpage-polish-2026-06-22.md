# Marketing — subpage polish pass

**Date:** 2026-06-22. Gave the subpages the landing's bar. Reviewed /how-it-works
(LoopDeep + SurfaceDeep), /pricing, /security, /about + scanned every long-tail
template for design-canon violations and landing inconsistencies.

## Found + fixed
- **SurfaceDeep "Why it matters to a CPA" aside used a banned side-stripe**
  (`border-left: 2px solid var(--m-accent)`). The design canon bans side-stripe
  accents on cards/callouts, and the landing strictly avoids them. Swapped to a
  canon-approved subtle `--m-accent-tint` callout card (radius 8, no border).
  (`home/SurfaceDeep.astro`)

## Checked, clean (no change needed)
- No other `border-left/right > 1px` accents on any live component (the one in
  `HowItWorks` is a functional dashed *connector* line, not a card stripe).
- No gradient text anywhere. No stray hex in the subpage components.
- No graph-paper grids or navy-wall tile fills carried into the subpages.
- /about, /how-it-works, /pricing, /security all render strong + on-brand
  (display-serif heroes, sourced fact tables, statement tint-cards), no overflow.

Build 76 pages clean.
