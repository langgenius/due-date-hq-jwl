---
title: '2026-05-20 · Coverage table dual scroll'
---

# Coverage table dual scroll

## Context

Coverage's matrix is tall enough to need its own scroll region, while the page
around the matrix still needs to scroll when the pointer is outside the table.

## Change

- Made the Coverage table frame an explicit internal scroll region with
  `overflow-auto`.
- Adjusted the viewport-aware max height so the table can scroll internally while
  the outer Rules page still has scrollable space around it.
- Added `overscroll-auto` so wheel input can continue through the normal browser
  scroll chain at the table boundaries.
- Added a CoverageTab regression assertion for the internal scroll frame.

## Docs Alignment

This does not change the Coverage IA or visual content model. DESIGN.md stays
aligned because the full-width workbench layout is unchanged; this is scroll
behavior inside the existing table surface.

## Validation

- `pnpm --filter @duedatehq/app test -- --run src/features/rules/coverage-tab.test.tsx`
