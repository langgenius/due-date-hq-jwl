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
