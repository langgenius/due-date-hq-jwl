# Import Step 4: dedup toggle uses the canonical Segmented primitive

**Date:** 2026-06-15
**Surface:** Migration Copilot Step 4 Confirm (`/migration/new`), dedup control

## Change

Replaced the hand-rolled `DuplicateSegmentedControl` (a `role="radio"` pill
group) in `Step4Preview.tsx` with the canonical `Segmented` primitive
(`@duedatehq/ui/components/ui/segmented`).

A design/token audit of the import flow found the dedup control was the one
spot that drifted from the system:

- It hand-rolled the segmented pattern instead of using `Segmented` (the
  primitive already used in alerts, rules, and the dashboard) — a
  primitive-vocabulary violation.
- It used `rounded-full` (off the fixed radius scale — segmented tracks are
  `rounded-lg`) and `shadow-xs` on the active pill, contradicting the flat,
  no-shadow segmented language established in the 2026-06-08 button rework and
  the restrained-shadows rule.

Swapping to the primitive fixes all three. The wrapper component name and the
option strings ("Skip duplicates" / "Import as new") are unchanged, so the
call site and `Step4Preview.test.tsx` are unaffected.

## Audit result (rest of the import flow)

Clean: every colour in the migration feature resolves to a semantic token (no
hex, no raw Tailwind palette, no rgb/hsl literals — the only hex is inside a
code comment documenting the token mapping), no off-scale radius/spacing
arbitrary values, and the flow otherwise uses canonical `@duedatehq/ui`
primitives (Button, Alert, Badge, Skeleton, Dialog, Switch, Table, …).

One violation remains and is **deferred**: `PresetChip` in `Step1Intake.tsx`
hand-rolls a `<button aria-pressed>` toggle chip instead of the canonical
`ToggleChip` primitive. Not fixed here because `Step1Intake.tsx` is in a
parallel session's in-progress (stashed) work; editing it now would conflict.
To do once that work lands.

## Validation

- App typecheck (`tsgo --noEmit`) clean.
- `Step4Preview.test.tsx` 4/4 pass (dedup labels still render).
- Live preview verification deferred — a parallel session is holding the shared
  preview browser on `/alerts`; the swap is to a primitive already proven in
  production surfaces.
