# Extension date picker border fix

**Date:** 2026-05-26
**Branch:** `main`
**Scope:** `/deadlines/:id/extension` extension tab date picker chrome

Yuqi flagged that the "Internal extension target date" control in the deadline extension tab
looked borderless next to the source input and memo textarea.

## What changed

`apps/app/src/components/primitives/iso-date-picker.tsx`:

- Replaced the trigger's `border-transparent` default state with `border-divider-regular`.
- Added the same focus-visible and invalid ring offsets used by the shared `Input`, `Textarea`, and
  `SelectTrigger` controls.

`apps/app/src/components/primitives/iso-date-picker.test.tsx`:

- Added a focused regression assertion that an empty `IsoDatePicker` keeps the standard input
  border class.

## Documentation alignment

No DESIGN.md change needed: the fix brings the date picker back in line with the documented
standard input surface rather than introducing a new form style.

## Verification

- `pnpm --filter @duedatehq/app test -- src/components/primitives/iso-date-picker.test.tsx` —
  2 tests passed
- `pnpm --dir apps/app exec tsc -p tsconfig.json --noEmit` — clean
