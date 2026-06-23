# Push each page — signature views as the new default

**Date:** 2026-06-23
**Surface:** `apps/app/src/features/clients/ClientFactsWorkspace.tsx`,
`apps/app/src/features/obligations/queue/DeadlineCardGrid.tsx` (new),
`apps/app/src/routes/obligations.tsx`,
`apps/app/src/features/rules/RuleCoverageMap.tsx` (new),
`apps/app/src/routes/rules.library.tsx`,
`apps/app/src/components/primitives/us-jurisdiction-tiles.ts` (new),
`apps/app/src/features/alerts/components/StateTilegram.tsx`

Each list page gets a distinctive **signature card view**, toggleable against the
old list/table. Goal (Yuqi): reduce cognitive load, align information density
across pages, more personality per page, and a better UX than "a list" — without
leaving the design system.

> **Restore note (2026-06-23, later same day):** this whole feature was dropped
> from `main` by a parallel session's history rewrite and re-applied here (the
> three new files + the wiring came back cleanly via `git cherry-pick -x`, no
> conflicts; catalog strings re-merged from the dropped i18n commit). Per Yuqi's
> call on restore, the **per-page defaults differ**: `/clients` keeps **cards as
> the default** (registry table = toggle), but **`/deadlines` now defaults to the
> table/list** with cards as the opt-in toggle. `readStoredDeadlinesView` returns
> `'table'` unless the browser has an explicit stored `'cards'` choice.

## What shipped

- **`/clients` → portfolio cards** (default; registry table = Segmented toggle,
  persisted). Cards in **urgency swim lanes** (Overdue → Due this week → Upcoming →
  No deadlines). Each card: square monogram + name + entity/state chips + owner;
  a **bold days-to-deadline numeral** whose colour is the card's _only_ urgency
  tone (red late / amber ≤7d / neutral); prose date + form + status. Compact
  (p-3, ~150px), white cards on a gray well for figure/ground.

- **`/deadlines` → deadline cards** (opt-in toggle; **table is the default** — see
  restore note). Same DNA: urgency
  lanes (settled rows parked in a calm **Filed** lane, not scattered red through
  the urgent lanes), countdown hero, gray well. Triage signals the status pill
  can't carry render as **quiet inline icons** (e-file rejected · payment overdue
  $ · awaiting-signature), reusing the table's exact predicates — never a wall of
  red badges.

- **`/rules/library` → Coverage map.** A US **tilegram** in the overview where
  every jurisdiction is a tile coloured by review pressure (red = high-severity
  first · amber = pending · green = reviewed · dim = none); high-severity tiles
  carry a red count bubble. Click drills into the jurisdiction. The 13×8 tile
  layout was extracted to a shared `us-jurisdiction-tiles.ts` so the /alerts map
  (`StateTilegram`) and this map share one geography.

- **`/alerts`** intentionally left as-is — a live feed is the right pattern for a
  monitoring stream; it was already the strongest of the four.

## Design rules reinforced

- Urgency is expressed **once** (the hero numeral's colour) — no red border + red
  text + red bar stacked (the early-iteration mistake).
- At-risk emphasis uses **uniform borders / soft fills**, never a one-sided
  accent bar (incl. inset box-shadow — same broken-corner failure).
- Figure/ground via **border + bg contrast** (white cards on a gray well), no
  card shadows.

## Follow-ups

- ~~`lingui extract` + compile for the new strings~~ — done on restore (22 zh-CN
  strings re-merged from the dropped catalog commit; `compile --strict` clean).
- Regenerate the visual-regression snapshots (`E2E_VISUAL=1`) for `/deadlines`
  and `/rules/library` — the new defaults change those baselines.
- Card view renders the loaded `orderedRows`; lane-level "load more" for very
  large firms is a later add.
