# 2026-06-08 — /deadlines re-add Group-by Urgency

## What

Restored **Urgency** as a Group-by mode on `/deadlines`. Selecting it clusters
rows into **OVERDUE / THIS WEEK / UPCOMING** band headers (collapsible, with a
per-band count, the next due date, and a "N late" badge) — the production
design's banded grouping.

## Why

Per the design-supersedes decision (Yuqi, 2026-06-08), urgency grouping is the
one recently-removed item to bring back. It had been dropped 2026-06-06; this
re-adds it as an explicit override while the rest of that pass stays.

## How (reused existing machinery)

`urgencyBandOf()` + `URGENCY_BAND_ORDER` already existed (kept around after the
removal). Wired `'urgency'` through the existing group plumbing in
`apps/app/src/routes/obligations.tsx`:

- `GROUP_OPTIONS` += `'urgency'` (next to `'due'`; both due-date-derived).
- Ordering: `groupSortKeyOf` keys urgency rows by `URGENCY_BAND_ORDER` index;
  the TanStack `sorting` memo adds a `currentDueDate asc` primary so bands stay
  contiguous under any active sort.
- `groupHeadersByFirstRowId`: band key = `urgencyBandOf(row)`, label =
  Overdue / This week / Upcoming, `kind: 'urgency'`.
- Render: `rowGroupKey` + `isHiddenContinuation` treat urgency like filing
  (collapse hides the band's leaf rows); header late-count tooltip gets an
  urgency phrasing.
- Group-by dropdown: trigger label + radio item + accepted value.

No contract/server change — purely client grouping.

## Verification

- `pnpm check` — 0 errors, 47 (pre-existing) warnings, 827 files.
- Visual (isolated worktree preview, `/deadlines?group=urgency`): renders the
  "Overdue · 12 deadlines · next May 12 · 6 late" band header above the overdue
  rows; the Group-by chip reads "Urgency".

## Follow-ups

- The band header reuses the generic client/filing header format ("N deadlines ·
  next {date}"). The design's richer band summary ("≈12d avg · ≈$11,840 penalty
  exposure") is a further enhancement, now unblocked by the exposure column.
