# 2026-05-25 — Phase 8: Field primitive density (Yuqi #42, #43, #44)

## Why

Three Yuqi review items (#42, #43, #44) clustered around the
CreateObligationDialog's form density — label→input gap felt too
airy, labels floated away from their inputs. Since the Field
primitive is shared by every form in the app, fixing the dialog
required updating the primitive globally.

## Scope (blast radius audit)

`grep` for `@duedatehq/ui/components/ui/field` hit 5 files:

| Callsite                 | Form purpose        |
| ------------------------ | ------------------- |
| `CreateObligationDialog` | new deadline / form |
| `CreateClientDialog`     | new client          |
| `ClientFactsWorkspace`   | client facts edit   |
| `email-otp-sign-in-form` | auth (OTP)          |
| `accept-invite`          | accept firm invite  |

All five use `Field` with the default `vertical` orientation, so the
gap change applies uniformly.

## Shipped

### Field vertical gap: `gap-3` → `gap-1.5`

The Field primitive's `gap-3` (12px) was applied to ALL orientations
uniformly. For `vertical` layout (label on top, input below), 12px
is too much — labels read as floating, disconnected from their
inputs. Linear / Stripe / Notion forms all sit at 4-6px label→input
gap.

Restructured `fieldVariants` so each orientation owns its own gap:

- **vertical**: `gap-1.5` (6px) — tight label-to-input bond.
- **horizontal**: `gap-3` (12px) — label sits to the LEFT of the
  input, so horizontal breathing room is correct there.
- **responsive**: `gap-1.5` stacked / `gap-3` side-by-side at
  `@md/field-group`.

Net effect across every form: labels now hug their inputs, reducing
the vertical height of each Field by ~6px without losing
readability. Across a 5-field form that's ~30px reclaimed — enough
that the dialog feels noticeably less stretched.

### Untouched (intentional)

- **`FieldGroup gap-7`** between fields: NOT tightened. Inter-field
  rhythm is a different concern from intra-field gap — 28px between
  separate fields gives the eye a clear "next field" boundary. Only
  the intra-field gap (label↔input) was too loose.
- **`FieldLabel` typography**: stayed `text-sm font-medium`
  (inherited from `Label`). The original audit note suggested
  bumping label weight, but with the new tight gap the label-input
  pair already reads as a strong unit — adding font weight would
  start to overpower the input. Holding the line at `font-medium`.
  Revisit if Yuqi feels labels are still underweight.

## Verification

- `pnpm exec tsc --noEmit` clean
- `vp lint` 0/0 across Field primitive + all 5 callsites

## Closes Yuqi review items

- Today (dialog): **#42, #43, #44** (Field density)

Combined with prior commits the review is at **69 / 89**.

## Still open

- Today (dialog): **#45** (Dialog close-button position — primitive
  audit, not adjustable from dialog body)
- Alerts: **#9** (US map filter — building next)
- Deadlines: **#6** (multi-deadline grouping), **#16** (drawer
  alignment — viewport replay), **#23, #24, #25**
  (PathToFilingSummary skipped/upcoming dates — designed-as-is),
  **#30** (Summary tab — building next)
- Wizard: **#40, #41** (copy audit / viewport)
