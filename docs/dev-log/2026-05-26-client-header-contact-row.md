# Client header contact row

**Date:** 2026-05-26
**Branch:** `main`
**Scope:** Client detail header metadata row

Yuqi flagged that the client detail header only showed the phone value, even when the client record
had other useful contact details.

## What changed

`apps/app/src/features/clients/client-detail-model.ts`:

- Added a small `buildClientHeaderContactItems` model helper that builds the header metadata row
  from primary contact name, primary contact email or fallback email, primary phone, and address.
- Kept the existing guard against migration/import field-name tokens so values like
  `primary_phone` or `address_line_1` do not leak into the user-facing header.

`apps/app/src/features/clients/ClientFactsWorkspace.tsx`:

- Replaced the email/phone-only header row with rendering for contact, email, phone, and address
  items.
- Kept email and phone as action links while rendering contact and address as quiet metadata.

`apps/app/src/features/clients/client-detail-model.test.ts`:

- Added focused coverage for the full header row, email fallback behavior, and import-token
  filtering.

## Documentation alignment

No DESIGN.md change needed: this keeps the same client-detail header surface and fills it with the
client facts already tracked by the product.

## Verification

- `pnpm --filter @duedatehq/app test -- src/features/clients/client-detail-model.test.ts` —
  13 tests passed
- `pnpm --dir apps/app exec tsc -p tsconfig.json --noEmit` — clean
- `git diff --check` — clean
- Browser QA on `http://localhost:5173/clients/hanxujiang` — header row now shows email, phone,
  and address from the current client data instead of only the phone
