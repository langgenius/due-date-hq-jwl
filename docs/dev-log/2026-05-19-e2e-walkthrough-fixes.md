---
title: 'E2E walkthrough fixes: cross-page tags + context-aware breadcrumbs'
date: 2026-05-19
author: 'Claude'
area: rules
---

# E2E walkthrough fixes: cross-page tags + context-aware breadcrumbs

## Context

Ran a full end-to-end click-through of every Rules-module surface in
the live preview to verify wiring. 9 flows tested, mostly PASS, but
the walkthrough surfaced three real inconsistencies and one demo-data
note that warranted action.

## Issues found

### 1. Coverage origin breadcrumb was generic

Drilling from Coverage status into Library (via entity dot or PENDING
count) produced "Pre-filtered from Coverage status" — same label
regardless of which jurisdiction × entity was drilled. By contrast,
Sources drills resolved the source title ("Filtered to rules citing:
Alabama DOR..."). Asymmetric.

### 2. Sources page had no breadcrumb on cross-page drill

Coverage's SOURCES count drilled to `/rules/sources?jur=NY` with the
filter applied but no visual indicator that the user arrived from
Coverage status. Library has a breadcrumb; Sources didn't.

### 3. Coverage's SOURCES link omitted `?from=coverage` tag

Even if Sources had a breadcrumb, it wouldn't trigger — the drill URL
was `?jur=NY` without the origin tag. Easy miss in commit
[5ddd6c8](#) when the per-row source link was added.

### 4. Radar Dismiss button invisible in demo (NOT a bug)

All four demo alerts are in terminal statuses (`dismissed` × 3,
`applied` × 1). My conditional `alert.status === 'matched'` correctly
hides Dismiss on terminal alerts. In production, alerts start as
`matched` (per the schema default in `pulse.ts`) and the button
appears. Verified by API: `fetch('/rpc/pulse/listHistory')` returns
the statuses; no rule code changes needed.

## Change

### Coverage SOURCES drill tag

`apps/app/src/features/rules/coverage-tab.tsx` — per-row SOURCES
`<Link>` now points at
`/rules/sources?jur=${jurisdiction}&from=coverage`.

### Sources breadcrumb (new)

`apps/app/src/features/rules/sources-tab.tsx`:

- Added `originParser = parseAsString.withDefault('').withOptions({ history: 'replace' })`
- Added `useQueryState('from', originParser)` + `clearOriginAndFilters`
  callback (drops `?jur=` and `?from=`)
- Added `SourcesOriginBreadcrumb` component (mirrors the Library
  pattern, intentionally local so each page can give its Clear the
  right semantics)
- Renders above the filter chips when `origin === 'coverage' &&
jurisdictionFilters.length > 0`. Label resolves the jurisdiction:
  "Pre-filtered from Coverage status: New York [Clear ×]".

### Coverage origin breadcrumb label (Library)

`apps/app/src/features/rules/rule-library-tab.tsx` — the origin label
conditional now resolves jur/entity context for `coverage`:

```
origin === 'coverage'
  + jur (1) + entity (1) → "Pre-filtered from Coverage status: California · Individual"
  + jur (1)              → "Pre-filtered from Coverage status: California"
  + (default)            → "Pre-filtered from Coverage status"
```

Added local `entityLabel(entity: string)` helper with the seven entity
types (LLC / Partnership / S-Corp / C-Corp / Sole prop / Individual /
Trust / Any business) so the label reads naturally.

Inlined the resolver (no helper function) because lingui's macro
`t\`...\`` transforms reliably at the call site within the component
body. The earlier extracted helper was producing empty labels.

## Why this stays durable

1. **Cross-page origin tags are first-class.** Every cross-page link
   that lands on a filterable destination should set `?from=<origin>`.
   Coverage→Library, Coverage→Sources, Sources→Library, and ⌘K→Library
   all do this now.
2. **Each page resolves its own label.** Library's breadcrumb knows
   about coverage/sources/cmd origins; Sources's breadcrumb knows
   about coverage. New origins extend the local conditional.
3. **No shared breadcrumb primitive yet.** Each page renders its own
   local `OriginBreadcrumb` component. Could be extracted to
   rules-console-primitives if a third surface needs it, but
   intentionally local now — each page's Clear semantics differ
   (Library clears 4 filters; Sources clears 2).

## Validation

- `pnpm check` — 1058 files formatted, 576 typechecked, clean
- `pnpm test` — 203/203 passing
- Browser:
  - Coverage → entity dot drill: "Pre-filtered from Coverage status:
    California · Individual" ✓
  - Coverage → SOURCES drill: lands on Sources with breadcrumb
    "Pre-filtered from Coverage status: New York" ✓
  - Sources → Library drill: "Filtered to rules citing:
    New York Tax Department 2026 Tax Filing Dates" ✓
  - ⌘K → Texas → Library: "Filtered to jurisdiction: Texas" ✓
  - Clear button on any breadcrumb: returns to that page's defaults ✓

## Deferred (not a follow-up — documented limitation)

- **Radar Dismiss in demo**: the seed alerts are all terminal
  (`dismissed`/`applied`). To exercise the button in demo, the seed
  would need at least one `matched` alert with `matchedCount > 0`.
  Out of scope for this design pass; flag for the next demo-data
  refresh.
