# Rule Library Active Queue

**Date:** 2026-05-22

## Change

Rule Library now switches the left rail in the rule detail workspace based on
the selected rule status. Pending and candidate rules keep the existing Pending
review queue, while active and verified rules open an Active rule queue.

## Implementation Notes

- Active rule detail deep links (`?rule=<id>`) now show `Active rule queue`
  instead of `Pending review queue`.
- The active queue shares search, jurisdiction grouping, selected-row styling,
  source links, and next/previous navigation with the pending workflow.
- The queue rail includes an Active / Pending toggle. Switching modes selects
  the first rule in the target queue so the detail pane follows the rail.
- Active queue rows are browse/audit only: no batch-ready checkbox, selected
  count, `Review selected`, or bulk review drawer controls.
- Queue navigation falls back to the full same-status queue when a direct
  `?rule=` link is outside the current visible filter.

## Validation

- `pnpm --filter @duedatehq/app test -- --run src/features/rules/coverage-tab.test.tsx`
