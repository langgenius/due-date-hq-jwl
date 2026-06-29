# Onboarding funnel consistency + /today first-run empty-state polish

**Date:** 2026-06-29
**Files:**

- `apps/app/src/routes/onboarding.tsx`
- `apps/app/src/features/onboarding/welcome-offer-step.tsx`
- `apps/app/src/features/onboarding/state-rule-activation-selector.tsx`
- `apps/app/src/routes/dashboard.tsx`
- `apps/app/src/features/dashboard/create-choice-cards.tsx`

## Why

Continued live QA on the post-login funnel (Yuqi, inline annotations).

## What changed

### Onboarding funnel — consistent step width

All three step screens (welcome / practice setup / rule review) now share
`max-w-[720px]`, so the card no longer resizes as the user advances. Step 2's
card chrome was also aligned to step 1 (`px-6 py-6 lg:px-8 lg:py-6`, tighter
field gaps) for one consistent padding scale and to fit the viewport.

### State-rule selector — lighter "selected" tiles

Yuqi: "all selected looks ugly · the tick is not seeable · too much navy."
Selected tiles went from a solid navy fill (`bg-state-accent-solid`,
white text, `shadow-sm`, a tiny corner check) to a **light accent tint**
(`bg-state-accent-hover-alt` + `text-text-accent` + soft `/40` border). At
51/51 the map now reads as calm coverage, not a wall of navy. The illegible
`size-3` corner check was dropped — the tint + navy code is the "on" signal.

### /today first-run empty state — right-sized + refined

Yuqi: title weird / size wrong · "Get started" badge wrong · cards too tall ·
overall too rough.

- Heading `text-display-large` → `text-xl` — it was bigger than the page title;
  now a calm section heading under "Today".
- Removed the bordered **"Get started"** eyebrow pill (a redundant second
  eyebrow under "Good evening, Olivia").
- `CreateChoiceCards`: smaller icon chip (`lg`→`md`), tighter gap (`4`→`3`),
  dropped the forced `min-h` (buttons still bottom-align via `mt-auto` + grid
  stretch) — shorter cards.
- Shortened the three card descriptions so they fit two clean lines instead of
  truncating mid-word ("every deadlin…").
- **Primary path:** the "Import clients" card now has a filled primary CTA while
  the other two stay outline — the highest-value first action reads as the
  obvious next step (the rest remain available).

## Notes

`tsgo --noEmit` clean for `apps/app`; HMR verified on the running dev server.
