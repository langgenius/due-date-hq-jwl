---
title: 'Obligations table power-user features'
date: 2026-05-20
area: obligations
---

# Obligations table power-user features

CPAs work the Obligations queue dozens of rows at a time. The existing table had
ad-hoc bulk controls and partial keyboard support but no range-select, no
indeterminate header state, and no `x`/`Esc` shortcuts. The bulk action bar was
inline with the toolbar and easy to lose.

## Changes

- Added a shift-click range-select to the checkbox column, anchored on the most
  recently clicked row. Helper `rangeSelectionUpdate` is pure and unit-tested so
  the range math doesn't depend on TanStack internals.
- Added `indeterminate` to the header checkbox via base-ui's prop so partial
  page selection shows the dash glyph instead of an empty box. The header click
  still toggles select-all/none for the current page.
- Refactored the bulk action bar into a Linear-style sticky bar that floats
  above the table once at least one row is selected. The bar uses
  `bg-background-subtle` + `border-divider-regular` (no new tokens), shows a
  selection count, and exposes Assign owner / Set status / Export / Clear. The
  Export action consolidates the CSV and PDF zip buttons into one dropdown.
- Owner assignment now emits a summary toast ("Assigned 12 obligations to
  A. Rivera") on success, on top of the existing audit toast.
- Bound `x` to toggle selection on the focused row through `useAppHotkey` so the
  shortcuts help dialog (`?`) registers it. The previous `x = mark extended`
  binding was removed; "Mark extended" stays reachable through the bulk
  Set status menu and the row-level status control.
- Bound `Esc` to close the obligation drawer if open, otherwise clear the
  focused row. The Sheet primitive still owns its own dismiss; we register the
  hotkey only as a redundant intent for when no drawer is open.
- Added a `useEffect` that scrolls the focused row into view (`block: 'nearest'`)
  as j/k navigation advances.
- Verified every filter (status, owner, jurisdiction/state, county, taxType,
  search query, sort) is already URL-backed via `nuqs`. Column visibility is
  intentionally left to URL state too (the spec says localStorage would be the
  right home — this codebase puts it in nuqs to support saved views, so I left
  it alone).

## What was dropped

- **Bulk snooze** — the spec said to check `orpc.obligations.snooze`. That
  endpoint does not exist; `orpc.pulse.snooze` is the only snooze action in the
  app and operates on Pulse alerts, not obligations. Dropped per spec
  instructions. To revisit if a per-obligation snooze contract lands.

## Tests

- `apps/app/src/routes/obligations.test.ts` now covers `rangeSelectionUpdate`
  (forward/reverse ranges, missing anchor fallback, unknown target no-op,
  deselect range) and `selectionHeaderState` (none / all / partial / empty
  page).

## Validation

- `vp check` — 0 errors, 0 warnings.
- `vp test src/routes/obligations.test.ts` — 14/14 pass.
- Browser smoke verification could not be performed in this worktree — the
  preview server at 5175 is bound to a different worktree's source. The PR
  reviewer should verify the bulk-bar visual and keyboard nav locally.
