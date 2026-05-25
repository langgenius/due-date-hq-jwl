# 2026-05-25 — Migration Step 1 dialog input stack

## Change

Yuqi flagged the Import clients dialog on Today: Paste rows and Upload file
were laid out side-by-side, while the onboarding flow presents them as a
single vertical stack.

Updated `Step1Intake` so both dialog and onboarding densities use the same
Paste rows -> Upload file order. The inline `or` divider was removed because
the stacked layout already communicates the two import choices, and both input
targets now use the compact 104px height from onboarding.

## Design alignment

No `DESIGN.md` change is needed. This reuses the existing Step 1 onboarding
layout and import controls; no token, primitive, or flow contract changed.

## Verification

- `pnpm --filter @duedatehq/app test -- src/features/migration/Step1Intake.test.ts`
- `pnpm --filter @duedatehq/app exec tsc --noEmit`
- `pnpm exec vp check apps/app/src/features/migration/Step1Intake.tsx apps/app/src/features/migration/Step1Intake.test.ts docs/dev-log/2026-05-25-migration-step1-dialog-stack.md`
- `git diff --check -- apps/app/src/features/migration/Step1Intake.tsx docs/dev-log/2026-05-25-migration-step1-dialog-stack.md`
