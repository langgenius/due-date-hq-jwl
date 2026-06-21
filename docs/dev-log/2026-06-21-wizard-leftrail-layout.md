# Migration wizard — left-rail stepper layout (opt-in)

**Date:** 2026-06-21
**Area:** `apps/app/src/features/migration` (Migration Copilot wizard)

## What

Added a `stepperLayout?: 'top' | 'rail'` prop to the migration `WizardFrame`
(threaded automatically through `WizardShell` + `WizardRouteShell`). It offers a
vertical left-rail step layout as an alternative to the existing horizontal top
`Stepper`.

- `'top'` (default) — unchanged: horizontal pill row between header and body.
- `'rail'` — a fixed-width (`sm:w-44`) vertical step rail on the leading edge
  with step content beside it; a `Step N of 4` caption sits above the list.

## How

- `Stepper.tsx` gained an `orientation?: 'horizontal' | 'vertical'` prop. The
  horizontal body was extracted to `HorizontalStepper` (byte-identical markup,
  so existing tests + screenshots are unaffected) and a new `VerticalStepper`
  reuses the **same** `STEP_LABELS` data and the same `pillTone`/`circleTone`
  token logic — the two orientations can't drift. Exported `STEP_COUNT` so the
  rail caption doesn't re-derive the length.
- `WizardShell.tsx` renders the horizontal Stepper in the top band only when
  `stepperLayout === 'top'`; for `'rail'` it renders the vertical Stepper inside
  the body region in a flex split. The processing overlay (`transition`) still
  takes over the full body in both layouts.
- Rail is hidden below `sm` (dialog too narrow for a side-by-side split) so the
  content keeps full width on small screens.

## Canon / constraints

- Default stays `'top'`, so `Wizard.test.tsx` / `WizardShell.test.tsx` are
  untouched (5/5 pass). The tests never set `stepperLayout`.
- Reused the canonical `Stepper` step data + tones; no hand-rolled step UI.
- Radius scale respected (`rounded-full` pills, `999`). Urgency = none here;
  the caption is quiet `text-text-tertiary` (size, not weight/red).
- New string `Step {current} of {STEP_COUNT}` extracted + zh-CN added
  (`第 {current} 步，共 {STEP_COUNT} 步`, mirroring the existing
  `Step {step} of {total}` translation); `i18n:compile --strict` passes.

## Verify

- `tsgo --noEmit` → rc 0
- `pnpm -F @duedatehq/app test run Wizard` → 5/5 pass
- `i18n:compile --strict` → pass
