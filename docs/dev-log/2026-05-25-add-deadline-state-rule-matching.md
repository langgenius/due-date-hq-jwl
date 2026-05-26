---
title: 'Add deadline — state-first rule matching'
date: 2026-05-25
---

# Add deadline — state-first rule matching

## Context

The Add deadline dialog could show `No rule-backed deadline is available...` even after a
practice reviewed the relevant state rules. The broad category resolver was still using
Federal category defaults as an implicit fallback, so `Individual income tax return` plus
`CA` could search for `federal_1040` in the CA jurisdiction instead of the CA state income
rule family.

## Shipped

- Changed broad deadline category resolution to return ordered rule candidates instead of
  one canonical tax type.
- Made the entered jurisdiction authoritative: explicit CA/NY mappings win first, then
  two-letter state jurisdictions fall through to generic state tax-type suffixes such as
  `ca_state_individual_income_tax` and `az_state_individual_income_tax`.
- Removed implicit Federal fallback for state jurisdictions. Federal remains the workflow
  anchor when `FED`, `Federal`, `IRS`, `US`, or `USA` is entered.
- Treated known default form names as display hints instead of hard filters. Custom form
  names still filter rule matches.
- Kept Form / voucher suggestions as a related form set rather than only the matched
  jurisdiction form. For state individual income work, the state form hint appears first
  while the Federal anchor form `Form 1040` stays available in the same picker.
- Changed Deadline category to a fixed dropdown-only choice. It no longer exposes a search
  input or custom typed category path; Form / voucher keeps search because that list is a
  lookup surface.
- Added a compact rule-match status line in the dialog: matched active rule, review
  required, or no active jurisdiction rule.

## Verification

- `pnpm --filter @duedatehq/app test --run src/features/obligations/deadline-category-suggestions.test.ts`
- `pnpm check`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app exec lingui compile`
- `pnpm --filter @duedatehq/app i18n:compile` still fails on 193 pre-existing missing
  `zh-CN` translations; this change does not add a new missing translation.
- Local Playwright smoke against `http://localhost:5173/clients`: S corporation + CA moved
  `Form 1120-S` to `Form 100S`; Individual income tax return + CA moved `Form 1040` to
  `State individual income tax return`.
- Local Playwright smoke: Individual income tax return + AK kept
  `State individual income tax return` selected and showed both that state hint and
  `Form 1040` in Suggested forms and vouchers.
- Browser validation against `http://localhost:5173/clients/hanxujiang`: Deadline category is
  dropdown-only with no search input, while Form / voucher still exposes search and keeps
  `Form 1040` in the suggested forms set.
- `pnpm --filter @duedatehq/app build`

## 2026-05-26 follow-up — multi-jurisdiction create

### Context

The single-jurisdiction Add deadline flow made a CPA pick one authority/form at a time,
which did not reflect common federal + state filing setup. The underlying obligation model
is still correct: one deadline row should represent one authority, rule, and form/voucher
so status, evidence, payment, extension, and audit stay separable.

### Shipped

- Added `obligations.createFromRules` so the app can create several rule-backed deadline
  rows in one audited manual batch.
- Kept `obligations.createFromRule` as a compatibility wrapper over the same server path.
- Kept Add deadline as a compact single-jurisdiction entry instead of rendering every state
  as a checkbox. The jurisdiction input defaults from the client filing state, can be typed
  to any other state, and has a separate `Federal` checkbox for creating the Federal companion
  deadline in the same submit.
- Restored the Form / voucher dropdown as a primary field and changed it to multi-select.
  The dropdown auto-refreshes its selected forms when the category, jurisdiction, or Federal
  companion checkbox changes.
- Restored the rule-match feedback below the compact fields, including loading, matched rule,
  review-required, and no-active-rule states for each selected jurisdiction.
- Kept deadline categories open across client entity types. Add deadline is a manual CPA
  selection surface, so a C corp client can still select individual categories and match an
  active Form 1040 rule if the user chooses that workflow.
- Allowed manual state-rule creation even when the client does not yet have that state in
  filing profiles; the created deadline keeps the selected state jurisdiction and stores
  `clientFilingProfileId: null`.
- Disabled submit until every selected jurisdiction has an active rule-backed match, leaving
  review-only or unavailable jurisdictions visible but not silently partially applied.
- Verified the IA stays aligned with the existing "one rule generates one obligation row per
  jurisdiction" model in `docs/IA/obligation-row-IA.md`; no design-doc semantic change was
  needed.

### Verification

- `pnpm --filter @duedatehq/contracts test -- contracts.test.ts`
- `pnpm --filter @duedatehq/server test -- src/procedures/obligations/index.test.ts`
- `pnpm --filter @duedatehq/app test -- CreateObligationDialog.test.ts`
- `pnpm --filter @duedatehq/app exec tsc --noEmit`
- `pnpm --filter @duedatehq/server exec tsc --noEmit`
- `pnpm --filter @duedatehq/contracts exec tsc --noEmit`
- `pnpm check` passes with existing warnings in `PulseDetailDrawer.tsx`,
  `packages/db/src/repo/migration.ts`, and `apps/app/src/routes/obligations.tsx`.
- `pnpm format`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile` still fails on the repo's existing 266
  missing `zh-CN` translations after this change's new strings were translated.
- Browser validation on `http://localhost:5173/clients/jhx-8982152e-26fc-4fd7-99e4-6b83011ad791`:
  the C corp client defaults to no incompatible individual category, the category dropdown
  excludes `Individual income tax return`, and selecting `C corporation income tax return`
  auto-selected `Form 100, Form 1120` with `CA · Match` and `FED · Match`.

## 2026-05-26 follow-up — manual category override

### Context

The prior follow-up filtered Add deadline categories by client entity type. Product direction
changed: the dialog should expose all categories and let the CPA decide which deadline to add.

### Shipped

- Removed client entity-type filtering from the Deadline category picker.
- Removed the Add deadline rule-match entity gate so a manually selected category can match an
  active rule even when the client's entity type differs.
- Updated manual rule-backed creation to calculate due dates from the selected rule's applicable
  entity, while still saving the deadline against the actual client.

### Verification

- `pnpm --filter @duedatehq/app test -- CreateObligationDialog.test.ts`
- `pnpm --filter @duedatehq/server test -- src/procedures/obligations/index.test.ts`
- `pnpm --filter @duedatehq/app exec tsc --noEmit`
- `pnpm --filter @duedatehq/server exec tsc --noEmit`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm format`
- Browser validation on `http://localhost:5173/clients/jhx-8982152e-26fc-4fd7-99e4-6b83011ad791`:
  the C corp client category dropdown includes `Individual income tax return`; selecting it
  auto-selected `State individual income tax return, Form 1040`, showed `CA · Match` and
  `FED · Match`, and enabled `Add 2 deadlines`.
