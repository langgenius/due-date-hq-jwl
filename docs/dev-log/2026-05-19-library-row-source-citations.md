---
title: 'Library row source citations: every rule cites its document'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Library row source citations: every rule cites its document

## Context

Sibling pass to
[2026-05-19-coverage-status-snapshot-and-source-citations.md](2026-05-19-coverage-status-snapshot-and-source-citations.md).
Coverage status surfaces sources at the page level (snapshot pointer)
and per-jurisdiction level (SOURCES column → /rules/sources?jur=X).
The Library row was the remaining hole: rule rows showed the rule
title and id, but the official document backing the rule was invisible
unless the CPA opened the rule detail sheet.

User directive (2026-05-19): "include sources of truth as much as
possible." A pending-rule queue without per-row citations is a list of
unverifiable claims. Whether the source is the IRS, a state DOR, or DC
official material, it needs to ride next to the rule wherever the rule
appears.

## Change

`apps/app/src/features/rules/rule-library-tab.tsx`:

### New query: full source registry

```tsx
const sourcesQuery = useQuery(orpc.rules.listSources.queryOptions({ input: undefined }))

const sourceById = useMemo(() => {
  const map = new Map<string, RuleSource>()
  for (const source of sourcesQuery.data ?? EMPTY_SOURCES) {
    map.set(source.id, source)
  }
  return map
}, [sourcesQuery.data])
```

Single fetch, ~100 entries, joined into the rule rows via Map lookup
(O(1) per row). The list survives across re-renders; cache layer is
TanStack Query so subsequent visits hit memory.

### `RuleSourceCitation` component

Rendered as the last block inside the RULE cell, under the rule id
and review-task badge:

```
Alabama individual income tax return applicability
al.individual_income_return.candidate.2026
New rule
SOURCE  Alabama DOR Individual Income Tax Return Filing FAQ ↗
```

- `SOURCE` eyebrow label (uppercase, `tracking-[0.04em]`) so the
  citation reads as metadata, not data.
- Source title truncated with ellipsis (the RULE cell is
  `max-w-[360px]`).
- `ExternalLinkIcon` indicates the link leaves the app.
- `+N` suffix when the rule cites multiple sources.
- `target="_blank" rel="noopener noreferrer"` — citations open the
  official document in a new tab.
- `event.stopPropagation()` on click and keydown so the citation
  doesn't also trigger the row's "open rule detail" handler.

Affordance is inline link (hover underline, focus ring), not a
styled pill — citations are background metadata, not primary actions.

### Description update

`apps/app/src/routes/rules.library.tsx`:

> Catalog of practice rules. Review pending templates, activate them
> into production, and inspect rejected or archived evidence. Each
> row carries its source — click the citation to open the official
> document.

The earlier draft of this description promised citations
aspirationally (and got trimmed back when verification showed the
promise wasn't real yet). Now the promise is honest.

## Why this stays durable

1. **Map join, not denormalized field.** Sources can be edited (URL
   updates, title corrections) on the registry without touching every
   rule that cites them. The Library page picks up changes on next
   refetch.
2. **Missing source = render nothing.** If `sourceById.get(id)`
   returns undefined (registry dropped a source, or sources haven't
   loaded yet), the citation is omitted entirely. We never render a
   citation that lies about provenance.
3. **External vs. internal links.** Citations open in a new tab
   because the official document is a different context. Internal
   navigation (Coverage status → Sources, Library → rule detail) stays
   in-app.

## Validation

- `pnpm check` — 1050 files formatted, 576 typechecked, clean
- `pnpm test` — 203/203 tests passing
- Browser:
  - Library table shows `SOURCE <title> ↗` on every rule row
  - Citation href points to the official document (e.g.
    revenue.alabama.gov for AL rules, ftb.ca.gov for CA rules)
  - Clicking the citation opens the document in a new tab without
    opening the rule-detail sheet
- AI-slop check: no new patterns introduced — citation matches the
  existing inline-link affordance language used elsewhere in the
  Library table (filter pills, header filters, pagination)

## Deferred

- **Citation hover preview**: hovering the citation could show the
  `evidence.sourceExcerpt` from the rule's evidence row — the exact
  quoted passage the rule derived from. Higher-friction but stronger
  source-of-truth chain.
- **Multi-source disclosure**: the `+N` suffix indicates more sources
  but doesn't list them. A hover popover with the full list would let
  CPAs verify all citations without opening the rule detail sheet.
- **Citation in rule detail drawer**: the same map could be shared
  with the drawer so the drawer's source list also links to URLs.
