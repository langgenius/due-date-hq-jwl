---
title: '2026-05-20 · Coverage table scroll containment'
date: 2026-05-20
author: 'Codex'
area: rules
---

# Coverage table scroll containment

## Change

- Wrapped the `/rules/coverage` entity coverage table in a bounded `overflow-auto` container.
- The matrix now owns wheel scrolling when the pointer is over the table, while the sticky header stays pinned to the table frame.
- Horizontal overflow is also available through the same container, so narrow app widths no longer rely on the outer page for clipped table content.

## Design/doc alignment

- `DESIGN.md` remains aligned: this change preserves the existing table anatomy and element states, and only fixes the scroll container ownership for the coverage matrix.

## Validation

- Browser: `/rules/coverage` table wheel scroll moved the matrix scroller from `0` to `640`; outer `main` stayed at `0`; no console warnings/errors.
- `pnpm exec vp fmt --check apps/app/src/features/rules/coverage-tab.tsx`
- `pnpm --filter @duedatehq/app test -- --run src/features/rules/coverage-tab.test.tsx`
