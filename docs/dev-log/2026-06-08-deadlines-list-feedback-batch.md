# 2026-06-08 — /deadlines list page: 12-item feedback batch

Page-feedback pass on the /deadlines LIST (`routes/obligations.tsx` +
`features/obligations/deadlines-at-a-glance.tsx`). Twelve items.

## Toolbar

1. **Scope tabs smaller** — `ObligationQueueScopeTab`: text-base→text-sm,
   py-3→py-2, icon size-4→size-3.5, count text-sm→text-xs.
2. **Removed the Sort-by control** — the second filter row's Sort-by
   DropdownMenu is gone; sorting still works via the column-header sort
   chevrons. That row now carries only Reset (`empty:hidden`).
3. **Search moved up beside the status tabs** — the Search field now sits
   right-aligned on the scope-tab row (the nav is `flex-1`), replacing the
   duplicate field in the row below.
7. **Removed the "Projected" quick-filter chip** — the `projected` query
   param + per-row Projected badge stay; only the toolbar toggle is gone.

## Table

4. **Header style matches Today/Alerts** — dropped the route-local
   sentence-case header override so plain columns inherit the canonical
   `TableHead` eyebrow (11px semibold uppercase tertiary). The interactive
   header triggers (sortable + `TableHeaderMultiFilter`) reset
   text-transform/size, so the table className force-applies the canonical
   typography to `[&_th_button]` (case/size/weight/tracking via `!important`,
   leaving hover/active color intact). Result: every header is uniform.
   Widened the Assignee column 56→76px so the uppercase "ASSIGNEE" fits.
5/6. **Left-aligned** — Exposure was the one right-aligned column; switched
   its header + cells (and the empty-state mark) to left so the whole table
   reads uniformly left-aligned.

## Cells

9. **Client name `font-medium`** by default (was `font-normal`); the active
   row steps up to `font-semibold`.
11. **Smaller assignee avatar** — table cell uses `size="sm"` (32→28px).
10. **State badge** — verified: `<Badge variant="outline" text-xs
   font-normal tabular-nums>` is identical to the /clients state badge
   (`ClientFactsWorkspace`). No change — already consistent.
12. **Status-signal hierarchy** — "Accepted" was a solid-green pill that
   out-weighted the "Filed" status pill (two competing greens). It's now a
   soft `Badge variant="success"`, so it reads as a quiet confirmation under
   the status pill and the red "PAYMENT Nd LATE" stays the single loud signal.

## At a glance

8. **Collapse on table scroll** — the at-a-glance card row collapses
   (grid-rows `1fr`→`0fr` + fade) once the table scroll container scrolls
   past 40px, re-expanding under 8px (hysteresis avoids jitter). Driven by
   an `onScroll` on the table's scroll container in the route (the page
   itself doesn't scroll — the table owns its scroll), passed down as a
   `collapsed` prop. The parent `gap-8` is cancelled with `-mt-8` while
   collapsed so no empty band remains.

## Verify
- `tsgo --noEmit` clean (app), scoped `vp lint` 0 errors (1 pre-existing
  `columnOrder` assertion warning, untouched).
- `document` no horizontal scroll; `table-container` overflowX 0.
- At-a-glance collapse exercised in preview (expand→collapse→re-expand).
- (`vp check` still hangs in this worktree — tsgolint stalls; validated via
  per-package `tsgo` + scoped `vp lint`.)
