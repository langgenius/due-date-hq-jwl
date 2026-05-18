---
title: 'Coverage status: snapshot strip + per-row source citations'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Coverage status: snapshot strip + per-row source citations

## Context

Sibling pass to the IA promotion in
[2026-05-19-rules-ia-coverage-status-promotion.md](2026-05-19-rules-ia-coverage-status-promotion.md).
That pass moved Coverage status into the sidebar but the page itself
still rendered the legacy CoverageTab — a 4-card hero strip on top of
the jurisdiction table.

Two problems with the hero strip:

1. **AI-slop pattern.** "4 hero metrics in equal-width cards" reads as
   a marketing dashboard, not a working operations page. The eye lands
   on the cards before the actual situational read.
2. **No source-of-truth credential.** The strip showed
   `88 Sources watched` as a number, but there was no inline pointer
   when sources were degraded. CPAs couldn't tell at a glance whether
   the system's underlying data feeds were healthy — they had to
   navigate to /rules/sources to find out.

And on the per-jurisdiction table itself, the SOURCES column was a
plain text count. No drill to verify which documents back the rules
for, say, California — even though the user's directive across this
session was "include sources of truth as much as possible."

## Change

### 1. Snapshot strip replaces the 4-card hero grid

`apps/app/src/features/rules/coverage-tab.tsx` — added two private
components and removed `StatCell`:

```
Before (4 cards, ~96 px tall):

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ ACTIVE RULES │ NEEDS REVIEW │ SOURCES W..  │ JURISDICT..  │
│      3       │     123      │     88       │      52      │
│ accepted by  │ owner/mgr    │ official     │ 0 fully …    │
└──────────────┴──────────────┴──────────────┴──────────────┘

After (one h-10 strip, newspaper-kicker rhythm):

┌─────────────────────────────────────────────────────────────┐
│ 3 active · 123 needs review · 52 jurisdictions  ⚠ 11        │
│                                                  degraded → │
│                                                  Sources    │
└─────────────────────────────────────────────────────────────┘
```

The strip is bordered (Level 1 surface), labels are inline with `·`
separators, and the right cluster carries the page's
source-of-truth credential.

The right-side `Sources` pointer has two states:

- **Incident** (any degraded or failing source): bordered pill with
  warning + destructive tones for the counts, chevron, link to
  `/rules/sources`.
- **Healthy** (all sources clean): plain `N sources watched →` with
  hover underline, link to `/rules/sources`.

Either way, the pointer is always there. CPAs never have to dig to
find out which documents back the rules.

`SnapshotNumber` carries the tone-vs-affordance contract from the old
Library `SummaryNumber` (preserved in the dev log
[2026-05-18-rules-library-polish-v2.md](2026-05-18-rules-library-polish-v2.md)):
`tone` = severity, never affordance. Click-targets get their own
bordered pill or hover affordance.

Hooks added: `usePulseSourceHealthQueryOptions` joined into the
existing coverage query, aggregated into `{ degraded, failing }`
counts. The page doesn't gate on source-health load — registry counts
render immediately and the source-health pill paints in when Pulse
responds.

### 2. Per-row SOURCES count is a deep link

`apps/app/src/features/rules/coverage-tab.tsx` — the SOURCES cell in
the JURISDICTION SUMMARY table:

```tsx
{
  row.sourceCount > 0 ? (
    <Link
      to={`/rules/sources?jur=${row.jurisdiction}`}
      aria-label={t`View ${row.sourceCount} watched sources for ${jurisdictionLabel(row.jurisdiction)}`}
      className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
    >
      {row.sourceCount}
    </Link>
  ) : (
    row.sourceCount
  )
}
```

Clicking `6` next to California lands on `/rules/sources?jur=CA` with
the jurisdiction filter already applied — the 6 California source
documents are immediately visible, ready for verification.

Affordance: underline-on-hover + focus ring, no tone change. Matches
the PENDING cell drill pattern that ships in the same table.

### 3. Sources tab reads `?jur=` from the URL (nuqs migration)

`apps/app/src/features/rules/sources-tab.tsx` — converted
`jurisdictionFilters` from local `useState<string[]>([])` to nuqs
`useQueryState('jur', jurisdictionParser)`. Parser configured with
`history: 'replace'` to avoid polluting browser history on every
filter tap (same pattern as the Library tab).

A small `useCallback` wrapper keeps the existing
`updateHeaderFilter(setter, values)` helper signature intact (nuqs
setters return a Promise; the helper expects void).

### 4. Test mock extended

`apps/app/src/features/rules/coverage-tab.test.tsx`:

- Added `pulse.listSourceHealth` to the rpc mock (snapshot strip now
  queries it).
- Wrapped render with `<MemoryRouter>` (snapshot strip + SOURCES
  column both render `<Link>` now).
- New `sourceHealthQueryFn` mock defaults to `{ sources: [] }`
  (healthy state — pointer renders the muted variant).

## Why these changes stay durable

1. **"Every count traces back."** The page description committed to
   this on 2026-05-19 morning. The right-side pill in the snapshot
   and the per-row SOURCES link make it true. No count on this page
   is now a dead-end number.
2. **Newspaper-kicker rhythm over hero-metric cards.** The snapshot
   reads top-to-bottom-left-to-right as one sentence, not four blocks.
   It's a working ops page, not a marketing page.
3. **URL-driven cross-page filters.** Library, Sources, and Coverage
   status all share the `?jur=` convention. A future "show me
   everything for jurisdiction X" link can be assembled from URL
   params without touching component state.

## Validation

- `pnpm check` — 1049 files formatted, 576 typechecked, clean
- `pnpm test` — 203/203 tests passing
- Browser:
  - Snapshot strip renders, "11 degraded → Sources" pill links to
    /rules/sources
  - SOURCES count per row links to /rules/sources?jur=<code>
  - Clicking 6 next to California lands on /rules/sources?jur=CA
    with the jurisdictional filter active, table filters to 6 rows
- AI-slop check: 4-card hero strip removed; remaining surface is the
  jurisdiction summary table + entity coverage matrix (both
  table-driven, not card-driven)

## Deferred

- **Coverage status sortable columns**: per-jurisdiction table is
  currently fixed alphabetical. Sortable headers (ACTIVE / PENDING /
  SOURCES) would let CPAs scan "where do we have the most pending
  work?" in seconds.
- **Two-zone sort (Needs attention vs All clear)**: a stronger
  version of the matrix distill, applied to the jurisdiction summary
  itself.
- **Library row source citations**: still on the deferred list from
  the IA promotion pass. Adds a SOURCE column with document name +
  link per rule row.
