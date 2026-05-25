---
title: 'Coverage v6: V1-style row table on left, persistent rail on right'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Coverage v6: V1-style row table on left, persistent rail on right

## Context

Designer redirected v6 again:

> "But it is not serving the purpose of coverage status anymore. Still
> use the row design from Coverage Status V1. But a better version
> with the chips. And still has the right side panel."

The section-by-action-category card grid I'd built for v6 grouped
jurisdictions visually but made it harder to do the actual coverage
sweep — scanning all 50+ states at once. V1's row table was better
for that scan-the-catalog job; the only reason to migrate away from
it was the modal-on-every-click problem. v6's persistent right rail
solves that. Combine them: V1 table on the left, v6 rail on the
right.

## Change

### Left pane — V1-style row table (replaces section-grid)

Single `<Table>` with two zones:

- **Needs-attention** (always visible) — needs_approval + manual_verify
  - auto_managed rows, sorted by category then PENDING desc. The
    category ordering puts FED/NY/CA/TX on top (approval, sorted hot-
    first), then WA (verify), then FL (auto).
- **Routine-review queue** (collapsed) — standard category. Expander
  row separator with text "Show 46 routine-review jurisdictions".

Columns:

| Column          | Width              | Purpose                                                                                                              |
| --------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| JURISDICTION    | 200px              | `JurisdictionCode` + name                                                                                            |
| PENDING         | 80px right-aligned | Orange-tinted only for approval-category rows                                                                        |
| ACTIVE          | 72px right-aligned | Count                                                                                                                |
| SOURCES         | 72px right-aligned | Count (rail does the per-source list)                                                                                |
| ENTITY COVERAGE | 280px              | Chips with status-tinted fill — only when `Show entity coverage` is checked                                          |
| NOTES           | flex               | Descriptive copy for verify/auto rows ("Cadence varies per client" / "Tracks IRS calendar"); empty for approval rows |

Each row is a `<tr role="button">` clickable target with `aria-pressed`
when selected. Selected row gets a tinted background. Keyboard:
Enter / Space activates.

The V1 PRD's ACTION column (action-first pill like "Approve N pending")
is intentionally absent — imperative verbs belong on real buttons,
not in a status column. The orange-tinted PENDING count + section
ordering convey the "needs your action" signal without a fake-button
phrase.

### Right pane — same rail as before

No changes to the rail. Clicking a row opens the rail to the
jurisdiction detail (entity filter chips + rule list + bulk-accept).
Rail has all the actual approval actions (single-rule Accept with
confirm; bulk-accept with confirm; Open all in Catalog footer).

### Entity coverage column

Read-only chips inside the table's ENTITY COVERAGE cell. Each chip:

- Short code (LLC / PRT / S-C / C-C / SP) — table-density tradeoff
- Status-tinted fill via the same chip palette as the rail:
  - active (verified): `bg-status-done/10 text-status-done`
  - review: `bg-severity-medium/10 text-severity-medium`
  - none: muted with strikethrough
- Full name + state in the `title` tooltip

The chips are inert (`<span>`, not `<button>`) because the row itself
is already the click target. The rail's entity filter chips remain
the interactive ones — they filter the rule list inline.

### Dead-code removal

Removed the now-unused section-grid implementation:

- `JurisdictionCard` (the per-card layout)
- `Section` (the section header with title + count)
- `StandardChip` (the chip-grid for collapsed standard queue)
- `EntityChips` (interactive chips that lived inside cards)
- `statusLabelForApproval` helper

`StatusTone` type is also gone (only `JurisdictionCard` used it).

## Why this works

V1's row table answered "which states need my eyes today?" by giving
me 50 rows I can sweep top-to-bottom. The card grid answered "what
kind of work do I have?" — useful but the wrong default for daily
sweep. The table sorted by category+pending puts the hot rows at the
top of a single scrollable list, which is what V1 was already doing.
The new bit is the rail: clicking a row keeps you on the page instead
of dropping you into Library.

## Files

- `apps/app/src/features/rules/coverage-rail-view.tsx`
  - New: `CoverageTable`, `CoverageTableRow`, `EntityChipStrip`,
    `sortByPendingDesc`
  - Imports `Table` primitives + `SectionFrame`
  - Left pane replaces the section grid with `<CoverageTable />`
  - Removed `JurisdictionCard`, `Section`, `StandardChip`,
    `EntityChips`, `statusLabelForApproval`, `StatusTone`

## Verified

- `pnpm exec tsc -p apps/app/tsconfig.json --noEmit` → exit 0
- Browser preview at `/rules/coverage-v6`:
  - Left table shows: FED (14 pending tinted), NY (9), CA (7), TX (4),
    WA (3 — muted, "Cadence varies per client" in NOTES), FL (3 —
    muted, "Tracks IRS calendar" in NOTES)
  - "Show 46 routine-review jurisdictions" expander at the bottom
  - "Show entity coverage" checkbox reveals ENTITY COVERAGE column
    with chip strips per row
  - Click row → URL gains `?jur=FED`, rail opens to Federal detail
    (stats line + entity filter chips + 14 pending rules with
    bulk-select header)
  - Empty rail shows "Next best action" with top 4 approval
    jurisdictions ranked
  - Source-health callout still at the top: "11 sources flagged
    for review · Open sources →"

## Open

- **v6 → /rules/coverage promotion** still pending explicit go-ahead.
  When you greenlight, swap routes: v6 moves to `/rules/coverage`,
  the current table-only v1 moves to `/rules/coverage-table` (or gets
  archived) since v6 now subsumes both pieces (V1 table + side panel).
- **Card chips short codes vs rail chips full names** — inconsistency
  carried forward from before. Could unify by using full names in
  the table chips too, but at 280px column width the chips may wrap.
