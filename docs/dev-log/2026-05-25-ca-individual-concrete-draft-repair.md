# 2026-05-25 - CA individual concrete draft repair

## Why

Local review found that the accepted California individual income tax return concrete draft had
copied quarterly estimated-payment dates into the return filing rule. That made the active
`ca.individual_income_return.candidate.2026` rule look concrete, but its due-date logic described
payment installments instead of the Form 540 filing deadline.

## What changed

The local D1 concrete draft cache and accepted practice rules were repaired for
`ca.individual_income_return.candidate.2026`:

- `ai_output(kind='rule_concrete_draft')` successful CA individual return rows.
- `rule_concrete_draft` mirror row.
- Active `practice_rule` rows that had accepted the bad draft.
- Verified `rule_review_decision` rows that stored the accepted bad draft.

The corrected due-date logic is `nth_day_after_tax_year_end` with `monthOffset: 4` and `day: 15`,
so TY2025 expands to 2026-04-15 and TY2026 expands to 2027-04-15. The extension policy now records
California's automatic six-month filing extension and keeps payment due on the original due date.

## Follow-up

This repair fixes the underlying concrete draft data. The Add deadline category mapping still needs
to map `Individual income tax return` + `CA` to `ca_state_individual_income_tax`; otherwise the modal
can still fail before it reaches the repaired rule.

## Verification

- Backed up the local D1 sqlite database to `/private/tmp/due-date-hq-ca-concrete-draft-before.sqlite`.
- Queried successful CA individual concrete draft `ai_output` rows and confirmed
  `dueDateLogic.kind = nth_day_after_tax_year_end`.
- Queried the `rule_concrete_draft` mirror and active practice rules and confirmed the same logic.
- Ran a `tsx` expansion smoke check: TY2025 -> 2026-04-15, TY2026 -> 2027-04-15.
