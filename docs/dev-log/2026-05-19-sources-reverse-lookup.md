---
title: 'Sources: reverse lookup "which rules cite this source"'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Sources: reverse lookup "which rules cite this source"

## Context

Gap #2 from the [interaction map](../product-design/rules/04-rules-interaction-map.md):

> Sources → "which rules cite this source?" is invisible. The
> relationship is sourceId → rules[] but the UI doesn't expose it.

A CPA investigating a degraded source on /rules/sources can read the
source title, jurisdiction, type, cadence, and last-checked timestamp,
but couldn't easily answer "what rules depend on this source?". The
information lived in ObligationRule.sourceIds but the Library wasn't
reachable filtered by source, and the Sources page didn't expose
counts.

## Change

Three pieces wired together:

### 1. Library `?source=` URL filter (`rule-library-tab.tsx`)

```ts
const sourceParser = parseAsString.withDefault('').withOptions({ history: 'replace' })

const [sourceFilter, setSourceFilter] = useQueryState('source', sourceParser)
```

Single-value (a rule cites N sources; we filter to "rules whose
sourceIds contains this id"). Wired into `filteredRows.filter()`:

```ts
sourceFilter === '' || rule.sourceIds.includes(sourceFilter)
```

No header-filter UI today — `?source=` is set programmatically by the
cross-page drill; the Library shows the result + the origin breadcrumb.

### 2. Sources page rule counts (`sources-tab.tsx`)

```ts
const rulesQuery = useQuery(
  orpc.rules.listRules.queryOptions({ input: { includeCandidates: true } }),
)
const ruleCountBySourceId = useMemo(() => {
  const counts = new Map<string, number>()
  for (const rule of rulesQuery.data ?? []) {
    for (const sourceId of rule.sourceIds) {
      counts.set(sourceId, (counts.get(sourceId) ?? 0) + 1)
    }
  }
  return counts
}, [rulesQuery.data])
```

Passed into each `SourceRow` as `ruleCount`. Includes both active and
candidate rules so the count reflects all catalog usage.

### 3. SourceRow "Used by N rules" link

Rendered inside the SOURCE cell, below the source.id line:

```
Alabama DOR Individual Income Tax Return Filing FAQ
al.income_tax
Used by 1 rules →
```

Link target: `/rules/library?source=<id>&from=sources`. Click /
keydown both call `event.stopPropagation()` so the inner Library
navigation doesn't also trigger the row-level "open external URL"
handler. Zero-count rows show muted "Not yet cited" instead — the
absence is visible.

### 4. OriginBreadcrumb extended for `?from=sources`

`OriginBreadcrumb` now renders for both `coverage` and `sources`
origins. When the source filter is active, the label resolves the
source title via `sourceById.get(sourceFilter)?.title` so the
breadcrumb reads:

> Filtered to rules citing: **Alabama DOR Individual Income Tax
> Return Filing FAQ** [Clear ×]

Falls back to "Pre-filtered from Sources" if the source registry
hasn't loaded yet. Clear handler now also resets the source filter
(in addition to library / jur / entity / from).

## Why this stays durable

1. **Map-based join.** Both ends of the relationship (rule →
   sourceIds, source → rule count) derive from the same listRules
   data. Changes to a rule's source list propagate to the count on
   next refetch.
2. **`from=sources` is a labeled origin, not a magic flag.** The
   breadcrumb extends naturally — any future "Filtered from X" page
   adds its case to the same conditional.
3. **`?source=` is single-value.** A rule cites multiple sources, but
   the cross-page drill is "rules citing **this** source" — singular.
   Future multi-source filtering would be `parseAsArrayOf` if needed.

## Validation

- `pnpm check` — clean (1053 files formatted, 576 typechecked)
- `pnpm test` — 203/203
- Browser: from Sources page, clicking "Used by 1 rules →" on the
  Alabama DOR row navigates to
  `/rules/library?source=al.income_tax&from=sources`. Breadcrumb
  shows "Filtered to rules citing: Alabama DOR Individual Income Tax
  Return Filing FAQ [Clear ×]". Table filters to 1 row.

## Deferred

- **Header-filter dropdown for source on Library**: today the source
  filter is URL-only. If users want to filter manually, a dropdown
  similar to the JUR / ENTITY filters would be needed. Low priority
  — the relationship is naturally explored from Sources, not picked
  from a dropdown in Library.
