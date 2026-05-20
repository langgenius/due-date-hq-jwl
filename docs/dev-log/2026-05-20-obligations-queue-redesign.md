# 2026-05-20 · Obligations queue redesign (Stripe-style)

## Summary

Sweeping visual overhaul of the Obligations queue page based on a design walkthrough against
Stripe's Transactions reference. The page goes from a 12-column boxed table with redundant sort /
window / needs-action surfaces to a flush 8-column workbench with Stripe-style status scope tabs and
a single row of 4 CPA-oriented action chips.

## Shipped

### Layout

- Removed the `<Card>` frame around the queue. The table now sits flush against the page background
  per DESIGN.md §Layout ("full-width work surfaces") and T8 ("desk, not a stage").
- Page header action cluster reordered: `Export` and `Calendar sync` (outline, the two main data
  actions) lead the cluster; `Saved views` demoted from primary to ghost; `Reset` demoted to ghost.
  No primary CTA on the page — the work is the rows, not a single next action (DESIGN T2).

### Filters

- Replaced the top-right Sort `<Select>` with the existing column-header sort arrows on `Due` and
  `Projected risk`. `smart_priority` and `updated_desc` remain available via URL but are no longer
  in the toolbar — the column-header arrows do the lifting.
- Replaced the `Window` / `Needs action` chip rows with **Stripe-style scope tabs at the top of the
  queue**, one tab per lifecycle v2 status (All / Not started / Waiting on client / Blocked / In
  review / Filed / Completed) carrying a count chip. Active tab takes a 2px accent underline.
- Replaced the legacy chips with **4 CPA action chips**: `Past due`, `Due this week`, `Needs
  evidence`, `Penalty growing`. Pill-shaped per T3, soft-tinted when active.

### Critique pass (2026-05-20 PM) — /distill, /clarify, /quieter, /polish

After the initial sweep, ran `/critique` and acted on the four-command plan that came out of it. All four landed in one pass.

**/distill — single filter bar**

- Merged the two-row filter stack (scope tabs above + action chips below) into one bar:
  `[scope tabs ↔ active ones with counts] · dotted divider · [action chips]`.
