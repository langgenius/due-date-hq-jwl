---
title: 'Coverage page: canonical rebuild to reference design; bin v2/v5/v6 explorations'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Coverage page: canonical rebuild to reference design

## Context

Designer dropped a reference screenshot of the target Coverage page
and said:

> "work on the coverage to this. of course, this is lofi design, so
> you will need to ensure there is design details. bin the unneed
> design explorations"

The reference brings back several elements the PRD §3.1 audit had
removed (specifically the 4-card stats strip) and introduces a new
column structure with per-entity sub-columns, full entity names
(not codes), and three explicit cell states (ACTIVE / NO RULE /
review-dot). The redesign supersedes v2/v5/v6 — those got binned.

## Change

### Binned

- `apps/app/src/features/rules/coverage-cards-view.tsx` (v2)
- `apps/app/src/features/rules/coverage-hybrid-view.tsx` (v5)
- `apps/app/src/features/rules/coverage-rail-view.tsx` (v6 — table + rail)
- `apps/app/src/features/rules/coverage-rule-panel.tsx` (v6 shared)
- `apps/app/src/features/rules/coverage-rule-row.tsx` (v6 + v5 shared)
- `apps/app/src/features/rules/coverage-shared-data.ts` (v2/v5/v6 shared)
- `apps/app/src/routes/rules.coverage-v2.tsx`
- `apps/app/src/routes/rules.coverage-v5.tsx`
- `apps/app/src/routes/rules.coverage-v6.tsx`
- Their entries in `router.tsx`, `route-summary.ts`, and sidebar nav

### Rebuilt — `coverage-tab.tsx`

Full rewrite to match the reference design:

1. **Stats strip** — four non-interactive pills at the top:
   `3 Active rules`, `123 rules pending approval`,
   `77/88 sources working`, `52 Jurisdictions`. Source count is
   registry-wide (sum of `row.sourceCount`), with the "working" half
   subtracting Pulse's degraded + failing counts.

2. **`Entity coverage` section header** — uppercase, tracking-wide
   h2 framing the table block.

3. **`Source needs attention` callout** — yellow-tinted pill with
   `AlertTriangleIcon`, count of degraded + failing sources, and a
   chevron link to `/rules/sources?health=degraded`. Renders only
   when there's an incident.

4. **Two-row table header** — row 1 carries the base columns
   (Jurisdiction / Active / Pending / Source) with rowSpan=2, plus
   an "Entity coverage" colSpan over the 7 entity sub-columns; row 2
   has the entity sub-headers using full labels (LLC / PTS / S-Corp /
   C-Corp / Sole Prop / Individual / Trust).

5. **Row format**:
   - JURISDICTION: `JurisdictionCode` badge + state name
   - ACTIVE / PENDING: `{active} / {pending} Pending` — pending half
     is a blue `<button>` that drills into Library when > 0; active
     half drills into Library filtered to active when clickable
   - SOURCE: green-tinted circular count badge + descriptor text
     ("Official sources — pending rules" / "Practice review required"
     / "Awaiting sources" depending on row state)
   - ENTITY cells: three explicit states
     - `verified` → `ACTIVE` green-tinted uppercase pill
     - `review` → small orange dot
     - `none` → `NO RULE` muted gray uppercase pill

### Route header

`apps/app/src/routes/rules.coverage.tsx`:

- Title: `Coverage status` → **`Rules`** (matches the H1 in the reference)
- Description: rewritten to PRD-aligned product copy —
  > "Source rules determine filings, status, and C/O materials. Only
  > practice-approved rules can generate reminder-ready obligations;
  > pending rules remain hidden — only their owner or admin can review
  > or edit them."

### Sidebar

`Coverage status` → **`Coverage`** in the Rules group. Sidebar IA
otherwise unchanged in this pass (the reference design hints at a
restructured IA with `Coverage` under `Operations` — out of scope for
this turn).

### Tests

