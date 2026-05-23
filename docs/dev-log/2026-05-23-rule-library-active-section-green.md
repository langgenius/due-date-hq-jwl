# Rule Library Active Section Green

**Date:** 2026-05-23

## Change

Rule Library status sub-section headers now render `ACTIVE` and its count in the same success
green used by active entity counts and check icons.

## Implementation Notes

- Updated `StatusSectionHeaderRow` in `apps/app/src/routes/rules.library.tsx`.
- Kept `NEEDS REVIEW` on accent, `MISSING RULES` on destructive, and rejected/archived/other
  groups on tertiary text.
- No product-design document changes were needed; this is a visual consistency adjustment inside
  the existing status-section treatment.

## Validation

- `pnpm check`
- `pnpm --filter @duedatehq/app build`
