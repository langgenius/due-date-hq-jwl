---
title: 'Temporary Rules Updated Date Only'
date: 2026-06-13
author: 'Codex'
---

# Temporary Rules Updated Date Only

## What changed

- Changed `/rules/temporary` UPDATED cells from full practice-timezone timestamps to
  date-only labels, e.g. `2026-05-20`.
- Center-aligned the compact JUR, OVERRIDE, OBLIGATIONS, STATUS, and UPDATED
  columns so their values sit in the middle of their table cells.
- Added `formatDateWithTimezone(...)` for compact table cells that need the practice
  timezone day without hours, minutes, seconds, or a timezone suffix.

## Validation

- `pnpm --filter @duedatehq/app test -- src/lib/utils.test.ts`
- `pnpm --filter @duedatehq/app exec vp check src/features/rules/temporary-rules-tab.tsx src/lib/utils.ts src/lib/utils.test.ts`
- In-app browser verified `/rules/temporary` UPDATED displays `2026-05-20`.
- In-app browser verified the JUR, OVERRIDE, OBLIGATIONS, STATUS, and UPDATED
  header/cell contents are centered in their table cells.
