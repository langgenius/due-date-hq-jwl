# Rule review decision card padding

## Context

The tinted decision card at the bottom of the rule review flow had vertical padding but no
horizontal inset. The card rendered its decision copy, audit assurance, and actions directly under
the `Card` root even though the shared card primitive assigns horizontal padding through
`CardContent`.

## Change

- Wrapped the candidate decision body in `CardContent`.
- Kept the existing compact card density and vertical rhythm while restoring the shared small-card
  horizontal inset.
- Added a regression assertion that the decision actions live inside the padded card content slot.

## Validation

- `pnpm --filter @duedatehq/app test --run src/routes/rules.library.test.tsx`
