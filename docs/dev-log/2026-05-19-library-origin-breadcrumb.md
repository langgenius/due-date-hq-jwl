---
title: 'Library: origin breadcrumb when arrived from Coverage drill'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Library: origin breadcrumb when arrived from Coverage drill

## Context

Gap #8 from the [interaction map](../product-design/rules/04-rules-interaction-map.md):

> Library has no breadcrumb to show "I came from Coverage status,
> pre-filtered to NY pending" — the chip + jur filter is visible but
> the cross-page origin isn't.

After the Coverage status entity-dot drill landed (commit
[78f570b](#)), every entity dot or PENDING-count click pushed
`?library=…&jur=AL&entity=llc&from=coverage` to the Library. The
filters applied correctly, but the user lost the context that they
arrived from a Coverage status drill. The Library looked like it had
"weird default filters" instead of "you drilled in from there".

## Change

`apps/app/src/features/rules/rule-library-tab.tsx`:

### `?from=` URL state via nuqs

Added `originParser = parseAsString.withDefault('').withOptions({ history: 'replace' })`
and `useQueryState('from', originParser)`. Same convention as the
other URL filters (`?jur=`, `?library=`, `?entity=`).

### `OriginBreadcrumb` component

```
┌─────────────────────────────────────────────────────┐
│  ● Pre-filtered from Coverage status  [Clear ×]     │
└─────────────────────────────────────────────────────┘
```

Rendered above the filter chips when `origin === 'coverage'`. Carries:

- Small blue dot indicator (accent tone) — visual flag
- Label text ("Pre-filtered from Coverage status")
- Clear button — resets filters to defaults and drops the `?from=` tag

### Clear handler

`clearOriginAndFilters` clears all four pre-filter URL params in one
shot:

```ts
void setLibraryFilter('pending_review') // library chip back to default
void setJurisdictionFilters([]) // jur filter empty
void setEntityFiltersQuery([]) // entity filter empty
void setOrigin('') // ?from= tag dropped
```

One-click escape: the user returns to the page's natural default
(pending review queue, no jurisdiction or entity filter).

## Why this stays durable

1. **Parser is extensible.** When new origins land (Dashboard digest
   banner, Radar "view affected rules"), they pass `?from=<name>` and
   the breadcrumb extends the conditional render. No new URL state
   needed.
2. **Clear is destructive but predictable.** It resets to _page
   defaults_, not "back where I came from" — the latter would require
   browser back, which works independently. The breadcrumb's job is to
   make the cross-page link visible and offer a clean reset, not
   imitate browser history.
3. **Affordance is bordered + accent dot.** Lower visual weight than
   the filter chips (those are the primary controls), but still
   visible at the top of the content area. Tone-vs-affordance contract
   preserved: accent dot ≠ severity, just a visual flag.

## Validation

- `pnpm check` — 1053 files formatted, 576 typechecked, clean
- Browser: navigating to
  `/rules/library?library=pending_review&jur=CA&from=coverage`
  renders the pill above the chips; table filters to 7 California
  pending rules; clicking Clear resets to default Library view.

## Reverse note

Coverage status entity-dot drill already tags `?from=coverage` (see
[rules.coverage.tsx](../../apps/app/src/routes/rules.coverage.tsx)),
so the drill → land → see-breadcrumb → clear flow works end-to-end
without further wiring.
