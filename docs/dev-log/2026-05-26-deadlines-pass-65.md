# /deadlines sixty-fifth pass — table + row + chip + filter audit

**Date:** 2026-05-26
**Branch:** `design/inset-surface-system`
**Scope:** `/deadlines` queue chrome, row body density, chip vocabulary, filter affordances, responsive pagination

A 20-item screen-by-screen pass from Yuqi on /deadlines. Themes:

- The table was reading as a card-within-a-card with too-quiet headers and too-loud chips
- The row's primary anchor (client name) wasn't big enough vs the meta around it
- Same-client continuation rows hid the client name behind a `↳` glyph that "did not make sense"
- The header-level Internal-due range filter was redundant with sort + toolbar chips
- Pagination was hardcoded at 25 rows — too many for a 992px laptop, too few for a 1440px monitor

## What changed

### Table chrome — bg-default surface, no outer border (#1)

`apps/app/src/routes/obligations.tsx`:

`<Table>` wrapper dropped `border border-divider-regular rounded-md`, added `bg-background-default`. The outer frame was painting a second visual boundary around the queue inside an already-bordered scroll column. Inner row dividers + the TableHeader bg still carry the table's internal structure; no outer frame needed.

### Header text style — drop the small-caps caption look (#2 #3 #6 #7)

The TableHead canonical override + `ObligationQueueSortableHeader` button class both moved from `text-xs uppercase tracking-[0.08em] text-text-tertiary` → `text-sm normal-case tracking-normal text-text-secondary`. Yuqi flagged the small-caps caption style as "not header style" — the kicker tracking + uppercase + tertiary tint read as a meta label, not a column header, especially next to text-base body content below. New style matches the Alerts AffectedClientsTable headers so column headers across the product read as one family.

### Body row sizes — anchor bigger, avatar bigger, tax code bigger (#9 #10 #11)

- Client name: `text-sm` → `text-base font-medium`. With the new text-sm headers, text-sm body text was sitting at the same scale as the header above — the row anchor needs to read LARGER than its column label.
- AssigneeAvatar: `size-7` (28px) → `size-8` (32px), initials `text-xs` → `text-sm`. Matches the Today dashboard's owner-avatar size.
- TaxCodeLabel cell: explicit `text-base` className. "Form 1120-S" was reading as caption-tier next to the bumped client name.

### Group section header — center alignment (#8)

`items-baseline` → `items-center` on the collapse button. With the chevron icon as the first child, baseline-aligned text put the icon's bounding box sitting lower than its visual center vs. the label text — read as "off by 1-2px" misalignment.

### Same-client continuation — write the name again (#15 #16)

Dropped the `↳` glyph that rendered on rows 2+ of a same-client cluster. Yuqi: "this does not make sense" / "just write the name again. don't use an arrow." The left rail + welded bottom border still carry the grouping cue; hiding the client name on continuation rows made the column read inconsistently with the first row.

### Pill cleanup — DueDaysPill (#17), RejectionChip (#18), BlockedByChip (#19)

- **DueDaysPill**: dropped the outline `<Badge>` wrapper. Now: dot/icon + plain text `text-sm tabular-nums`, urgency carried by text color (red / amber / neutral). Reads as a value ("3 days late"), not a control. Was competing with the Status pill in the next column.
- **RejectionChip**: switched from the faint `destructive` Badge variant to a FILLED red chip (white text on `bg-state-destructive-solid` = red-500), `font-semibold uppercase`. Now the most prominent chip in the row by design — rejection is the singular "this needs immediate hands-on work" signal. The previous variant rendered identical-weight to BlockedByChip beside it.
- **BlockedByChip**: dropped the bordered-pill chrome. Now an inline link with red LinkIcon + `text-text-secondary` underline-on-hover. The chip-vs-link distinction makes clear that this is a navigation handle, not a status tag.

### Filter UX — kill range dropdown + rename Group → Sort (#5 #13, plus #4 moot)

- **Removed** `RangeHeaderFilterDropdown` icon on the Internal Due header. Yuqi: "remove. Sort by is doing the same thing." The dropdown overlapped semantically with the sort handle on the same header AND with the toolbar Past Due / Due this week chips above. Killing it also addresses #4 (no way to cancel an applied range) because there's no longer an applied range to cancel.
- **Renamed** "Group by" → "Sort by" on the toolbar Select. The selected key drives both the sort order AND the section header cluster (in client/status modes) — "Sort by" is the more honest verb. Trigger chrome unchanged (canonical Alerts-family filter pill).
- Removed dead helpers: `RangeHeaderFilterDropdown`, `integerFromInput`, `inputValueFromNumber`, `OBLIGATION_QUEUE_TABLE_PILL_CLASSNAME`, plus the now-unused `HTMLAttributes` + `tableHeaderFilter*` imports.

### Responsive pagination — page size from viewport height (#14)

Replaced hardcoded `CLIENT_PAGE_SIZE = 25` with `useResponsivePageSize` hook that derives rows-per-page from `window.innerHeight`.

```
pageSize = clamp(8, 40, floor((H - 360px chrome) / 56px row))
```

- 992px viewport → ~11 rows (was 25 — half offscreen)
- 1080px → ~13
- 1440px → ~19
- 1800px → ~25

Subscribes to `resize` so the page size adjusts on browser resize / tablet rotation. `totalLoadedPages` re-derives from the dynamic size.

### Pagination footer — drop mt-auto (#20)

The pagination row was carrying `mt-auto` which pushed it to the bottom of the flex column when content was short — read as detached from the table in DevTools. Removed so the row sits immediately below the table and scrolls naturally with the queue.

## Deferred — needs Yuqi's direction

- **#12** Past Due / Due this Week / Needs Evidence chips: multi-select semantics are conceptually muddled (Past Due AND Due this week are mutually exclusive; Needs Evidence is independent). Best approach unclear: radio-style mutex inside the row, merge into scope tabs, or keep but with clearer "what does AND mean" affordance. Asking before refactoring.

## Verification

- `pnpm exec tsc -p tsconfig.json --noEmit` — clean
- `pnpm exec vp lint` — 0 errors, 8 pre-existing warnings (`_SuggestedActionsPanel` etc + group=status type-assertion)
- Visual smoke test pending — needs a screen pass once dev server is running
