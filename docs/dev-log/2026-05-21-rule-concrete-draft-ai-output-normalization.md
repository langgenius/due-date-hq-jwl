---
title: 'Rule concrete drafts normalize AI output before contract validation'
date: 2026-05-21
author: 'Codex'
area: rules
---

# Rule concrete drafts normalize AI output before contract validation

## Context

`al.individual_estimated_tax.candidate.2026` repeatedly failed with
`No object generated: response did not match schema` even though the Alabama DOR
source text clearly lists the calendar-year estimated-tax installment dates.
The failure happened in the AI SDK structured-output boundary before raw output
could be recorded.

## Change

- Added a lenient AI output schema for rule concrete drafts and normalize it into
  the strict `RuleConcreteDraftSchema` payload before recording or returning it.
- Normalization year-fills month/day installment dates from `rule.applicableYear`,
  maps four-payment estimated-tax schedules to `frequency: "quarterly"`, strips
  `null` optional extension fields, and preserves source-excerpt validation.
- Period-table normalization also backfills missing row-level `dueDate` values
  from ordered month/day dates in the source excerpt or source text when the
  model only labels rows such as `Payment 1`.
- When the model returns `sourceExcerpt: null`, normalization now derives a
  source-backed excerpt from the official source text, preferring the
  calendar-year payment block.
- Updated the prompt to tell the model to use quarterly frequency for four
  estimated-tax installments, to omit unknown optional fields instead of
  emitting `null`, and to copy adjacent source lines rather than returning a
  null source excerpt.

## Verification

- `pnpm --filter @duedatehq/server test -- src/procedures/rules/concrete-draft.test.ts` -
  pass, 3 tests.
- `pnpm --filter @duedatehq/ai test` - pass, 2 files / 23 tests.
- `pnpm exec vp check apps/server/src/procedures/rules/concrete-draft.ts apps/server/src/procedures/rules/concrete-draft.test.ts apps/server/src/procedures/rules/index.ts packages/ai/src/prompter.ts packages/ai/src/prompts/rule-concrete-draft@v1.md` -
  pass.
- `pnpm --filter @duedatehq/server test` currently fails in unrelated
  `src/middleware/session.test.ts` because the test request sees an undefined
  `env.DB`.
- `pnpm check` still reports pre-existing formatting issues in
  `apps/app/src/routes/migration.new.tsx` and
  `docs/product-design/rules/02-rules-console-product-design.md`.
