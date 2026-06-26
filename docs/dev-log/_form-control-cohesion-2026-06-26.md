# Form-control cohesion — InputGroup onto canon + login adopts the primitive

**Date:** 2026-06-26

Started from a login observation — the email field and the Send button weren't the
same height. Pulling the thread surfaced that the field wasn't a shared component at
all: login hand-rolled a local `FieldShell`, while the product already has canonical
field primitives (`Input`, `InputGroup`, `Field`). Audited every editable control and
found the system was _almost_ coherent — only two stragglers.

## The canon (DESIGN.md §form-control)

Editable controls = `h-9 rounded-xl` (12px); `Button` default = `h-9 rounded-2xl`
(16px). Inputs sit deliberately one notch under buttons — a soft-rounded family, not
identical corners.

## What was off-spec

| Control                                      | Was                           | Now                  |
| -------------------------------------------- | ----------------------------- | -------------------- |
| `Input` / `Textarea` / `Select` / `Combobox` | `h-9 rounded-xl` ✓            | unchanged            |
| **`InputGroup`**                             | `h-8 rounded-lg` ✗            | **`h-9 rounded-xl`** |
| login **`FieldShell`** (local)               | `h-9 rounded-lg`, hand-rolled | **deleted**          |

## Changes

- **`packages/ui/.../input-group.tsx`** — container `h-8 rounded-lg` → `h-9 rounded-xl`.
  Brings the icon-slot input onto the form-control canon. Consumers: `/preview`
  specimens + 2FA-setup TOTP field (both verified — render clean at the taller height,
  inline copy button still fits).
- **`routes/login.tsx`** — deleted the local `FieldShell`; both fields (email + OTP)
  now compose the shared `InputGroup` / `InputGroupAddon` / `InputGroupInput`. Login's
  outlined-white auth skin is preserved via one `AUTH_FIELD_SKIN` className (white bg +
  visible border, no gray on hover/focus) so it still reads crisply on the plain
  sign-in background. Error state now rides InputGroup's built-in `aria-invalid`
  wiring instead of a bespoke `error` prop.

## Result

The email field and the Send button are now the same height (36px), and the field's
corners moved 8px → 12px — closing the jarring 8-vs-16 gap to the _intended_ 12-vs-16
soft-rounded relationship. Login is no longer a one-off; it's the shared primitive.

## Verify

`pnpm check` (eslint + types) **0 errors**; `build` clean. Live `/login`: field 36px /
12px / white-outlined / mail + ↵ icons present, flush with the 36px button. Live
`/preview`: both `InputGroup` specimens 36px / 12px, addon icons positioned. No
regressions.
