---
title: 'UX evaluation fixes: zone sort, shared breadcrumb, lighter row'
date: 2026-05-19
author: 'Claude'
area: rules
---

# UX evaluation fixes: zone sort, shared breadcrumb, lighter row

## Context

A designer-perspective audit of the Rules-module surfaces surfaced four
real UX problems. The interaction map gap list (already landed) caught
the wiring; this pass closes the perceptual problems.

## Findings

### P1: Coverage was a 52-row wall of repetition

48 jurisdictions rendered identical all-orange-dot rows with the same
"Official sources · pending rules" status pill. The eye can't
pattern-match a difference, so the "scan for what needs my
attention" workflow flatlined. The interesting jurisdictions (CA,
NY, FL, FED, TX, WA) were buried alphabetically.

### P2: Three local OriginBreadcrumb components

`OriginBreadcrumb` in Library, `SourcesOriginBreadcrumb` in Sources.
Identical chrome, drift risk every time a third surface needs one.
The earlier dev log acknowledged this and deferred extraction.

### P2: Library row had a redundant "SOURCE" eyebrow

Every row stacked: title + id + "New rule" tag + "SOURCE <title> ↗".
The uppercase eyebrow added visual weight without information — the
external-link icon + position already communicated provenance.

### P3: Empty states already in place (verified)

Library and Sources both render `<TableRow colSpan>` with empty-state
copy. Coverage has no explicit empty state but a zero-row Coverage
would mean zero US jurisdictions, which is unreachable in practice.

## Change

### 1. Coverage zone sort + collapse all-clear

`apps/app/src/features/rules/coverage-tab.tsx`:

- New `needsAttentionRows(rows, statusLabels)` helper partitions
  jurisdictions:
  - **Top zone (needs attention)**: pending > 2 OR has non-default
    status pill OR has at least one non-review entity dot.
  - **Bottom zone (all clear)**: everything else, hidden by default.
- New `CoverageTable` component owns the `showAllClear` toggle state.
- New `CoverageRow` private component renders a single row, used in
  both zones. Accepts `compactStatus` prop: when in the all-clear
  zone, the STATUS pill is replaced with a muted em-dash. (All-clear
  rows by definition have the default pill — repeating it 40+ times
  is pure noise.)
- Expander row sits between the zones: "Show 46 jurisdictions with
  default review queue" / "Hide 46 jurisdictions with default review
  queue" with `aria-expanded`.

Default render is now **6 rows + expander** instead of 52 rows of
mostly-orange visual noise. Click expander → reveals the full
alphabetical list with compacted status.

### 2. OriginBreadcrumb extracted to shared primitive

`apps/app/src/features/rules/rules-console-primitives.tsx`:

- New exported `OriginBreadcrumb({ label, onClear, clearLabel })`
  component — same chrome as the two local copies.

`rule-library-tab.tsx` and `sources-tab.tsx`:

- Removed local `OriginBreadcrumb` / `SourcesOriginBreadcrumb`
  functions.
- Import `OriginBreadcrumb` from primitives.
- Each page still owns its own Clear callback (Library clears 5 URL
  params; Sources clears 2). The primitive is the chrome only.

### 3. Drop SOURCE eyebrow on Library citation

`rule-library-tab.tsx` — `RuleSourceCitation`:

Before:

```
SOURCE  Alabama DOR Individual Income Tax Return Filing FAQ ↗  +2
```

After:

```
↗ Alabama DOR Individual Income Tax Return Filing FAQ  +2
```

External-link icon leads instead of trailing — promotes the
"this links somewhere external" signal. The "SOURCE" eyebrow added
~50% horizontal weight without information; gone now.

Placeholders updated to match the new rhythm: muted ↗ icon + "No
source on file" / "Source unavailable".

## Why this stays durable

1. **Zone sort is data-driven, not jurisdiction-hard-coded.** The
   `needsAttentionRows` predicate looks at pending counts, status
   labels, and entity-dot state. New jurisdictions with new data
   shapes will float to the top automatically.
2. **Shared primitive enforces visual consistency.** Future origin
   breadcrumbs use the same chrome by default. The Clear semantics
   stay page-owned (each page knows what its filters mean).
3. **Citation row is now 3 elements, not 4.** Title + id + (review
   tag) + (citation OR placeholder). Cleaner vertical rhythm.

## Validation

- `pnpm check` — 1059 files formatted, 576 typechecked, clean
- `pnpm test` — 203/203 passing
- Browser:
  - Coverage status: 6 attention rows + expander; click reveals
    46 collapsed jurisdictions with em-dash in STATUS column ✓
  - Library breadcrumb: "Pre-filtered from Coverage status:
    California · Individual" (shared primitive) ✓
  - Sources breadcrumb: "Pre-filtered from Coverage status:
    New York" (shared primitive) ✓
  - Library row: 3-line layout (title / id / citation), no eyebrow ✓

## Deferred

- **Mobile pass** still not done — Coverage table will horizontal-
  scroll on phones; sidebar collapses via shadcn's existing pattern.
  Acceptable for v1; revisit when there's real mobile usage.
- **Affordance vocabulary inventory** (pill / underline / silent
  scale / chip) — currently 4 distinct affordance languages. They're
  used for distinct purposes (cross-page nav / in-row drill / data
  states / filter axes) and each is consistent within its purpose.
  Worth revisiting as a design-system task, not a Rules-module fix.
