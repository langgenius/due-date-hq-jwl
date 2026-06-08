# /alerts — filter-cluster spacing + map-view list uses the new row design

Date: 2026-06-08

## Filter-cluster spacing (`AlertsListPage.tsx`)

Feedback: _"space between search/list/map and all time, filters, state,
sort by."_ Widened the vertical-divider margins (`mx-1` → `mx-3`) so the
left cluster (Search + List/Map) and the right cluster (All time · Filters ·
State · Sort) read as two clearly separated groups instead of one strip.

## Map-view alert list (`AlertsListPage.tsx` + `PulseAlertRow.tsx`)

Feedback: _"update the alert list in the map view."_ The map view's right
rail still rendered the old facts-grid `AlertCard` / `PulseFormRevisedCard`,
which diverged from the list view's `PulseAlertRow`.

- The rail now renders the SAME `PulseAlertList` as the main list, so map +
  list share one row design (time/meta/title/key-change/affected-clients,
  day-group bands, the new sans change-kind, the elbow ACTION glyph, etc.).
- Added an optional `compact` prop to `PulseAlertList`: the map rail is
  ~420px, so it forces the compact row variant (the one the panel-open list
  uses — no 100px time rail) instead of deriving compactness from whether a
  detail panel is open. Default behavior (derive from `openAlertId`) is
  unchanged for every other caller.
- Bulk-selection is off in the map rail (`selectable={false}`) — it's a
  map-driven navigator, not a bulk-action surface. Dismiss still wires
  through the same mutation in active mode.
- Dropped the now-unused `AlertCard` + `PulseFormRevisedCard` imports from
  AlertsListPage.

Typecheck clean.

## Preview note

The shared `:5177` dev server's build is intermittently stale — the
`ddhq-deadlines-parity` worktree's `deadlines-at-a-glance.tsx` keeps
breaking/recovering, and while it's broken Vite serves a pre-change bundle.
Yuqi's own browser showed the live consolidated "Filters" control, so the
build is good when that file compiles. Verified here by typecheck + source
review.
