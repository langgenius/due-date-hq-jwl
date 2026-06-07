# 2026-06-07 — Classification impact deadline count

Updated the client classification impact dialog so its existing-deadline count
matches the filing-plan horizon: the current tax year plus projected future tax
years, regardless of workflow status or projected confirmation state.

The upper warning confirmation was removed. The dialog now shows the count as
plain context only; the per-deadline white "Needs your confirmation" list remains
the only checkbox confirmation before removing current-tax-year deadlines.
The "Needs your confirmation" section header no longer shows a redundant item
count badge.
The section now sits above the blue "Deadlines aren't added automatically" note
so the destructive confirmation appears before the informational reminder.
The blue note no longer shows a leading icon.
Apply is gated by unconfirmed current-tax-year deadlines; projected deadlines do
not require checkbox confirmation. The apply path now supersedes every active
deadline that existed before the classification change, including projected,
manual, and previously unchanged rows, while creating no replacement deadlines.

Validation:

- `pnpm --filter @duedatehq/app test -- src/features/clients/classification-impact-dialog-model.test.ts`
- `pnpm --filter @duedatehq/server test -- src/procedures/clients/_classification-recompute.test.ts`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check`
- In-app browser DOM check on the client detail route confirmed the "Needs your
  confirmation" header no longer has a trailing count badge.
- In-app browser DOM check confirmed the blue deadline note contains no SVG
  icon.
- In-app browser check on Cascade Payroll Co confirmed a projected-only
  classification change shows no confirmation checkbox, shows "Will remove 7",
  keeps the no-auto-add note, and leaves Apply enabled. Apply was not clicked to
  avoid mutating local demo data.
