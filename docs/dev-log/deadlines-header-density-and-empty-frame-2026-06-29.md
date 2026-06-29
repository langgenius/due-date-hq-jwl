# /deadlines header density (StatBand → compact strip) + frameless empty state

**Date:** 2026-06-29
**Files:**

- `apps/app/src/routes/obligations.tsx` (header summary zone; empty-state opt-in)
- `apps/app/src/components/patterns/empty-state.tsx` (new `frameless` prop)

## Why

Yuqi: _"the deadline page is quite wasteful of space."_ Measured at 1280×720: **426px (59%
of the fold) was chrome before the first row** — only 6 rows visible. The biggest offender was the
shared **StatBand** (`border-y py-7` ≈ 110px of 5 tall tiles) that simply restated the urgency lanes'
own breakdown — the number "12 overdue" appeared three times (banner + StatBand tile + lane header)
before any data.

Separately: _"when empty, can we avoid the background and border?"_ — the table's empty state
(`ObligationQueueEmptyState` → `EmptyState variant="prominent"`) drew its own card frame while sitting
INSIDE the already-bordered table cell — a box-in-a-box (the "no frames in frames" smell).

## What changed

- **StatBand → compact clickable stat strip (this surface only).** Replaced the tall band with a
  one-line strip — `28 Total tracked · 12 Overdue · 0 Due this week · 10 In review · 6 Filed`
  (~24px). Each segment is a button firing the same scope filter the StatBand cell did; "Overdue"
  tints red via a new `valueClass` on its cell when > 0. The editorial one-liner + the strip are now
  one tight zone (one `gap`, not two). The shared `StatBand` is untouched and still used on
  /clients · /rules/sources · /rules/library · /alerts/history. Net ≈ 85–100px reclaimed → ~2–3 more
  rows above the fold; the triple-printed count is down to the strip + lane header.
- **`EmptyState` gained a `frameless` prop.** Drops the border + fill while keeping the variant's
  sizing / icon / copy — for an empty state that lives inside an already-bordered host (table cell,
  drawer body). Frame classes were separated from spacing classes so layout survives. The deadlines
  empty state opts in, so both the filtered ("No deadlines match these filters") and genuinely-empty
  ("No deadlines yet") states now rest cleanly on the table surface.

## Verification

Live-verified: strip renders with the red Overdue, segment clicks set the scope filter
(`?status=…` etc.); empty state shows `border-width: 0` + transparent background. `tsgo` clean.