- **Auto-hide zero-count scope tabs.** `Blocked 0` and `Completed 0` collapse off the bar; the currently-active scope is always shown even if its count is zero so the selected tab doesn't vanish.
- Added an **Applied-filter breadcrumb** that renders only when ≥2 filters are active (one filter doesn't need an explainer; the active chip already says it). The breadcrumb sits on the search row and includes its own **"Clear filters"** text link — replacing the page-header `Reset` button as the preferred clear affordance for an in-flight filter combo.
- Replaced **pill-inside-pill** scope-tab counts with an inline `<span tabular-nums>` sibling — eliminates the visual stutter the critique flagged.

**/clarify — keyboard hints + audit-anchor surfacing**

- Added a `<kbd>/</kbd>` ghost label in the right gutter of the search input.
- Wired the actual `/` hotkey via `useAppHotkey('/', focusSearch)` so the hint isn't a lie. Lives alongside the existing `J / K / Esc` row-nav hotkeys.
- **Divergent statutory dates render inline** instead of behind a hover-only `*`. When `baseDueDate !== currentDueDate`, both dates appear (internal in `text-text-tertiary`, statutory in `text-text-quaternary` with a `title="Statutory deadline"`). Recall-only marker eliminated.
- Renamed the chip `Penalty growing` → `Penalty input needed`. The semantic it filters on is `exposureStatus === 'needs_input'` — "growing" was a lie.
- Column-naming dedupe: header label is canonically `Projected risk` across sort options, header text, and the `columnLabels` map. Internal field names (`estimatedExposureCents`, `riskMin/Max`) are untouched.

**/quieter — em-dash $0 rows**

- When `exposureCents === 0`, render `<span className="tabular-nums text-text-tertiary">—</span>` instead of an outline pill containing `$0.00`. The outline-pill version was decoration tax; the eye now lands on rows with real dollar exposure.

**/polish — DESIGN.md typography sync + minor cleanup**

- Picked up the **2026-05-20 DESIGN.md update**: numerals are sans-serif by default (`tabular-nums` on Inter), not `font-mono`. Dropped `font-mono` from:
  - the date line under the Due pill
  - the State column cell (mono → `text-text-secondary tabular-nums`)
- Tokenized the Due-column width: `OBLIGATION_QUEUE_DUE_COL_WIDTH = 'min-w-[148px]'` constant replaces the magic `min-w-[140px]` literal.
- Columns dropdown trigger now shows **"(N hidden)"** in muted text when columns are hidden — silent-state fixed.

### Color ladder (calmer reds, real signal)

Before: every past-due row painted a solid white-on-red pill in the Due column, and every row with
a `ready` exposure status painted an amber pill in the Projected risk column regardless of dollar
amount — including `$0.00` rows. Result: nothing stood out because everything was loud.

After:

- **Due column.** `>7 days late` → soft tinted red (`destructive` variant default); `1–7 days late`
  → warning amber with red dot; `0–2 days` → warning amber; `3–7 days` → outline + warning dot;
  `>7 days out` → outline + normal dot. Removed the solid `bg-state-destructive-solid
  text-text-inverted` override so DESIGN.md T4 ("colors are pills, never paint") holds for past-due
  rows.
- **Projected risk column.** `exposure > 0` → amber pill (money is bleeding); `exposure === 0` →
  outline pill. Zero-dollar rows stop pulling the eye.

The eye now lands on rows that are both very late AND have real dollar exposure — the actual
triage signal.

### Table

- Dropped three columns: `Priority` (smart-priority badge — decoration tax, also competed with
  Client for the eye), `Owner` (mostly repeats; can be filtered via `Mine` chip later), `County`
  (only relevant for ~10% of obligations — moves to the drawer).
- Anchored the `Client` cell: `text-[13px] font-semibold text-text-primary`, line-clamped to 2 rows.
- Merged `Internal deadline` + `Days` into a single `Due` column with a stacked cell: relative-time
  pill on top (binding signal), absolute internal-deadline date in mono below. When the statutory
  date diverges from the internal deadline, a `*` marker appears and the tooltip surfaces both.
- Added **adjacency-based row grouping**: when two consecutive rows share a `clientId`, the second
  row's Client cell renders as a small indented connector glyph instead of repeating the name. No
  config — activates wherever the sort happens to cluster a client's filings.

### Contracts / server

- Added `statuses: ObligationQueueFacetOption[]` to the `obligations.facets` RPC output so the new
  scope tabs can render real per-status counts across the firm (not just the loaded page). The
  client falls back to counting loaded rows until the wrangler instance is restarted with the new
  schema.
- Updated three `facets()` test stubs to return the new `statuses: []` field.

### Demo data

- Extended **Lakeview Medical Partners** (client `10000000-…-000000000003`) from 1 filing to 5
  (federal_1120s current + prior year, federal_941, ny_ct3s, ny_sales_st100) so the demo dataset
  exercises the multi-filing client grouping pattern.

## Re-seed required

The dev wrangler instance must be restarted to pick up the contract change, and re-seeded to apply
the demo-data addition:

```
pnpm db:seed:demo
# then restart wrangler in apps/server
```

Until then, the scope-tab counts fall back to counting only the rows currently loaded on the page,
and Lakeview Medical Partners stays at 1 filing.

## What lifecycle v2 still leaks

The Status column shows v2 labels (Filed, In review, Not started, Waiting on client) for rows with
v2 statuses, AND legacy labels (In progress, Paid) for legacy rows. That's the intended
gradual-migration behavior per `docs/Design/obligation-lifecycle-design-brief.md` §10 ("Migration
plan for the four legacy statuses"). Status labeling on the UI side is correct; the leak is a data
migration that needs to land separately.

## Files touched

- `apps/app/src/routes/obligations.tsx` — main page (table cols, scope tabs, action chips, header)
- `apps/app/src/routes/obligations.tsx` — new `ObligationQueueScopeTab` and `ObligationQueueActionChip` helpers
- `packages/contracts/src/obligation-queue.ts` — `statuses` facet field
- `packages/db/src/repo/obligation-queue.ts` — accumulate status counts in `facets()`
- `packages/contracts/src/contracts.test.ts` — extend facet fixture
- `apps/server/src/procedures/_penalty-exposure.test.ts` — mock facets return
- `apps/server/src/procedures/obligations/_service.test.ts` — mock facets return
- `apps/server/src/procedures/migration/_service.test.ts` — mock facets return
- `mock/demo.sql` — 4 additional obligations for Lakeview Medical Partners
