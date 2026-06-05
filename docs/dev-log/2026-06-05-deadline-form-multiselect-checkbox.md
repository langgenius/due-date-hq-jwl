# Deadline Form Multi-Select Checkbox UI

## Context

The Add deadline dialog's Form / voucher picker supports selecting multiple forms, but selected
rows used a right-aligned check icon. That made the control read closer to a single-select menu.

## Change

- Render each suggested form/voucher option with a leading checkbox.
- Keep row-level selection as the interaction model so clicking anywhere on an option still toggles
  the form.

## Validation

- `pnpm exec vp check --fix apps/app/src/features/obligations/CreateObligationDialog.tsx`
- Browser verification on `/deadlines`: opened Add deadline, opened Form / voucher, confirmed suggested
  options render a checkbox before the option text, and clicking the first option checks its box while
  updating the trigger label.
