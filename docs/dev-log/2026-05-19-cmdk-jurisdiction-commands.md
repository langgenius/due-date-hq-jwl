---
title: '⌘K: jurisdiction commands + Library cmd-palette breadcrumb'
date: 2026-05-19
author: 'Claude'
area: rules
---

# ⌘K: jurisdiction commands + Library cmd-palette breadcrumb

## Context

Gap #5 from the [interaction map](../product-design/rules/04-rules-interaction-map.md):

> No "show me everything for jurisdiction NY" cross-page link. Today
> you'd have to load each page (Library, Sources, Coverage) and
> apply `?jur=NY` manually.

## Change

### CommandPalette — new `jurisdictions` group with 52 entries

`apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx`:

- New `'jurisdictions'` group id added to `CommandEntry` union and
  `groups` array.
- 52 entries generated from `RULE_JURISDICTIONS` (FED + 50 states +
  DC). Each:
  - `label`: `jurisdictionLabel(code)` — e.g., "New York", "Federal"
  - `description`: `t\`Filter Rules library to ${code}\``
  - `icon`: `MapIcon` (matches the Coverage status sidebar entry)
  - `onSelect`: `navigate(\`/rules/library?jur=${code}&from=cmd\`)`

cmdk's natural fuzzy filter handles narrowing: typing "ny" surfaces
"New York" among ~37 fuzzy matches; typing "new york" narrows to
the exact entry. Default unfiltered view groups jurisdictions under
their own heading, below Navigate / Actions and above Ask.

The destination is **Library** (not Coverage status as originally
sketched) because Library is the action surface — once filtered to
NY, the CPA can scan rules, accept pending ones, click citations.
Coverage status is the situational read; if a CPA wants to look at
NY's snapshot, they click the sidebar Coverage status entry.

### Existing "Coverage" command renamed to "Coverage status"

Aligned with the sidebar / route title shipped today.

### Library breadcrumb: handle `?from=cmd`

`apps/app/src/features/rules/rule-library-tab.tsx`:

The `OriginBreadcrumb` conditional render now includes `cmd`. The
label resolves contextually:

- `?from=cmd&jur=NY` → "Filtered to jurisdiction: New York"
- `?from=cmd` with no `?jur=` → "Filtered via command palette"
  (defensive fallback)

`Clear and back to default` still wipes all pre-filter state in one
click.

## Why this stays simple

1. **No nested palette UI.** A "Jump to jurisdiction…" command with a
   second step would require cmdk page support (not used elsewhere
   in this app). 52 flat entries + fuzzy filter is the lighter solution.
2. **Library as destination.** Coverage status doesn't support `?jur=`
   filter today (the snapshot strip aggregates globally; filtering to
   one row would mislead). Library already has `?jur=` infrastructure
   and the breadcrumb. Reusing existing wiring beats new state.
3. **`from=cmd` is a third origin, not magic.** Same conditional
   pattern as `coverage` and `sources`. Future origins (e.g. dashboard
   digest banner) extend the same branches.

## Validation

- `pnpm check` — 1055 files formatted, 576 typechecked, clean
- `pnpm test` — 203/203
- Browser: ⌘K opens palette with 72 entries (20 navigate + 2 actions
  - 52 jurisdictions + 1 ask, after formatting). Typing "NY" narrows
    to 37 fuzzy matches including "New York · Filter Rules library to
    NY · Jurisdictions". Selecting that entry navigates to
    `/rules/library?jur=NY&from=cmd` where the breadcrumb pill shows
    "Filtered to jurisdiction: New York [Clear ×]".

## Deferred

- **Coverage status `?jur=` filter** — currently Coverage status
  table renders all 52 jurisdictions regardless of URL state. Filtering
  to one row would also require recalculating the snapshot strip. Not
  pursued in this pass because Library is the natural action surface
  for "filter rules to NY"; Coverage status is the aggregate read.
