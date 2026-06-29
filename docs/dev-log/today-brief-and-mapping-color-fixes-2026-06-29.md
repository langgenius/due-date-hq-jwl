# /today Daily Brief cleanup, mapping color/label fixes, onboarding field regression fix

**Date:** 2026-06-29
**Files:**

- `apps/app/src/routes/onboarding.tsx`
- `apps/app/src/features/dashboard/daily-brief-card.tsx`
- `apps/app/src/features/migration/Step2Mapping.tsx`

## Why

Live QA (Yuqi) on `/today` + the import wizard, plus a regression caught while
verifying the side-by-side practice step in the live preview.

## What changed

### Onboarding practice step — fix invisible fields (regression)

The earlier side-by-side restructure left the Monitoring date / offset / Time
zone field rows **stuck at opacity ~0** — the `FIELD_COLUMN_VARIANTS` stagger
(no `hidden` state defined) left children in their hidden state inside the new
grid. Set `initial={false}` so fields render at the shown state immediately and
can never be gated invisible by the mount animation. Verified live (all fields
opacity 1).

### `/today` Daily Brief

- **Hierarchy:** the "Daily Brief" title (`text-sm font-semibold`) competed with
  the `text-base` headline below it. Title → a quiet uppercase eyebrow
  (`text-xs font-semibold uppercase tracking-wide text-text-tertiary`) so the
  headline reads as the content.
- **Generating gradient removed:** dropped the blurred cyan→violet→warm aurora
  glow behind the card while generating — it read as dated/flashy. The skeleton
  carries the loading state now.

### Import wizard Match-columns colors/labels (`Step2Mapping`)

- Skipped rows no longer get the warm-yellow "needs attention" wash — that
  flagged an intentional skip as a problem; they're a calm neutral gray now.
- "Matched by name" badge `warning` (amber) → `secondary` (neutral) — it's
  informational, not a warning. (Also reworded from "Name match — review".)
- Ignored field cell reads "Not imported"; mapped field value is normal text
  (was `font-mono`, read as code). Status badge "Ignored" → "Skipped".

## Notes

`tsgo --noEmit` clean for `apps/app`. Daily Brief + onboarding verified in the
live preview. Wizard Match-columns harmonizing pass continues next (stepper
active state, Re-run AI placement, Import-template pill).
