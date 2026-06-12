# 2026-06-12 — /today Priorities header: fix the title→lede spacing

## Problem

Yuqi /today #6: "because the right-side toggle between this week / this month /
overdue has a higher height than the title, the spacing between the Priorities
title and the body text is weird — too much. Do your math."

Measured: the bucket-toggle pill group is **32px** tall; the "Priorities" title
is **23px**. They shared one `items-center` flex row, so the title centered
inside the 32px row (≈5px slack below it), then the section `gap-3` (12px)
stacked on top → a **17px** title→lede gap, while the title→row-top gap was only
5px. Lopsided, and the lede drifted away from its own title.

## Fix

`apps/app/src/features/dashboard/merged-brief-card.tsx` — title + lede now form a
tight title/subtitle pair in a left column (`gap-1.5` = 6px); the chip group pins
right and `items-start` aligns it to the **title row**, so it never inflates the
title→lede gap again. Skeleton header restructured to match (no reflow when data
lands).

## Verify

- `npx tsgo --noEmit -p apps/app` — clean.
- Live at 1512×861: title→lede gap **6px** (was 17px); chip group top-aligned to
  the title (both y=477). Screenshot confirms a tight Priorities header.
