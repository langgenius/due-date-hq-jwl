# 2026-05-29 · Extension Save Draft Clear

## Summary

Cleared the deadline drawer Extension tab draft fields after a successful save so the just-entered
target date, source, and decision memo do not remain in the form as stale editable input.

## Shipped

- Reset the same-row `extensionDraft` after `obligations.decideExtension` succeeds while preserving
  the row id, so the render-time row sync does not immediately rehydrate the saved values.
- Kept the persisted extension plan, audit event, evidence payload, success tooltip, and "Last
  decided" hint unchanged.
- Added focused route-model coverage for the draft reset helper.

## Validation

- `pnpm --filter @duedatehq/app test -- src/routes/obligations.test.ts`
- `pnpm --filter @duedatehq/app build`
- Playwright smoke on local `/deadlines/<e2e-row>/extension`: save succeeded and the target date,
  source, and memo fields reset to empty draft state.
