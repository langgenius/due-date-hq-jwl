# /deadlines status pill-strip + rail status filter + bottom/search fixes (2026-06-10)

Follow-on to the deadlines work in `d5b0b56f`. Yuqi page feedback.

## Status selection → horizontal pill-strip (list toolbar)

Replaced the "All Status" dropdown with a horizontal **status scope pill-strip**
on the `/deadlines` toolbar (its own row above search), matching the Pencil
mock:

- Leading **≡ STATUS** label (`ListChecksIcon`).
- Segmented control on a `rounded-full bg-background-subtle` track: **All N**
  (active → white pill + accent count) then each _present_ status with a
  **colored dot + label + count**. Dot colors reuse the canonical
  `STATUS_ICON_COLOR` (exported from `status-control`) so the strip is
  consistent with status pills elsewhere.
- Writes the same `?status=` URL param (`setObligationQueueQuery`), highlights
  the active pill, scrolls horizontally on narrow viewports, hidden in the
  panel-open split. Uses the existing `activeScope` / `visibleScopeStatuses` /
  `statusFacetCounts` / `scopeTotal` machinery — no new query.

## Navigator-rail status filter (detail page)

`DeadlineNavigatorRail` gained an optional status filter dropdown next to its
search: "All statuses (N)" + each present status with live counts; filters the
rail client-side, composes with search, trigger shows the active status in
accent, self-resets if the chosen status leaves the loaded set.

## Two regressions/cleanups

- **Search bar cropped** — reverted the earlier `-mt-6/pt-6` sticky-top-padding
  hack on the filter bar; it pulled the toolbar (and the focused search ring)
  up under the page header. Back to a clean `sticky top-0` fill.
- **Table bottom "looked ugly"** — removed the stale footer hint ("open the
  triage drawer · Press ↵ to jump to the full page · Esc to close"); that flow
  no longer exists (a row click navigates to the full `/deadlines/:ref` page),
  so the copy was inaccurate and cluttered the table's bottom edge. The card
  border now closes the table cleanly.

## Verification

`pnpm check` = 0 type/lint errors in the touched files. Live: pill-strip renders
with correct dots/counts; clicking "In review" → `?status=review`, 3 rows, pill
active; search no longer cropped; filtered short list shows a clean card bottom.
Files: `routes/obligations.tsx`, `features/obligations/detail/DeadlineNavigatorRail.tsx`.
Committed deadlines-files-only (parallel design-pass WIP stays unstaged).
