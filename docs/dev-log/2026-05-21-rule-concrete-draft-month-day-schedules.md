---
title: 'Rule concrete drafts handle month-day installment schedules'
date: 2026-05-21
author: 'Codex'
area: rules
---

# Rule concrete drafts handle month-day installment schedules

## Context

`al.individual_estimated_tax.candidate.2026` uses the Alabama DOR estimated tax
FAQ as its source. The page states the calendar-year installment schedule as
month/day values, while the concrete draft schema requires every
`period_table.periods[].dueDate` to be a full `YYYY-MM-DD` date.

## Change

- Updated `rule-concrete-draft@v1` to tell the model to fill month/day
  calendar-year installment dates with `rule.applicableYear`.
- The prompt now tells the model to keep source-backed fiscal-year relative
  installment timing as a caveat in notes or reasoning instead of inventing an
  unsupported schema shape.
- Added a focused AI test covering the Alabama-style estimated tax schedule.

## Verification

- `pnpm --filter @duedatehq/ai test` - pass, 23 tests.
