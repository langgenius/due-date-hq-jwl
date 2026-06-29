# Rule library overview: "Where to start" — flat cards → tiered, colour-cued

**Date:** 2026-06-29
**Files:** `apps/app/src/routes/rules.library.tsx` (`OverviewReviewBreakdown`)

## Why

Yuqi: the Rule library "looks quite flat and plain — use colour, text size, caps text, groupings."
The "Where to start" cards were six identical white boxes, each a single gray sentence
("New York — 19 rules to review · 8 ready"), with the high-severity signal buried in a small amber
pill below. No rank, no anchor, no grouping — the page had no opinion about where to start.

## What changed

`OverviewReviewBreakdown` now renders **two tiers** with caps eyebrows so the page states the order:

- **⚠ REVIEW THESE FIRST · HIGH-SEVERITY** — warning-toned caps eyebrow + the jurisdictions carrying
  high-risk rules.
- **THEN, LONGEST WAITING** — neutral caps eyebrow + the rest (shown only when there's an urgent tier
  above to distinguish from).

Per card: a **bold name anchor** (15/600) instead of the flat sentence; the severity flag promoted to
a strong right-pinned `SeverityChip level="high"` (`⚠ 4 HIGH` — the lone urgency colour, von-Restorff);
and a colour-cued meta line — pending count (anchor) · **ready in accent** ("act now") · wait-age
quiet tertiary. Colour lives in the chips + eyebrow, never a card wash (no-coloured-wash canon).

Edge cases: no high-severity → only the "longest waiting" tier, no eyebrow; all high-severity → only
the urgent tier.

The stat band above is deliberately untouched — it's intentionally restrained (neutral value · coloured
caption) per the app-wide 3-tone budget canon.

## Verification

Live-verified on /rules/library overview: two tiers render with the amber high-severity chips + accent
ready counts; eyebrows read the ordering. `tsgo` clean; no console errors.
