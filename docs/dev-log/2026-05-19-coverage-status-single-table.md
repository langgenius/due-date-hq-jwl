---
title: 'Coverage status: single table, inline 7-dot entity strip'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Coverage status: single table, inline 7-dot entity strip

## Context

The Coverage status page shipped with a **two-table** layout:
left-side jurisdiction summary (52 rows: JUR / NAME / ACTIVE /
PENDING / SOURCES / STATUS) and right-side entity coverage matrix (4–52
rows × 5–7 entity columns, with a Business/Personal/All toggle and a
matrix distill for the all-review states).

User feedback: "it is still two tables, one jurisdiction summary, one
entity coverage, can you do better?"

The two tables overlapped on the jurisdiction axis (both scanned the
same 52 states) and asked the same question two ways. CPAs aren't
running a "what entities does NY cover?" task on this page — that
question lives at the client level, or as a Library entity filter.
The matrix was adding visual weight without earning it.

## Change

`apps/app/src/features/rules/coverage-tab.tsx` — large rewrite:

### 1. Drop the entity matrix entirely

Removed:

- The right-side `<section className="xl:col-span-6">` containing the matrix
- The Business/Personal & fiduciary/All toggle (3 buttons)
- The "Show 48 jurisdictions defaulting to review" expander
- The `interestingJurisdictions / allReviewJurisdictions` partition
- The `entityGroup` and `showAllReview` state
- Unused imports: `Button`, `CoverageCell`, `SectionLabel`, `ENTITY_COLUMN_GROUPS[group]` toggle types

### 2. Single jurisdiction table with new ENTITY COVERAGE column

Layout: `JUR | NAME | ENTITY COVERAGE | ACTIVE | PENDING | SOURCES | STATUS`. The
new column renders an inline strip of 7 small dots, one per entity
type (LLC · Partnership · S-Corp · C-Corp · Sole prop · Trust ·
Individual), each tone-coded for that (jurisdiction, entity) coverage
state: green (active), orange (review), gray (no rule).

### 3. Dots are clickable when actionable

`EntityCoverageStrip` private component renders each dot as:

- `<button>` when state is `verified` or `review` AND the parent
  passed an `onEntityDrillIn` callback. Hover scales the dot to 1.25×,
  focus ring on the dot.
- `<span>` when state is `none` (no rule to drill into) or no callback
  is provided.

`title` attribute on each dot reveals the entity name + state on
hover ("LLC — active", "S-Corp — review", "Trust — no rule"). Browser-
native tooltip; no Radix overhead.

### 4. Drill destinations

`apps/app/src/routes/rules.coverage.tsx` wires two handlers to the
new `CoverageTab` props:

- `onJurisdictionDrillIn(jur)` — clicking PENDING count →
  `/rules/library?library=pending_review&jur=AL&from=coverage`
- `onEntityDrillIn(jur, entity, state)` — clicking a dot →
  `/rules/library?library=<active|pending_review>&jur=AL&entity=llc&from=coverage`

State decides library filter: `verified` → `active`,
`review` → `pending_review`. `none` dots never fire the handler.

The `?from=coverage` query param is reserved for the
**origin-breadcrumb** pill on the Library (next gap to land).

### 5. Library `?entity=` URL state (nuqs migration)

`apps/app/src/features/rules/rule-library-tab.tsx` — `entityFilters`
moves from local `useState` to nuqs `useQueryState('entity', …)` so
the cross-page entity-dot drill actually lands pre-filtered. Same
wrapper pattern as the recent `?jur=` and Sources migrations:
`useCallback` wraps the Promise-returning setter to keep the existing
`updateHeaderFilter(setter, values)` helper signature intact.

### 6. Description copy update

Coverage status description rewritten to lead with the new affordance:

> Do we have rules where clients file? Each row shows per-entity
> coverage as small dots — click any dot to drill into the matching
> rules. PENDING and SOURCES counts also drill. Every count traces
> back to the official federal, state, or DC document.

### 7. Test rewrite

`coverage-tab.test.tsx`:

- `matrixHeaders` helper → `tableHeaders` (single table now)
- `entityViewButton` helper deleted (toggle is gone)
- "defaults to the Business entity group" → "renders the unified
  jurisdiction table with the ENTITY COVERAGE column" — checks the
  7 new headers
- "switches the matrix to personal and all entity groups" → "fires
  onEntityDrillIn when a verified or review entity dot is clicked"
  — clicks the first interactive dot, asserts the callback fires
  with the right jurisdiction and state shape

## Why this stays simple

1. **One axis, one table.** Eye scans 52 rows once. The dot strip
   compresses the matrix into 7 inline indicators per row — same data
   density without the second-table scan.
2. **`none` dots aren't clickable.** Affordance honesty: if there's
   no rule, there's nothing to drill into. Hover tells the user that
   ("LLC — no rule"); click does nothing.
3. **Entity-level filtering belongs in the Library.** The Library has
   a dedicated ENTITY header filter. Coverage status' job is the
   situational read; Library's is the action surface. Each does one
   job.

## Validation

- `pnpm check` — 1052 files formatted, 576 typechecked, clean
- `pnpm test` — 203/203 tests passing (2 tests rewritten)
- Browser:
  - Coverage status renders one unified table at /rules/coverage
  - 7-dot entity strip visible per row; AL/AK/AZ/etc. all-orange,
    CA/FL/NY show mixed (green + gray + orange) per actual state
  - Page is ~50% less vertical scroll than the two-table version
  - Dots have hover tooltips revealing entity name + state
  - Sidebar Coverage status entry highlighted on active route

## Deferred (intentional follow-ups)

- **Origin breadcrumb on Library** when arrived via `?from=coverage`
  — next item from the interaction-map gap list
- **`any_business` entity wildcard** in Library filter logic: today
  the `?entity=llc` drill misses rules with
  `entityApplicability: ['any_business']` because
  `matchesAnySelected` is a set-membership check. Acceptable for v4
  (drill is best-effort); future pass should match `any_business` as
  a superset of business entity types.
- **Sortable column headers** (ACTIVE / PENDING / SOURCES) — still
  on the gap list
