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

## 2026-05-24 follow-up: rule-backed category creation

The category model now treats `Deadline category` as a business workflow label. State specificity belongs in `Jurisdiction`, and concrete forms or vouchers belong in `Form / voucher`. Dropdown copy must not expose raw canonical tax codes such as `federal_7004`, `ca_541`, or internal field names such as `taxType` / `formName`.

Each deadline category suggestion carries an explicit generation state:

- `rule_backed`: at least one active concrete, non-`source_defined_calendar` rule can generate a deadline.
- `rule_review_required`: a source or candidate exists, but the rule is not safe to create from yet.
- `manual_date_required`: the item is intentionally manual, such as a Schedule K-1 dependency.

The Forms catalog no longer computes client-side placeholder deadlines. `ClientFactsWorkspace` now calls `obligations.createFromRule`, and the server resolves the selected rule through the rule preview/generation path. The previous `today + 30 days` heuristic is retired; review-only rules are disabled with `Rule review required` instead of creating fake dates.

Rule coverage added in this pass:

- `ca.541.return.2025` from the FTB 2025 Form 541 booklet.
- `ny.it205.return.2025` from NY Form IT-205-I instructions.
- Form 7004 extension rules split by return family: 1065, 1120-S, 1120, and 1041.

## 2026-05-24 follow-up: broad category labels only

The Add deadline category dropdown now exposes only broad CPA workflow categories, such as `Individual income tax return`, `S corporation income tax return`, `Partnership income tax return`, `Payroll tax deposit`, and `Information returns`. State-specific variants such as California LLC annual tax, New York IT-204-LL, or Texas franchise report no longer appear as category choices.

Manual creation still saves canonical tax codes. The dialog resolves category plus `Jurisdiction` at submit time: for example, `S corporation income tax return` plus `CA` maps to `ca_100s`, while the same category with `FED` maps to `federal_1120s`. `Form / voucher` stays editable, and known jurisdiction mappings update the submitted form when the visible form is still the category default.

Additional verification:

- `pnpm --filter @duedatehq/core test -- --run src/rules/index.test.ts`
- `pnpm --filter @duedatehq/contracts test -- --run src/contracts.test.ts`
- `pnpm --filter @duedatehq/server test -- src/procedures/rules/_obligation-generation.test.ts src/procedures/obligations/index.test.ts`
- `pnpm --filter @duedatehq/server build`

## 2026-05-25 follow-up: Add deadline tax year and rule-only due dates

The Add deadline modal now asks for `Tax year` instead of `Base due date`. Users pick from a
current-and-future year dropdown, then choose a broad deadline category and jurisdiction. The due
date is generated by `obligations.createFromRule`; the client no longer sends manual
`baseDueDate`, `filingDueDate`, or `paymentDueDate` values from this modal.

Because the rule owns the obligation type and initial lifecycle state, the modal also removed the
manual `Deadline type` and `Starting status` controls. The UI must not imply that users can
override fields the rule-backed create endpoint ignores.

`obligations.createFromRule` accepts an optional `taxYear`. For tax-year-driven rules, the server
reuses the selected active rule as a template and retargets the tax year before previewing and
creating obligations. Non-tax-year-driven rules still reject mismatched future years instead of
inventing dates.

## 2026-05-25 follow-up: flat tax category list

The Add deadline category picker is now a flat list of broad tax deadline types. It no longer
splits options into `Recommended for this client` and `Other common deadlines`; users should see the
same tax-type vocabulary regardless of which client opened the dialog.

`Schedule K-1 dependency` was removed from deadline categories because it is a dependency/workpaper
concept, not a tax deadline category. K-1 follow-up should be modeled through dependency/materials
workflows, not the rule-backed Add deadline tax-category dropdown.
