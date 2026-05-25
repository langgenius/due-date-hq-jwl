# 2026-05-25 client source details edit

Browser review flagged that a manually-created client showed `Import source` fields as read-only
`N/A` values. The Client info tab now treats manual clients as editable contact details instead of
import-only metadata.

## Changes

- Added `clients.updateSourceDetails` for audited edits to external source ID, source status,
  address, city, ZIP/postal code, and primary phone.
- Changed the Client info section title to `Contact details` for manual clients; imported clients
  keep `Import source`.
- Replaced the read-only `N/A` grid with inputs plus `Save client details` / `Cancel`.

## Validation

- `pnpm --filter @duedatehq/contracts test -- contracts.test.ts`
- `pnpm --filter @duedatehq/server test -- clients/index.test.ts`
- `pnpm --filter @duedatehq/app test -- client-readiness.test.ts client-detail-model.test.ts client-url.test.ts`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --dir apps/app exec lingui compile`
- `pnpm check`
- Local browser smoke: create a manual client, open `Client info`, confirm `Contact details`
  replaces the manual-client `Import source` block, edit address/city/ZIP/phone, and save.
