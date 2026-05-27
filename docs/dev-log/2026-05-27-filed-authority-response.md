# Filed authority response v1

## Context

Filed should mean "submitted to the authority, waiting for a result", not
"finished". The short-term product decision is to avoid IRS/state scraping and
MeF/transmitter integration, and let the CPA manually record the authority
outcome.

## Implementation

- Added structured `markFiledRejected` input for rejected date, authority,
  reference, required reason, and next step.
- Kept the database unchanged: the service still writes `efileRejectedAt` and
  moves Filed (`done`) back to In review (`review`).
- Wrote rejection details into the `obligation.efile.rejected` audit payload and
  audit reason for v1 traceability.
- Added a Summary "Authority response" panel for Filed, Completed, and rejected
  In review deadlines.
- Added the `Record authority rejection` dialog with fixed fields and required
  reason validation.
- Removed duplicate Filed-stage actions from the Active stage detail card so
  acceptance/rejection decisions live only in the Authority response panel.
- Removed the no-op `Correct and resubmit` button from the rejected callout;
  the corrected-return path now uses the review workflow's `Approve corrected
return` action.
- Changed the rejected callout chip to keep the warning icon pill shape while
  using red border, red tint, and red text.
- Added rejected-return correction request handling in Materials: CPAs can
  select received items, mark them as needing correction, and send a correction
  request that includes only those items.
- Scoped correction-only materials emails to rejected deadlines that are still
  in review, so later filed/completed deadlines with rejection history use the
  normal materials template.
- Kept `Completed` terminal for v1; reopening completed returns remains a
  future amendment/notice-response workflow.

## Validation

- `pnpm --filter @duedatehq/contracts test -- contracts.test.ts`
- `pnpm --filter @duedatehq/server test -- _service.test.ts`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/server test -- readiness/index.test.ts`
- Browser validation on `/deadlines/000000000002?sort=due_desc`: selected a
  received material, marked it `Needs correction`, and confirmed the correction
  email preview only contained that item.
- `pnpm check` passes with existing warnings in unrelated files.
