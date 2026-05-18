---
title: 'Rule library: collapse merged sections into compact summary strips'
date: 2026-05-18
author: 'Claude'
area: rules
---

# Rule library: collapse merged sections into compact summary strips

## Context

The merged-three-sections shape we shipped earlier today
(see [2026-05-18-rules-library-merge.md](2026-05-18-rules-library-merge.md))
and then patched with cross-section drill-in + matrix distill + Sources
diagnostics
(see [2026-05-18-rules-library-critique-fixes.md](2026-05-18-rules-library-critique-fixes.md))
solved the _connection_ problem — clicking a pending count in Coverage
now filters the Library table below — but did not solve the _length_
problem. The page was still ~5700 px of three substantial tables stacked,
each with its own filter chips, KPI strip, and pagination footer.

The honest read: Coverage and Sources are _context_, not destinations.
They deserve summary lines, not full tables on this page. The full
detail still lives on the dedicated `/rules/coverage` and `/rules/sources`
routes — reachable in one click from the strip.

## Change

`apps/app/src/routes/rules.library.tsx` rewritten. The page is now:

```
Rule library  (page title + description)
─────────────────────────────────────────────────────────────────
Coverage  3 active · 123 needs review · 52 jurisdictions with gaps    [View coverage map →]
Sources   88 watched · 11 degraded · 0 failing                        [View sources →]
─────────────────────────────────────────────────────────────────
[filter chips: Needs review 123 · Active 3 · Rejected 0 · Archived 0]
[Library table — main content, 25 rows per page, pagination]
```

Two compact `SummaryStrip` rows replace the previously-merged
`<CoverageTab />` and `<SourcesTab />` full views. Inside each strip:

- **`SummaryNumber`** renders one statistic as `<value> <label>`
  (e.g. `123 needs review`). Tone color reflects severity (review /
  warning / destructive / muted / default).
- A number can be:
  - **plain** (informational, e.g. "52 jurisdictions"),
  - **a button** that drills into the Library below by setting the
    `?library=…` URL param (the same param Library already reads),
  - **a `<Link>`** that navigates to the standalone detail route
    (`/rules/sources`, `/rules/coverage`).
- Each strip's trailing `"View …"` link goes to the standalone route
  for the full table.

The earlier drill-in handler (`drillIntoLibrary`) is reused unchanged.
The Library section retains its `#library` anchor so external deep links
keep working.

### Files

- `apps/app/src/routes/rules.library.tsx` — rewritten to render
  `CoverageSummaryStrip`, `SourcesSummaryStrip`, and `RuleLibraryTab`.
  Component types stay in this file (private to the route).
- `apps/app/src/routes/rules.tsx` — legacy `?tab=` redirect map updated:
  `coverage` / `sources` now redirect to `/rules/coverage` and
  `/rules/sources` (their dedicated standalone routes) instead of
  anchored sections on `/rules/library` (those anchors no longer exist).

### Page height comparison

| Iteration                                                        | Scroll height of `/rules/library` |
| ---------------------------------------------------------------- | --------------------------------- |
| v1 — full merged sections                                        | ~5700 px                          |
| v2 — merged sections after critique fixes (matrix distill, etc.) | ~4500 px                          |
| **v3 — summary strips (this commit)**                            | **1981 px**                       |

A 65% reduction from v1. The Library table itself is at scroll position
309 px (just below the page header + the two strip rows) — visible
without scrolling on a standard viewport.

## Why this is better than walking the merge all the way back

- **One sidebar entry preserved** — Yuqi's stated IA preference.
- **Coverage and Sources stay reachable** via the "View …" links plus
  the standalone `/rules/coverage` and `/rules/sources` routes (already
  registered).
- **At-a-glance read still here** — the CPA can open `/rules/library`
  and immediately know "3 active rules · 123 pending · 11 degraded
  watchers" without leaving the page or scrolling.
- **Drill-in cross-section behavior survives** — clicking "123 needs
  review" still filters the Library table below.
- **The detail pages stay first-class** — viewing the full coverage
  matrix or sources health table is a deliberate "I want to dig in"
  action, not something the Library page forces you to scroll past.

## Validation

- `pnpm check` — 1045 files formatted, 576 typechecked, clean
- `pnpm test` — 203/203 vitest tests passing
- Browser verified end-to-end:
  - `/rules/library` renders the two strips + Library table (1981 px)
  - Click `123 needs review` in Coverage strip → URL pushes
    `?library=pending_review` → Library chip flips to active → table
    re-filters
  - "View coverage map" and "View sources" links navigate to the
    standalone routes
