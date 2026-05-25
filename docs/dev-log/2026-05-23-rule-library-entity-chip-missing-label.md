# Rule Library Entity Chip Missing Label

**Date:** 2026-05-23

## Change

Rule Library entity filter chips now spell out missing coverage counts as `N missing` instead of
showing a bare red number after the main rule count.

The missing count also now excludes `not_applicable` source-coverage cells, so states that do not
have the relevant individual or fiduciary income-tax obligation are not treated as gaps.

## Implementation Notes

- `Trust 43 · 9` meant 43 Trust-applicable rules and 9 jurisdictions missing a Trust rule.
- Updated `EntityChipRow` so visible chip text now reads like `Trust 43 · 9 missing`.
- Aligned entity-chip gap counting with jurisdiction row gap counting by skipping
  `entitySourceCoverage === not_applicable`.
- Kept the existing hover title with the longer explanation: jurisdictions missing a rule.

## Validation

- `pnpm --filter @duedatehq/app build`
- `pnpm --filter @duedatehq/app test -- --run src/routes/rules.library.test.tsx`
