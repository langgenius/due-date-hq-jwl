# First-run create-choice cards on /today

_2026-06-21 · Yuqi refs: the AI Agent / Podcast / Sound Effect create-type
choice cards (soft card + icon-illustration + title + 2-line desc + primary
button)_

The `/today` first-run surface (`showFirstRun` — a fresh practice with zero
clients) led with a single-CTA `<ClientsEmptyState>` import hero. Replaced it
with a richer **get-started chooser**: three create-choice cards adapting the
reference pattern to our three real "ways to add".

## What shipped

New `apps/app/src/features/dashboard/create-choice-cards.tsx` exporting
`<CreateChoiceCards>` — a 3-up responsive grid (1 / sm:2 / lg:3). Each card:

- `rounded-xl` wrapper, **border + bg lift only** (no shadow); hover nudges the
  border to `divider-deep` + a faint section wash so the whole card reads as one
  affordance.
- A `DuotoneIcon` chip (size `lg`) — **import = brand**, **client = accent**,
  **deadline = success** — over a faint, decorative grid motif masked into the
  top-right corner (CSS gradient, `aria-hidden`, behind content).
- Title + two-line `line-clamp-2` description + a full-width primary `Button`
  with a trailing arrow.

Every CTA is wired to the **real action**, no fiction:

- **Import clients** → `useMigrationWizard().openWizard()` (bulk migration wizard).
- **Add a client** → controlled, trigger-less `<CreateClientDialog>` + the same
  `clients.create` mutation `DashboardAddMenu` uses (invalidate client list +
  dashboard, toast, navigate to the new client).
- **Add a deadline** → controlled `<CreateObligationDialog>` (no `defaultClientId`
  → dashboard mode), the rule-backed create-from-rules path.

Per-card permission gating mirrors `DashboardAddMenu`: without `migration.run`
/ `client.write` the card's Button is disabled and the required-role line shows
(`requiredRolesLabel`).

`routes/dashboard.tsx`: the `showFirstRun` branch now renders a "Get started"
eyebrow + "Add your first work" heading + intro line + `<CreateChoiceCards>`,
gated to the unchanged `showFirstRun` condition. Removed the now-unused
`ClientsEmptyState` / `useMigrationWizard` / `useFirmPermission` imports +
locals from the route (the cards own those concerns now).

## Small enabling change

`CreateObligationDialog` got an optional `hideTrigger` prop (mirrors
`CreateClientDialog`) so a programmatic caller can drive it without rendering
the built-in "Add deadline" trigger button.

## Notes

- `ClientsEmptyState` is retained — it's still the `/clients` empty-state hero;
  only the `/today` first-run consumer changed.
- 7 new strings, zh-CN added, `i18n:compile --strict` clean. tsgo 0, build green.
