---
title: 'Mute lateness on filed/paid/completed rows — quality stat, not live debt'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: obligations
---

# Lateness as a quality stat on closed rows (critique P0)

## Why

Critique P0 #3: Riverbend Draft Client's row in the Deadlines table
read "**18 days late**" in red next to a green **Completed** status
pill. Same row also surfaced on the Today actions list with the same
loud "18d late" treatment. Two surfaces telling the user something is
on fire about a row that's already closed.

`DueDaysPill` and the dashboard `RowMeta` both rendered red urgency
when `daysUntilDue < 0`, regardless of whether the row was still
open. That's correct for _active_ rows: a Form 1040 with status
`review` and 18 days past internal due IS a debt — work to do.
But once the row is `done` / `paid` / `completed`, the work is
done; how late it was filed is a historical quality stat, not a
live deadline.

Per anti-pattern #3 in the canonical product model ("Filed ≠ Done"):
the system has to keep `filed` distinct from `completed` _and_ keep
red urgency distinct from quality reporting. Red on a closed row
collapses both axes.

## What changed

### `apps/app/src/routes/obligations.tsx` — `DueDaysPill`

Now takes a `status` prop and short-circuits to a muted rendering
when `status` ∈ `{ done, paid, completed }` (mirrors the three
statuses that
`features/obligations/status-control.tsx` already displays as
"Filed" / "Completed"):

- `days < 0` → `"Filed N days late"` (muted gray, no urgency dot)
- `days > 0` → `"Filed N days early"` (same muted treatment)
- `days === 0` → `"—"` (landed exactly on the deadline; nothing
  interesting to say)

Open-status rows keep the existing red-tone badge + dot exactly as
before. Call site at `cell:` in the `daysUntilDue` column passes
`tableRow.original.status`.

### `apps/app/src/features/dashboard/actions-list.tsx` — `RowMeta`

Same guard, defensive. The dashboard top-rows query typically
filters terminal states out of the action list — but optimistic
updates and any future server-side widening shouldn't be able to
land a "Completed" row in the list with a screaming "18d late"
right after. Terminal rows render as `"filed Nd late"` in
`text-text-tertiary` instead.

### Why a set of statuses instead of one boolean

Today the contract still has `done`, `paid`, `completed` as
distinct enum members and `status-control.tsx` knows which display
as "Filed". Encoding the same set in two places (here and in
status-control) is the explicit minor cost — but a single helper
`isTerminalObligationStatus` could absorb both later when the v2
status taxonomy migration lands (memory:
`project_status_taxonomy.md`). For now: a small `ReadonlySet` in
each file with a comment pointing at the source of truth.

## How to verify

`/obligations` with the demo seed (`?mockPulse=0`):

- **Bright Studio S-Corp** (status=`done`, Filed) → `Filed 69 days late`
  in muted gray.
- **Northstar Dental Group** (status=`done`, Filed) → `Filed 69 days late`
  in muted gray.
- **Lakeview Medical Partners** (status=`done`, Filed) → `Filed 69
days late` in muted gray. Before this change: red `● 69 days late`.
- **Riverbend Draft Client** (status=`completed`) → `Filed 18 days
late` in muted gray. Before this change: red `● 18 days late`
  alongside a green Completed pill.
- **Cascade Florist** (status=`review`, In review) → red `● 25 days
late` — unchanged.

## Out of scope

- Sorting on a muted "Filed N days late" stat. The column still
  sorts by `daysUntilDue` numerically so closed rows still sit
  together at the late end of the sort — fine for now.
- Re-naming "filed Nd late" / "filed Nd early" once the v2 status
  taxonomy migration lands. The migration map keeps `done` →
  `filed` and stretches `completed`'s meaning to "acceptance
  landed" — at that point the copy on `paid` rows might want to
  read "paid" instead of "filed". Defer until the migration
  starts.

## Files touched

- M `apps/app/src/routes/obligations.tsx`
- M `apps/app/src/features/dashboard/actions-list.tsx`
