---
title: '/clients list redesign — entity + done columns, inline status pill, sort arrows'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Full layout redesign per the mock

Yuqi shipped a redesign mock for the /clients list. This commit lands
every visible change from that mock, with backend untouched per the
"await go-ahead before backend" directive. The Status column added
literally hours ago is already retired — its pill folds into a new
multi-line NEXT DUE cell instead.

## Header

- **Title + count chip**: "Clients" now sits next to a small rounded
  pill ("19 Clients") that reads off the unfiltered list size. Uses
  `Plural` so it pluralizes correctly.
- **Import history collapsed to icon**: was a text+icon button, now
  an icon-only button with the lucide `ArchiveIcon`. Tooltip/aria
  preserves the action name.
- "New Client" split button stays as-is — the mock shows a single
  primary button without a chevron, but the existing split-button is
  the discoverable home for "Import from CSV" so dropping it would
  retire that affordance. The split chevron's just visually quieter
  now alongside the icon-only Import history.

## Warning banner

The "X clients missing state or entity type" warning text is now a
clickable link (dotted underline) that fires the same Fix-now action.
The explicit "Fix now" button stays on the right edge so two click
targets exist; the link form gives the message itself a strong
reading-affordance.

## Action strip

Renamed `Pulse hits` → `Pass file` per the mock. Filter wiring is
preserved (still keys off Pulse matches). If the intent was a
different filter (e.g. obligations in `review` ready to be filed),
swap the data source — the label change alone is the literal mock
fidelity step.

## Table columns (new order + new shape)

```
CLIENT  ·  STATES  ·  ENTITY  ·  NEXT DUE  ·  OPEN  ·  DONE  ·  OWNER  ·  OPP.
```

### Drops

- **Standalone STATUS column** (shipped this morning, retired this
  afternoon) — its pill now lives inside the NEXT DUE cell.
- **Services column visibility** — was already hidden by default; mock
  keeps it hidden.

### Adds

- **ENTITY column**: badge per row showing `LLC` / `S corp` / etc.
  Filterable via the existing `entityFilter` / `onEntityFilterChange`
  pair that was wired in props but never surfaced as a column.
- **DONE column**: count of obligations whose status is `done` or
  `completed` (terminal states). Backed by widening the obligations
  list query to include those statuses — done rows count toward
  `doneCount` only; they don't affect `openCount` or `nextDueDate`.

### Reshapes

- **NEXT DUE cell** becomes 2 lines + inline pill:
  - Line 1: relative urgency (`In 2 days` / `8d late`) — tone-coded
    via the existing `NextDueRelativeLabel`.
  - Line 2: ISO calendar date (`2026-05-23`) + the obligation's
    status pill rendered inline next to it. Pill uses the same
    `ObligationStatusReadBadge` primitive that the obligation drawer
    header uses.
- **OPP. column** is renamed from `Opportunities` (the long word
  truncated as `OPPORTUNI…` at 120px; the abbreviated form fits
  comfortably at 80px and matches the mock).
- **OWNER avatar (unassigned)**: dashed `?` badge → muted silhouette
  circle (lucide `UserRoundIcon`). The `?` read as a status
  indicator; the silhouette reads as "no person here yet."

### Sort arrows

Six columns gain a tiny sort-arrow widget next to the header label —
`CLIENT / STATES / ENTITY / NEXT DUE / OPEN / DONE`. Click cycles
asc → desc → cleared. The arrow button is a separate click target
from the filter trigger (it sits beside the filter chevron), so
opening the filter dropdown doesn't toggle sort and vice versa.
Summary-derived columns (NEXT DUE / OPEN / DONE) provide custom
`sortingFn` closures that pull from the pre-built summary map.

## Data shape change

`ClientObligationListSummary` gains `doneCount: number`. The builder
now distinguishes rows by status:

- Open status (5 enum values) → counts toward `openCount`, contributes
  to `nextDueDate` / `nextDueStatus` if earliest.
- Terminal status (`done` / `completed`) → counts toward `doneCount`
  only. Historical due dates are skipped; they don't pull
  `nextDueDate` backward.

Route extends `OBLIGATIONS_LIST_INPUT.status` to include the terminal
values so a single query feeds both `openCount` and `doneCount`.
**Perf caveat for production**: done rows accumulate over time; the
existing 100-row limit will silently drop older filings as a firm
scales. A future iteration should bound by filing year before this
ships to firms with multi-year history.

## Files touched

- `apps/app/src/features/clients/client-detail-model.ts` — added
  `doneCount`, distinguished terminal vs. open rows in builder
- `apps/app/src/features/clients/client-detail-model.test.ts` — test
  asserts new `doneCount` field on both client_a (1 done) and
  client_b (0 done)
- `apps/app/src/routes/clients.tsx` — widened query input,
  title-with-count, icon-only import history button, swapped
  `FileClockIcon` → `ArchiveIcon`
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — column
  array overhaul, action-strip relabel, banner clickable text,
  empty-silhouette avatar, sort wiring, `ColumnSortIndicator` helper
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.po` — 12 new strings

## Verified

- `pnpm exec tsc --noEmit` — clean across app
- `pnpm exec vp check --fix` — clean
- `pnpm --filter=@duedatehq/app i18n:extract` — 0 missing zh-CN
- `pnpm exec vp run @duedatehq/app#test` — 47 files / 290 tests passing

## Open questions for Yuqi

- **"Pass file" semantics**: kept the label literal, wired to the
  existing Pulse hits filter. If you meant something different
  (clients with `review`-stage obligations ready to file? overdue?
  filings recently passed/completed?), swap the data source — it's a
  one-line change.
- **"..." overflow menu** in the mock header: not implemented because
  the mock didn't define what actions live in it. Open a thread when
  you have a list and I'll add a DropdownMenu.
