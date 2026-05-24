# 2026-05-24 - Add deadline picker fields

## Why

Browser review flagged three issues in the Add deadline modal on client detail:

- The base due date used the browser-native date input, which surfaced locale-specific Chinese date text in the field chrome.
- Tax type was a free text box even though common tax/form values are predictable.
- Form was also a free text box and needed suggested options.

## What changed

`CreateObligationDialog` now uses picker controls for those fields:

- Base due date uses the shared ISO date picker with a stable `YYYY-MM-DD` placeholder instead of `input[type=date]`.
- Tax type uses a searchable suggestion combobox with common federal and selected state tax/form options.
- Form uses a searchable suggestion combobox derived from the same catalog plus K-1 and extension forms.
- Selecting a known tax type fills blank form and jurisdiction fields and sets the obligation type for payment, deposit, and information-return options.

The ISO date picker primitive now accepts `id` and `className` so it can replace form inputs while preserving label linkage and local field sizing.

The tax-code label table now also covers the selectable codes newly exposed by this dialog so downstream rows continue to show human labels instead of fallback code text.

## Docs alignment

I checked the existing design and product docs for an Add deadline modal contract. The current docs describe form, tax type, and deadline concepts broadly, but do not specify this modal's input mechanism, so no DESIGN.md update is needed for this narrow control swap.

## Verification

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/app build`
- `E2E_REUSE_EXISTING_SERVER=1 pnpm exec playwright test e2e/tests/clients.spec.ts --grep "E2E-CLIENTS-ADD-DEADLINE"`

In-app browser inspection of `localhost:5173` was blocked by the browser security policy, so the authenticated Playwright route is the browser-level verification for this change.
