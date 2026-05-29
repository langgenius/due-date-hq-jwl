# 2026-05-29 · Extension Save Toast Only

## Summary

Removed the button-level success tooltip from the deadline Extension tab save action.

## Shipped

- Kept the bottom-right `toast.success("Extension plan saved")` confirmation after a successful
  extension save.
- Removed the controlled tooltip state, timeout, and `Tooltip` wrapper around `Save extension`, so
  clicking the button no longer shows a second confirmation above the button.

## Validation

- `pnpm --filter @duedatehq/app test -- src/routes/obligations.test.ts`
- `pnpm --filter @duedatehq/app build`
- Browser smoke on `/deadlines`: saved an extension plan, confirmed the
  bottom-right `Extension plan saved` toast appears, and confirmed no
  `role=tooltip` button confirmation is rendered.
