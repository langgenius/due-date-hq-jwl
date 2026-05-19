---
title: 'Library: reserve citation line — placeholder when absent'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Library: reserve citation line — placeholder when absent

## Context

Gap #6 from the [interaction map](../product-design/rules/04-rules-interaction-map.md):

> Library row click expands cell height to 3 lines (title + id +
> SOURCE). Some rules cite 0 sources → no citation → row is 2 lines.
> Inconsistent vertical rhythm.

Current demo data has citations on every row, so the variance is
theoretical. But the codebase contract allows `sourceIds: []` (a rule
with no cited source). When that lands in production data, the row
height would shrink for those rules and the table rhythm would skip a
beat.

## Change

`apps/app/src/features/rules/rule-library-tab.tsx` — `RuleSourceCitation`:

```tsx
if (sourceById.size === 0) return null            // sources loading
if (sourceIds.length === 0) {
  return <span …>No source on file</span>          // honest absence
}
const firstSource = sourceById.get(sourceIds[0] ?? '')
if (!firstSource) {
  return <span …>Source unavailable</span>         // sourceId missing from registry
}
// normal citation render
```

Three branches:

1. **Loading**: `sourceById.size === 0` means the sources query
   hasn't resolved. Render nothing — better than flickering a
   placeholder that immediately replaces itself.
2. **Empty by design**: rule has no `sourceIds`. Render muted
   "No source on file". Honest about provenance gap.
3. **Stale reference**: rule cites an id that isn't in the loaded
   registry. Render muted "Source unavailable". Rare but possible if
   a source was archived after a rule was created.

After load, every row in the catalog has a third line — citation, "No
source on file", or "Source unavailable". Table rhythm holds.

## Why this stays durable

1. **Load-aware**: distinguishes "still loading" from "honestly empty".
   Avoids flicker.
2. **Three honest states**: present, absent, stale. None of them lie
   about provenance. Critic could still ask for stronger guarantees on
   state (3) — but the rule-detail drawer already shows full evidence,
   so the row-level placeholder is just a hint.

## Validation

- `pnpm check` — 1057 files formatted, 576 typechecked, clean
- `pnpm test` — 203/203
- Demo data: all 25 visible Library rows render the citation (no
  placeholders observed today). Placeholder branches verified by code
  inspection.

## Closes interaction-map gap #6

Variance is now consistent post-load: every row renders three lines.
The "accept the variance" alternative was rejected because it leaves a
non-zero chance of inconsistent height in production data — better to
make absence visible than invisible.
