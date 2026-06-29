# /deadlines editorial one-liner → thin banner (anchors the dismiss ✕)

**Date:** 2026-06-29
**Files:** `apps/app/src/routes/obligations.tsx`

## Why

Yuqi: the at-a-glance line "should be in a long thin banner?" — as naked text, the dismiss ✕ (pushed
right by the sentence's `flex-1`) floated far from a short read like "Nothing overdue — the week is on
track", stranded in dead space.

## What changed

Wrapped the editorial one-liner in a thin full-width banner (`rounded-xl border border-divider-subtle
bg-background-section px-3.5 py-2`), matching the app's banner pattern. The ✕ now anchors to the
banner's right edge — reads as "dismiss this banner" in both the busy ("12 overdue…") and quiet
("Nothing overdue…") states. The compact stat strip stays a separate line below.

## Verification

Live-verified; tsgo clean.
