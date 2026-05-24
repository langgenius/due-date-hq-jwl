# 2026-05-24 - Add deadline picker fields

## Why

Browser review flagged three issues in the Add deadline modal on client detail:

- The base due date used the browser-native date input, which surfaced locale-specific Chinese date text in the field chrome.
- Tax type was a free text box even though common deadline categories are predictable.
- Tax type and Form felt semantically overlapped because the UI showed form-like labels in the category field.
- Form was also a free text box and needed suggested options.

## What changed

`CreateObligationDialog` now uses picker controls for those fields:

- Base due date uses the shared ISO date picker with a stable `YYYY-MM-DD` placeholder instead of `input[type=date]`.
- Tax type is now presented as `Deadline category`; the app still saves the canonical `taxType` value internally.
- Deadline category suggestions are grouped into `Recommended for this client` and `Other common deadlines` based on entity, state, filing profile, and selected practice flags.
- The category dropdown shows business-readable labels such as `Trust and estate income tax return`, never raw canonical codes or implementation field names.
- Form is now presented as `Form / voucher` and uses concrete form, voucher, or dependency labels such as `Form 1120-S`, `FTB 3522`, and `Schedule K-1`.
- Selecting a known deadline category fills the form/voucher, jurisdiction, and deadline type defaults while keeping those fields editable for edge cases.

The ISO date picker primitive now accepts `id` and `className` so it can replace form inputs while preserving label linkage and local field sizing.

The tax-code label table now also covers the selectable codes newly exposed by this dialog so downstream rows continue to show human labels instead of fallback code text. UI copy for this flow should not expose raw canonical codes such as `federal_1120s` or implementation names such as `taxType`.

## Docs alignment

I checked the existing design and product docs for an Add deadline modal contract. The current docs describe form, tax type, and deadline concepts broadly, but do not specify this modal's input mechanism, so no DESIGN.md update is needed for this narrow control swap.

## Verification

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/app test --run src/features/obligations/deadline-category-suggestions.test.ts`
- `pnpm --filter @duedatehq/app build`
- `E2E_REUSE_EXISTING_SERVER=1 pnpm exec playwright test e2e/tests/clients.spec.ts --grep "E2E-CLIENTS-ADD-DEADLINE"`

In-app browser inspection of `localhost:5173` was blocked by the browser security policy, so the authenticated Playwright route is the browser-level verification for this change.
