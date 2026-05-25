# 2026-05-25 — Rule library initial metrics loading state

## Why

Yuqi flagged that `/rules/library` briefly showed `0 need review` in the top progress
strip on first entry, then replaced it with the real backlog after the rule catalog loaded.
That made the initial state look like a real empty queue instead of pending data.

## Shipped

- Added an initial loading state for the Rule Library summary band while rules, coverage,
  and source counts are still loading without cached data.
- Kept the search input visible, but replaced the progress strip, metric tiles, and entity
  chips with same-size skeletons until the first catalog responses arrive.
- Preserved existing counts during background refetches because the loading guard uses the
  query initial-load state, not generic fetching.

## Files touched

- `apps/app/src/routes/rules.library.tsx`
- `apps/app/src/routes/rules.library.test.tsx`

## Verification

- Added a focused route test that holds the initial queries open and asserts the page does
  not render `0 need review` before data resolves.
- DESIGN.md remains aligned; this is a loading-state correction to the existing Rule Library
  surface, not a visual vocabulary or IA change.
