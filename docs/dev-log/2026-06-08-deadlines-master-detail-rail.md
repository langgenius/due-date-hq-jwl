# /deadlines — compact master-detail rail (Phase 5)

Date: 2026-06-08

Yuqi: standardize the detail experience on the compact item-rail (matching
/alerts), not the table-split. When a deadline is open, the full table is hidden
and a 380px compact rail becomes the list; the detail pane fills the rest.

## New

- `features/obligations/components/ObligationListRail.tsx` — mirrors `AlertListRail`:
  "Deadlines · N overdue" head, search, compact items (due date + N-days-late ·
  state/form badges · client · status). Active item gets the 2px left accent.
  Includes a "Load more" affordance (the hidden table's infinite-scroll observer
  can't fire while display:none).

## Wired (`routes/obligations.tsx`)

- Render `<ObligationListRail>` when `panelOpenIntent` (rows = the table's current
  filtered/sorted rows, `tableRow.original`); `onSelect` → `openQueueDetail`.
- Hide the full table (`panelOpenIntent && 'hidden'`) — kept mounted so its
  filter/sort/scroll state survives closing the detail.
- Detail pane width `xl:basis-3/5 shrink-0` → `xl:flex-1 min-w-0` so it fills the
  space beside the 380px rail.

## Verify

Preview @ /deadlines: open a deadline → compact rail (28 items) + detail; clicking
a rail item switches the detail (active accent follows); detail renders fully.
tsgo clean. (Env note: had to `pnpm db:migrate:local` — local D1 was missing the
`assignee_id` column from 0069/0070, which 500'd obligations.list; migrations are
already in the repo.)
