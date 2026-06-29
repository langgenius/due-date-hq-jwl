# /today Daily Brief text hierarchy + all-clear empty-state cleanup

**Date:** 2026-06-29
**Files:**

- `apps/app/src/features/dashboard/daily-brief-card.tsx`
- `apps/app/src/features/dashboard/merged-brief-card.tsx`

## Why

Yuqi on `/today`: the Daily Brief text hierarchy reads ugly, and the all-clear
empty state has a fluorescent-green cup, an ugly bar-chart, and too many words.

## What changed

### Daily Brief — text hierarchy

- Headline (the AI summary line) `text-base` 400 → **`font-medium`** so it's the
  clear focal point instead of competing with the blue catch-up link.
- Card `gap-1` → `gap-1.5` (+ `py-2.5`→`py-3`): the eyebrow → headline →
  catch-up link were crammed; they now read as three distinct levels.
- (The "DAILY BRIEF" eyebrow label is already small/quiet/uppercase from the
  prior pass; the blue-banner surface was left as-is per Yuqi's revert.)

### All-clear empty state (`merged-brief-card`)

- Cup disc: the loud **lime "celebration" fill** → calm neutral
  (`bg-background-subtle` + navy glyph). ("荧光绿不要")
- Removed the decorative **bar-chart "skyline" SVG** behind the copy. ("bar很丑")
- Trimmed the copy ("All clear — nothing due or late." / "New deadlines appear
  here automatically."). ("字好多")

## Notes

`tsgo --noEmit` clean. Daily Brief eyebrow/spacing visible in the live preview;
the bolded headline + the empty state need the success/empty data states to
verify (not reproducible locally on the seeded firm).
