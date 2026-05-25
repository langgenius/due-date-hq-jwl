---
title: '2026-05-20 · Rule library table dual scroll'
---

# Rule library table dual scroll

## Context

Coverage now uses pointer-position-based scrolling: wheel over the table scrolls
the table; wheel outside the table scrolls the page. Rule library needed the same
interaction model for its catalog table.

## Change

- Wrapped the Rule library table in a dedicated internal scroll region with
  `overflow-auto`.
- Kept pagination outside the internal table scroll so the footer remains part of
  the surrounding table frame.
- Set the outer `SectionFrame` to `overflow-clip` so it preserves rounded border
  clipping without becoming the wheel target.
- Added a focused RuleLibraryTab regression assertion for the scroll region.

## Docs Alignment

This keeps the existing Rule library IA and visual layout. DESIGN.md does not
need a content update because this only changes scroll behavior within the
existing data-table surface.

## Validation

- `pnpm --filter @duedatehq/app test -- --run src/features/rules/rule-library-tab.test.tsx`
