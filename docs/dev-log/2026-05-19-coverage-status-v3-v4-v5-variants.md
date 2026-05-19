---
title: 'Coverage status v3/v4/v5: Kanban, Tiles, Hybrid + shared rule preview panel'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Coverage status v3/v4/v5: Kanban, Tiles, Hybrid + shared rule preview panel

## Context

`/rules/coverage` (v1, table) and `/rules/coverage-v2` (cards) had landed
but neither felt fully right. Designer feedback: "the source corresponds
to the rule — you should show the rule as a row as well; can you
categorise each jurisdiction? I like card display but it's not 100%
suitable; being creative and having alternative design solutions is good."

Three open questions:

1. **What's the dominant axis?** v1/v2 group by jurisdiction. Maybe
   action-category (approval / verify / auto / standard) reads faster.
2. **Atomic unit?** Source-only doesn't say what the source backs.
   `[Rule title] ↗ Source it cites` is the right pair.
3. **Click contract for rule + source?** Two adjacent affordances on
   the same row was the source of v1's ambiguity. Need to separate
   targets cleanly.

## Change

Built three parallel variants behind `/rules/coverage-v3`,
`/rules/coverage-v4`, `/rules/coverage-v5`, all sharing one rule preview
panel primitive. v1/v2 untouched — the four variants stay side-by-side
for direct comparison.

### Shared primitives

**`coverage-shared-data.ts`** — single hook that bundles four queries
(`rules.coverage`, `rules.listSources`, `rules.listRules`,
`pulse.listSourceHealth`) and derives the five indexes every variant
needs (`sourcesByJurisdiction`, `pendingRulesByJurisdiction`,
`sourceById`, `sourceHealthCounts`, `totalSources`). TanStack dedupes
the underlying fetches across variants, so switching pages is cheap.

`categorizeCoverageRow(row)` returns one of four action lanes:

- `FL` → `auto_managed`
- `WA` → `manual_verify`
- `pending > 2` OR special jurisdiction (`FED, CA, NY, TX`) → `needs_approval`
- everything else → `standard`

The `> 2` threshold (not `> 0`) matches v1's `needsAttentionRows`
predicate. Every state has 1–2 routine review rows in seed data; the
threshold prevents the approval lane from drowning in routine entries.

**`coverage-rule-panel.tsx`** — URL-driven side panel wrapping the
existing `RuleDetailDrawer`. Reads `?rule=<id>` via nuqs so the panel
is deep-linkable and survives back/forward. Variants mount one
`<CoverageRulePanel />` near their root and call `openRule(id)` from
any rule row.

**`coverage-rule-row.tsx`** — Single row primitive used by all three
variants. Two non-overlapping click targets:

```
[ Rule title ──────────────── ]   [ Source ↗ ]
   onClick → onSelect(rule.id)        target="_blank"
   (opens side panel)                 (opens cited URL)
```

The source link calls `event.stopPropagation()` on both `onClick` and
`onKeyDown` so the rule click never collides with the citation jump.

### v3 — Kanban-by-action (`/rules/coverage-v3`)

Four columns: Needs approval / Auto-managed / Manual verify / Standard
queue. Cards within each column list the jurisdiction's pending rules
inline (up to 3) with their cited sources. Standard queue rendered as
a compact row stack (single line per jurisdiction) because by definition
those rows don't earn full cards.

### v4 — Dashboard tiles (`/rules/coverage-v4`)

Dense tile grid (2–6 columns responsive). Sort: category first
(approval > verify > auto > standard), then PENDING desc. Each tile
shows: big PENDING number (clickable to Library), entity coverage
microstrip, active/sources stats footer, expandable rule list with
click-to-panel. Trades v3/v5's per-rule readability for raw density.

### v5 — Hybrid sections (`/rules/coverage-v5`) — recommended

Sections by action category, content weight tuned per section:

- **Needs your approval** → rich cards (pending rules + cited sources
  - watched sources list + "more in Library" CTA)
- **Manual verify** / **Auto-managed** → slim cards (status text + 2
  source links + drill-in CTA)
- **Standard queue** → chip grid, collapsed by default

The bet: not every section deserves the same visual weight; cognitive
load per section should match the time a user spends there.

### Router / nav

- `route-summary.ts`: added `rulesCoverageV3/V4/V5` entries
- `router.tsx`: registered lazy routes for each
- `app-shell-nav.tsx`: added three sidebar entries under Rules

## Why these specific designs

- **Action-first grouping (v3/v5)** answers "what's on my plate?"
  faster than alphabetical jurisdiction order. The table answers
  "tell me about state X"; the Kanban/sections answer "what should I
  do next."
- **Tile dashboard (v4)** is for situations where the user wants
  density — scanning 52 jurisdictions on one viewport, with hot
  states top-left. Pays for that density by losing per-rule detail
  on the tile face (recovered via the expander).
- **Shared rule preview panel** keeps users in scanning mode.
  Library-as-destination was breaking the scan-vs-commit boundary;
  the panel is preview + light action ("approve"/"open in Library"),
  full page is for deep edit. Progressive disclosure for free.
- **Single click target per element**: rule title → panel; source →
  external URL; never the same target doing two things.

## Notes

- `pendingRulesByJurisdiction` only includes `pending_review` and
  `candidate` rules — this is what the "pending" CTAs in each card
  surface. Active rules drill via the big PENDING number → Library.
- v3 Kanban's "Standard queue" column shows 46 jurisdictions in seed
  data; in production this may be smaller. Either way the column is
  the visual sink — it absorbs alphabetical noise without making the
  user scan it row-by-row.
- v4 sort: hot tiles land top-left at first paint. Designed for a
  bookmark-and-scan workflow rather than a working-down-the-list one.
- The "Coverage status (v2)" cards page is now one of four; the
  sidebar lists all four together. Once a direction is picked, the
  losers get archived (route + nav entry + view file + dev-log
  cleanup note).

## Files

- `apps/app/src/features/rules/coverage-shared-data.ts` (new)
- `apps/app/src/features/rules/coverage-rule-panel.tsx` (new)
- `apps/app/src/features/rules/coverage-rule-row.tsx` (new)
- `apps/app/src/features/rules/coverage-kanban-view.tsx` (new)
- `apps/app/src/features/rules/coverage-tiles-view.tsx` (new)
- `apps/app/src/features/rules/coverage-hybrid-view.tsx` (new)
- `apps/app/src/routes/rules.coverage-v3.tsx` (new)
- `apps/app/src/routes/rules.coverage-v4.tsx` (new)
- `apps/app/src/routes/rules.coverage-v5.tsx` (new)
- `apps/app/src/router.tsx` (add 3 lazy routes)
- `apps/app/src/routes/route-summary.ts` (add 3 summary entries)
- `apps/app/src/components/patterns/app-shell-nav.tsx` (add 3 nav items)

## Verified

- `pnpm exec tsc -p apps/app/tsconfig.json --noEmit` → exit 0
- Existing `coverage-tab.test.tsx` (2 tests) → pass
- Browser preview:
  - v3 renders 4 columns with meaningful split (4 approval / 1 auto /
    1 verify / 46 standard); cards list pending rules with sources
  - v4 renders sorted hot-first (FED 14, NY 9, CA 7, TX 4 top row);
    "Show rules" expander works
  - v5 renders 4 needs-approval cards (CA, NY, FED, TX) with inline
    rules + sources, plus slim WA/FL cards and collapsed standard
  - Click rule title → `?rule=` URL state + side panel opens with
    full rule detail (Applicability, Due-date logic, Extension,
    Evidence, Accept/Reject actions)
  - Click source citation → no panel opens, navigates to external URL