`coverage-tab.test.tsx` — updated header expectations to the new
canonical set (`Jurisdiction`, `Active / Pending`, `Source`,
`Entity coverage`, then 7 sub-cols), and updated the per-row cell
count from 12 (old) to 10 (new: 3 base + 7 entity).

## Design polish details added

- Stat pills use border + neutral bg; number in mono semi-bold, label
  in tertiary
- Stats strip wraps to multi-line on narrow widths
- Source-attention callout's chevron icon nudges on hover
  (`translate-x-0.5`)
- Header row uses `bg-background-subtle/60`; sub-header row uses
  per-cell `border-l` so the entity columns visually group
- Row hover state via `bg-background-subtle/40`
- "ACTIVE" pill uses `bg-status-done/15` + `text-status-done`
- "NO RULE" pill uses `bg-background-subtle` + `text-text-tertiary`
- Review-state dot uses `bg-severity-medium` (the same warning tone
  as the source-attention callout — consistent semantic)
- Source count badge: 6×6 circular pill, `bg-status-done/15` when > 0

## Verified

- `pnpm exec tsc -p apps/app/tsconfig.json --noEmit` → exit 0
- Tests skipped due to pre-existing `babel-plugin-macros` runner issue
  unrelated to this change
- Browser preview at `/rules/coverage`:
  - Sidebar shows just **Coverage** + **Catalog** under Rules (no
    v2/v5/v6 entries)
  - Title reads `Rules` with the new description
  - Stats: `3 Active rules · 123 rules pending approval · 77/88 sources
working · 52 Jurisdictions`
  - `ENTITY COVERAGE` h2 + yellow source-attention callout
    ("Source needs attention · 11 sources →")
  - All 52 jurisdictions render with the new column layout
  - California row shows `NO RULE` in PTS, `ACTIVE` in S-Corp and
    C-Corp, orange dots elsewhere — matches the seed data
  - Florida row shows `NO RULE` in LLC/PTS/S-Corp, dots elsewhere
  - New York row shows `ACTIVE` in C-Corp
  - All other rows: orange dots across the entity columns (review
    state default)

## Files

- `apps/app/src/features/rules/coverage-tab.tsx` (rewrite)
- `apps/app/src/features/rules/coverage-tab.test.tsx` (update)
- `apps/app/src/routes/rules.coverage.tsx` (title + description)
- `apps/app/src/routes/route-summary.ts` (drop v2/v5/v6; rename Coverage)
- `apps/app/src/router.tsx` (drop v2/v5/v6 routes)
- `apps/app/src/components/patterns/app-shell-nav.tsx` (drop v2/v5/v6 nav; rename Coverage)
- Deletions:
  - `apps/app/src/features/rules/coverage-cards-view.tsx`
  - `apps/app/src/features/rules/coverage-hybrid-view.tsx`
  - `apps/app/src/features/rules/coverage-rail-view.tsx`
  - `apps/app/src/features/rules/coverage-rule-panel.tsx`
  - `apps/app/src/features/rules/coverage-rule-row.tsx`
  - `apps/app/src/features/rules/coverage-shared-data.ts`
  - `apps/app/src/routes/rules.coverage-v2.tsx`
  - `apps/app/src/routes/rules.coverage-v5.tsx`
  - `apps/app/src/routes/rules.coverage-v6.tsx`

## Open

- **Sidebar IA**: the reference design groups `Coverage` under
  `Operations` and replaces `Radar` / `Opportunities` with `Contacts`,
  `Team`, `Team workload`, `Payments`, `Billing`, `Audit log`. That's
  a separate sidebar restructure — kept out of this turn so the
  Coverage page change doesn't ride alongside a navigation rework.
- **Stat-card click targets**: the reference shows them as plain
  pills. If you want them clickable (e.g., "123 rules pending
  approval" drills to Library `?library=pending_review`), it's a
  small addition.
- **Source descriptor logic**: the row's descriptor currently picks
  between "Official sources — pending rules" / "Practice review
  required" / "Awaiting sources" based on counts. Worth refining once
  we know the source registry's notion of "needs attention" at the
  source level (Pulse health is a different axis).
