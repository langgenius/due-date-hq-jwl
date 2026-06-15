# Alerts list — aUZTy row treatments (wand action, confidence pill, unread dot)

_2026-06-15_

Three row-level treatments from Pencil aUZTy, on Yuqi's direction.

## 1. Suggested action → subtle wand pill

The "↳ ACTION Re-issue revised form" elbow + small-caps label is replaced by a
single accent **wand pill** (`WandSparklesIcon` + verb) on a light
`bg-state-accent-hover` tint. Reads as "the next step" in accent without
shouting — Yuqi: "subtle blue wand pill … not too accent heavy."

## 2. Confidence → categorical pill (low-only)

The always-on "N% confidence" bar meter in the bottom meta is gone. Confidence
now surfaces as a head-row warning pill ONLY when shaky:
- `medium` tier → "Low confidence"
- `low` tier → "Very low confidence"
- `high` tier → nothing (the absence is the all-clear)

Amber-family (`text-warning` on `bg-state-warning-hover`), never red — the row's
single red stays on the urgent deadline pill. On the demo data this matches
aUZTy exactly: 90/94/100% show no pill, 58% → Low, 46% → Very low.

## 3. Unread dot leads the time rail

A small accent dot (`bg-state-accent-solid`) leads the existing time rail while
the alert is unhandled (`status` matched / partially_applied). It reserves its
slot when read so times stay aligned; handled alerts (history) lose it.

## Cleanup

Removed the bar-meter plumbing (`confidencePct`, `confirmingSources`) and the
source-corroboration tooltip from the row (still in the detail). Added
`CircleAlertIcon` / `WandSparklesIcon` imports.

## Verified

Live at 1512×: dots lead the rail; Low/Very-low pills on the 58%/46% rows, none
on high-confidence rows; wand pills on every suggested action. tsgo + vp check
clean; lingui --strict 0 missing ("Very low confidence" translated to zh-CN).
