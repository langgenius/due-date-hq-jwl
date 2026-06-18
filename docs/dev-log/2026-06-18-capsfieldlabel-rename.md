# Rename FieldLabel → CapsFieldLabel (kill the name collision)

_2026-06-18 · design-call #2 of the pass-2 backlog_

Two primitives exported `FieldLabel`: our caps-eyebrow primitive
(`@/components/primitives/field-label`, 49 import sites) and the form-control
label in the `Field` family (`@duedatehq/ui/.../field`: `Field` / `FieldLabel` /
`FieldError` / `FieldDescription` / `FieldGroup`, 12 sites). The 3 files needing
both already aliased ours as `CapsFieldLabel` — the de-facto disambiguator.

## Decision (Yuqi)

Adopt that disambiguator as THE name everywhere. The plain `FieldLabel` now
belongs only to the form-control `Field` family (correct — it labels a field
input); our caps eyebrow is unambiguously `CapsFieldLabel`.

## What changed

- `git mv components/primitives/field-label.tsx → caps-field-label.tsx`; export
  `FieldLabel` → `CapsFieldLabel`.
- 46 plain importers: import path + name → `CapsFieldLabel` from
  `caps-field-label`.
- 3 both-files (dialogs, practice, obligations): dropped the `as CapsFieldLabel`
  alias (now a plain named import); their `ui/field` `FieldLabel` + usages
  untouched.
- preview gallery: caps import + specimen renamed; `ui/field` `FieldLabel as
UiFieldLabel` preserved.
- Docs: DESIGN §4.11 + section-header-style.md updated to the new name/path +
  the collision-resolution note.

## Verification

- `tsgo` 0; 543 app tests pass; build green; no `primitives/field-label` path or
  bare-caps `FieldLabel` reference remains (the only bare `FieldLabel` left are
  the `ui/field` form-control labels — correct). i18n untouched (rename only).
