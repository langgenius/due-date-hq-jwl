# /deadlines summary strip — less fragmented (drop redundant total + zeros + empty state)

**Date:** 2026-06-29
**Files:** `apps/app/src/routes/obligations.tsx`

## Why

Yuqi (on the strip): _"会不会还是太零碎了"_ (isn't it still too fragmented?), shown on an empty/loading
state rendering `0 Total tracked · 0 Overdue · 0 Due this week · 0 In review · 0 Filed`. Two problems:
the all-zeros state was pure noise, and five dot-separated segments — one redundant ("Total tracked"
is already the title pill "Deadlines · N") and one zero ("Due this week 0") — read as scattered bits.

## What changed

- **Trimmed to the actionable states.** `summaryStripCells` drops the `tracked` cell (in the title
  already) and any zero-value segment, so the line tightens from five pieces to
  `12 Overdue · 10 In review · 6 Filed`.
- **Hidden when empty.** The strip only renders when `scopeTotal > 0`, so the empty workspace and the
  brief pre-load flash no longer show `0 · 0 · 0 …` (the editorial banner + empty-table state cover
  the zero case).

The remaining segments keep their click-to-filter shortcuts.

## Verification

Live-verified: loaded state shows `12 Overdue · 10 In review · 6 Filed` ("Overdue" red); `tsgo` clean.
