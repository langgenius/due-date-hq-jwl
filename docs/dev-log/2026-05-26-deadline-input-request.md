# Deadline Input Request

## Context

Preparer users needed a lightweight way to escalate the current deadline to a partner or
owner from the deadline detail drawer. The first slice intentionally keeps the request
inside the existing deadline detail, notification, and audit surfaces instead of adding a
new workflow state.

## Changes

- Added `obligations.requestInput` with server-side enforcement:
  - only active preparers can send requests
  - recipients must be active owners or partners
  - self-notification is rejected
- Wrote an `obligation.input_requested` audit event with recipient, request type, message,
  and deadline href metadata.
- Created an `internal_request` in-app notification for the selected owner or partner.
- Added a footer `Request input` button in deadline detail, plus a recipient/type/message
  dialog.
- Added a non-blocking `Input requested` header chip derived from the latest audit event.
- Added notification and audit labels, icons, and Lingui catalog entries.

## Validation

- `pnpm --filter @duedatehq/contracts test src/contracts.test.ts`
- `pnpm --filter @duedatehq/server test src/procedures/obligations/index.test.ts`
- `pnpm --filter @duedatehq/app test src/routes/obligations.test.ts src/features/audit/audit-log-model.test.ts`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check`
- Playwright smoke: seeded preparer session on `/deadlines`, opened a deadline detail, verified
  `Request input` footer button and dialog render.

`pnpm check` passed with the existing warning set around underscored dead code and older
unsafe assertions.
