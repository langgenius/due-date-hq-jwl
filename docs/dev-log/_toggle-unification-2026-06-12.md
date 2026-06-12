# Toggle unification — one size/text spec per toggle family

**Date:** 2026-06-12
**Surface:** `ui/segmented`, `primitives/toggle-chip`, `/settings/profile`,
`/billing`, `/alerts`, `/deadlines` filter sheet, `/notifications/preferences`,
`/rules` jurisdiction table, `/preview` gallery, DESIGN doc §primitive table

A full-app sweep (every `<Segmented>`, `<Switch>`, `<ToggleChip>`,
`aria-pressed`, `role="switch"`) found toggle items at h-6/h-7/h-8/h-9/h-10,
text at 12/13/14px, and three different active treatments (flat white pill /
accent tint / solid accent fill + shadow). Consolidated so each family has
exactly one spec per size tier.

## Segmented (pick-one)

- **New `size="lg"`** (h-8 items, `text-base`) on the primitive — formalizes
  the "14px toolbar" decision (Yuqi #4 on /alerts) that was previously done
  with `[&>button]:h-8 [&>button]:text-base` className overrides. The three
  override call sites (alerts work-queue switch, alerts view switcher, rules
  jurisdiction scope) now pass `size="lg"`; `[&>button]` size/text overrides
  are banned (DESIGN table notes this). AlertListRail kept layout-only
  overrides (`w-full [&>button]:flex-1`) and dropped redundant height classes.
- **/settings/profile Time format** — deleted the page-local `SegmentedControl`
  (bordered track, `font-semibold` active weight-shift, `shadow-sm`) and
  swapped in the shared `<Segmented>`; the 12h/24h wiring to the
  display-preference store is unchanged.
- **/billing interval** — replaced the hand-rolled h-11 track whose active
  state was a solid accent fill + `shadow-sm` (the only toggle not using the
  flat language) with `<Segmented size="lg">`. The "Save about 20%" Badge now
  keeps its normal success tone in both states.

## ToggleChip (engaged filter)

- **/alerts Filters popover pills** (`FilterPillSection`) and the **/deadlines
  filter-sheet pills** (`ObligationFilterPill`) were twin hand-rolled dialects
  (h-7 rounded-lg `text-sm`); both now render the canonical `<ToggleChip>`
  (h-7 rounded-full `text-xs`, accent-tint engaged state).
- **Morning-digest day picker** (/notifications/preferences) — was h-10×54
  solid-accent-fill `font-semibold` tiles; now `<ToggleChip size="md">` with a
  fixed `w-[54px]` (no weight shift, tint engaged state).
- `ObligationQueueActionChip` (queue toolbar quick-filter chip) turned out to
  be dead code — exported but referenced only in a comment since the facets
  moved into the filter sheet. Deleted instead of migrated.
- `ToggleChip.disabled` widened to `boolean | undefined` for
  `exactOptionalPropertyTypes` call sites.

## Left intentionally as-is

- The rounded-full **status pill-strip track** (deadlines queue toolbar +
  dashboard brief bucket selector) — a deliberate, internally-consistent
  second dialect, documented at both call sites.
- `PresetChip` (migration intake) — documented bespoke exemption in the
  ToggleChip header.
- Selection affordances that use `aria-pressed` but aren't toggles (list-rail
  rows, map/tilegram tiles, calendar days, sort headers, scope tabs).

## Docs/gallery

- `/preview` gained a Segmented specimen row (sm/md/lg) in the
  Checkbox · Switch section; TOC label updated.
- DESIGN doc primitive-vocabulary table: Segmented row now documents the
  three sizes and bans `[&>button]` size overrides.

## Verification

`pnpm check` clean (0 errors; 29 pre-existing warnings). App test suite:
525 passed, 2 failed — both failures reproduce on a clean tree (Step3Normalize
matrix expectation + AlertsListPage batch-date text), unrelated. Browser-
verified computed styles on /settings/profile (28px/12px/500, no shadow),
/alerts (32px/14px both toolbar toggles), /alerts filter pills + /notifications
day picker (ToggleChip metrics), /billing (flat, borderless, no shadow),
/preview (24/28/32px specimen row). No console errors.
