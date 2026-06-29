# Onboarding step 2 side-by-side, migration wizard polish, standard auth lockup

**Date:** 2026-06-29
**Files:**

- `apps/app/src/features/auth/auth-chrome.tsx`
- `apps/app/src/features/onboarding/welcome-offer-step.tsx`
- `apps/app/src/features/onboarding/state-rule-activation-selector.tsx`
- `apps/app/src/routes/onboarding.tsx`
- `apps/app/src/features/migration/Stepper.tsx`
- `apps/app/src/features/migration/Step1Intake.tsx`
- `apps/app/src/features/migration/Step2Mapping.tsx`
- `apps/app/src/routes/migration.new.tsx`

## Why

Continued live QA of the onboarding funnel + the import wizard (Yuqi). Several
recurring themes: an active-state treatment colliding with the primary button,
redundant/inconsistent labels, and the auth lockup not matching the rest.

## What changed

### Auth lockup → standard mark + logotype (Yuqi's call)

`AuthBrandAnchor` now renders the **standard horizontal lockup** — `BrandMark`
(framed bars tile) + `BrandLogotype` — instead of the all-in-one `BrandWordmark`.
Same construction the entry layout uses, so every auth surface (login,
onboarding, 2FA, accept-invite) shares one lockup. Header logo also sized down
(`h-6`→`h-5`). `markClassName` sizes both halves to the same height.

### "Active state ≠ primary button" (recurring)

- **Welcome offer badge**: the "3 months of Team — free" promo was the accent
  tint (= selected-chip style); now a **solid green** promo fill (distinct
  "free/offer" register, not a control).
- **Wizard Stepper**: the active step pill was `bg-state-accent-solid` (= the
  Continue button); now the engaged **accent tint** + navy number circle.
  Distinct from the primary CTA. Both horizontal + vertical steppers.

### Onboarding welcome step

Promo badge restyle (above). (Earlier in the session: task-led title, loud
offer, wider — see the prior dev-log.)

### Onboarding step 2 — side-by-side

At `lg`, text fields on the **left**, the state-rule tilegram on the **right**
(`grid-cols-[1fr_460px]`), step widened `800`→`1080`. Selector's top margin
removed so it aligns; CTA constrained (`lg:max-w-md`) so it isn't stretched.
Stacks to one column below `lg`.

### Import wizard cleanups

- **Top header** (`migration.new.tsx`): removed the "Import · Deadlines · Risk
  view" outcome chips — they restated the description sentence (busy header).
- **Upload step** (`Step1Intake.tsx`): "Source set to …" + "Remove file"
  consolidated onto one quiet line under the file card (was two stacked lines).
- **Match-columns** (`Step2Mapping.tsx`): the sentence count readout is now
  `sr-only` (the colored chips are the single visible count — was
  double-counting); ignored rows read a clean **"Not imported"** (was a clipped
  "Ignore this colu…"); status badge **"Ignored" → "Skipped"** to match the chip.

## Open (not done — needs decisions)

- `Step2Mapping` "Name match — review" badge: reword (it shows on Email/Phone
  rows, reads as "name field") and reconcile with the "0 need review" count.

## Notes

`tsgo --noEmit` clean for `apps/app`; HMR verified. Lockup proportions sized
mark==logotype height — may want the tile a notch larger (pending Yuqi's eye).
