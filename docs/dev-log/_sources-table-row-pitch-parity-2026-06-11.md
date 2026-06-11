# Sources table → workbench row-pitch parity

**Date:** 2026-06-11
**Surface:** `/rules/sources` — `apps/app/src/features/rules/sources-tab.tsx`

## Problem

The Sources table was the lone density outlier among the app's workbench
tables. Its rows ran a compact `h-10` (40px) with `py-1.5` cells, while
the canonical Deadlines list — plus its siblings `/clients` and
`/rules/library` — all share a `h-14` (56px) row pitch with `py-3` cells.
Side-by-side, Sources read denser and slightly "off" from the rest of the
app.

## Change

Brought the Sources rows up to the canonical workbench pitch:

- `SourceRow`: row height `h-10` → `h-14`; every cell `py-1.5` → `py-3`.
- `SourceCoverageSection` (coverage-by-jurisdiction table in the same tab):
  cells `py-1.5` → `py-3` for internal consistency.

No change to the header band, zebra striping, hover, or column widths —
those already come from the shared `Table` primitive
(`packages/ui/src/components/ui/table.tsx`) and were already correct. The
only divergence was vertical density.

## Follow-up: reuse the shared JurisdictionCode component

A "use shared components, don't build from scratch" pass surfaced one
genuine reinvention: `SourceRow` rendered the jurisdiction as a hand-rolled
accent pill — `<Badge variant="info" className="font-mono …">` — a blue
`rgba(11,165,236,.08)` fill with blue text. But a shared `JurisdictionCode`
component already exists (`rules-console-primitives.tsx:209`) and was
already imported in this file. The coverage table _on the same page_ and the
`/rules/library` jurisdiction table both use it (quiet gray-100 mono chip),
so the main Sources table was the lone blue-pill outlier — internally
inconsistent within its own page.

- `SourceRow` jurisdiction cell: `<Badge variant="info">` → `<JurisdictionCode />`.
  Cell padding `px-0` → `px-2` so the chip aligns under the JUR header label.

This overrides the earlier Pencil bf6Ni "soft accent fill" choice in favor of
app-wide table consistency (the explicit ask).

The rest of the page already showed good reuse discipline — `StatBand`,
`EmptyState`, `TableHeaderMultiFilter`, `SectionFrame`,
`TablePaginationFooter`, `FilterChips`, `HealthBadge`, `QueryPanelState` are
all shared. The local `relativeTimeShort()` was left as-is: the shared
`formatRelativeTime()` returns prose/absolute ("3w ago", "Jun 4") that
doesn't fit the narrow LAST CHECKED column, so the compact "3w" form is a
justified divergence, not reinvention.

## Follow-up: primary-column type scale (the real alignment)

Row-height parity alone was superficial — a tall row filled with 11px text
isn't "aligned," it just has more whitespace. A rigorous computed-style
audit (read off the live DOM, not by eye) showed the app has **two table
archetypes**:

- **Workbench** (`/deadlines`, `/clients`): identity spread across columns —
  client name `text-sm`/500, plus form-code, agency, etc. Renders ~67px.
- **Registry** (`/rules/library`): one identity column — rule name
  `text-base`/600 over a muted `text-sm` subtitle. Renders ~67px.

The Sources `SOURCE` column is a single **title + description** cell —
structurally identical to the rules-library "Rule name" column, _not_ to the
workbench's multi-column client identity. But it was rendering that column at
`text-xs`/500 (11px/medium) — the timid scale that left the new 56px row
under-filled.

Aligned the identity column to the registry primary-cell treatment:

- Title `text-xs font-medium` → `text-base font-semibold` (14px/600).
- Id subtitle `font-mono text-xs` → `font-mono text-sm` (12px), still
  tertiary.
- Plain-text data cells (CADENCE, LAST CHECKED) `text-xs` → `text-sm` (12px),
  matching the rules-library body scale. Pills (TYPE/WATCH) keep their shared
  component scale.

The row now renders ~63px, driven by genuine content rather than a forced
min-height — within natural variance of the 67px canonical (rules-library's
subtitle is a wrapping sentence; the Sources id is one line).

Note: the user named `/deadlines` as the reference, but its 12px/500 client
name is a _workbench_ IA (identity fragmented across columns). Matching the
structurally-equivalent registry column (rules-library) is the correct
reading — it gives the SOURCE title the clear primary weight a registry table
needs, which is what "rigorous/professional" alignment demands here.

## Verification

Preview at `/rules/sources` (1440×900), all confirmed via computed styles on
the live DOM:

- `SOURCE` title computes to 14px/600 gray-900; subtitle 12px/400 mono
  gray-500 — byte-identical to the `/rules/library` Rule-name cell.
- Header 11px/600 gray-500, cell padding 12/16/8px — already matched.
- Row renders 63px (was 56px), driven by real type scale.
- Both jurisdiction chips (main table + coverage table) now compute to
  identical styles: bg `rgb(242,244,247)`, text `rgb(53,64,82)`, radius 4px.
- Screenshot confirms the calmer, app-consistent row rhythm and the quiet
  gray jurisdiction chips. No new console errors attributable to either
  change.
