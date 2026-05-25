# 2026-05-25 — Deadlines: collapsible client-deadline grouping

## Why

Genuinely-deferred ledger item **Deadlines #6** — Yuqi: "more
obvious grouping of client's deadlines." The queue already had
visual welding (continuous 2px left rail across same-client
rows) + a passive header line above each multi-row cluster.
Yuqi wanted the cluster to be _interactive_ so a CPA can collapse
N rows down to one summary line when scanning through a long
queue.

Greenlit in today's "all yes" prioritization.

## What changed

### `collapsedClientGroups` state in `ObligationQueueRoute`

Local `Set<string>` keyed by `clientId` (not row id) so collapse
state survives pagination + sorting — collapsing "Bright Studio"
on page 1 keeps it collapsed when that client's rows appear on
page 2 with new row IDs. Default is empty (everything expanded;
no behaviour change for users who don't interact).

Toggle through `toggleClientGroupCollapse(clientId)` — adds or
removes the clientId from the Set.

### Group header is now a button

The previously-passive section header above each multi-row
cluster is now a real `<button>`:

- Leading `ChevronRightIcon` (rotates 90° when expanded)
- `aria-expanded` reflects the collapse state
- `aria-controls` points at the cluster
- Localised aria-label: `Expand ${clientName}` / `Collapse
${clientName}`
- Header chrome unchanged otherwise (count + earliest due
  date)

### Cluster rows hide when collapsed

Two filter steps applied to the `tableRows.map(...)` iteration:

- **Continuation rows** (rows 2..N of a cluster) — when their
  cluster is collapsed, the row entirely skips render
  (`return null`)
- **First row** of a collapsed cluster — its `TableRow` is
  suppressed (`suppressLeafRow` flag), but the header Fragment
  still emits, so the cluster's summary line stays visible
  with its chevron-right state

When expanded (default), behaviour is identical to before this
commit.

### Pagination + sort interactions

Pagination is unaffected — the collapse state is purely visual;
underlying `tableRows` count drives `pagedRows` math as before.

Sorting is unaffected — collapse state is per-client, not
per-row, so re-ordering still cleanly groups rows by
adjacency-of-clientId (the existing cluster-detection logic).

## Files touched

- `apps/app/src/routes/obligations.tsx`
  - New `collapsedClientGroups` state + `toggleClientGroupCollapse`
    callback (~line 1064)
  - Group header swapped from `aria-hidden` label to a focusable
    button with chevron + onClick
  - Filter logic on the `tableRows.map(...)` iteration to hide
    continuation rows + suppress the first leaf row when
    collapsed

## Verification

- `vp check` → 1461 files formatted, 0 lint/type errors across
  669 files
- Multi-row client cluster — clicking the header collapses rows
  2..N + the first row, leaving just the summary
- Single-row clients — no header, no collapse affordance (they
  don't need it)
- Pagination / sort — work unchanged with collapse state
  preserved across page flips
