# 2026-05-20 · Obligation Extension Plan Interaction

## Summary

Reworked the Obligation detail Extension tab from a two-way apply/reject decision control into a
single internal extension plan save path.

## Shipped

- Removed the Extension tab decision selector; saving now records an internal extension plan and the
  server writes `extensionDecision = applied`.
- Renamed the public API/read model field to `extensionInternalTargetDate` while keeping the existing
  `extension_expected_due_date` DB column as the storage backing.
- Added front-end and server validation so saved internal target dates must be on/before the
  official Filing Deadline, with server fallback to `baseDueDate` when `filingDueDate` is absent.
- Added `IsoDatePicker.maxIsoDate` so dates after the filing deadline are disabled in the calendar.
- Disabled the Extension tab save action unless the internal target date is filled and paired with a
  required decision memo.
- Added a success tooltip on the save button after the internal extension plan is saved.
- Added an `Example` title to the extension policy sample card and reused status labels in the
  current-status summary so `extended` renders as `Extended`.
- Simplified the save button label to `Save Extension` and removed the redundant `Plan` row from the
  extension summary card.
- Updated audit/evidence payloads to record `internalTargetDate` and continue preserving
  `paymentStillDue: true`.

## Validation

- `pnpm --filter @duedatehq/contracts test`
- `pnpm --filter @duedatehq/server test`
- `pnpm --filter @duedatehq/app test`
- `pnpm --filter @duedatehq/contracts exec tsc --noEmit`
- `pnpm --filter @duedatehq/server exec tsc --noEmit`
- `pnpm --filter @duedatehq/app exec tsc --noEmit`
- `pnpm --filter @duedatehq/db exec tsc --noEmit`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
