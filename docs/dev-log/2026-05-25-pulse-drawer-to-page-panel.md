# 2026-05-25 — Pulse drawer → page-level panel

## Why

Genuinely-deferred ledger item **Pulse #9** — Yuqi: "have the
REVIEW panel as a part of the page, like Deadline, Rule
library's right panel." The Pulse detail drawer was rendering as
a floating Sheet (right-side drawer with backdrop) regardless of
where it was opened. Yuqi wants the canonical workspace
(/rules/pulse, /rules/pulse/history) to split the page when an
alert is open — list on the left, detail panel on the right —
matching the obligation drawer's behaviour on /deadlines.

Greenlit in today's "all yes" prioritization.

## What changed

### `PulseDetailDrawer` now supports `mode='sheet' | 'panel'`

Mirrors `ObligationQueueDetailDrawer`'s pattern:

- **`mode='sheet'`** (default): legacy floating right-side Sheet
  with backdrop. Used as the off-route fallback for any caller
  that opens the drawer from outside `/rules/pulse*`.
- **`mode='panel'`**: renders the same body inside an inline
  `<aside>` that the route's layout drops into a flex sibling
  column. No backdrop, no viewport-fixed positioning.

Body content extracted into a `body` JSX variable shared between
both modes. The visible `SheetTitle` / `SheetDescription` in the
header swapped to plain `<h2>` / `<p>` so the same body renders
without a Sheet root context. Sheet mode adds a `sr-only`
`SheetTitle` + `SheetDescription` on the outer wrapper to
satisfy Radix Dialog a11y; panel mode relies on the visible
`<h2>`.

### `PulseDrawerProvider` is route-aware

Recognizes `/rules/pulse` and `/rules/pulse/history` as
`routeOwnsPanel = true`. Behaviour:

- On those routes — `openDrawer(id)` drives the `?alert=<id>` URL
  param so the alert is deep-linkable. The provider does NOT
  mount the floating Sheet (the route's inline panel is the only
  drawer surface).
- Off those routes — `openDrawer(id)` navigates to
  `/rules/pulse?alert=<id>`, sending the user to the canonical
  workspace with the alert pre-opened. Same shape as the
  obligation drawer's "picker routes navigate to /deadlines"
  pattern.

### `PulseChangesTab` splits the page when an alert is open

- Reads `alertId` + `closeDrawer` from `usePulseDrawer()`.
- When an alert is open, the page max-width relaxes from
  `max-w-page-wide` (~1100px) to `max-w-[1440px]` so the
  split-column layout has room.
- The list area is wrapped in a conditional flex-row:
  `panelOpen ? 'flex min-h-0 flex-1 gap-4' : 'contents'`. When
  no alert is open, the wrapper collapses via the `contents`
  display value, leaving the existing single-column layout
  byte-identical.
- Right column renders
  `<PulseDetailDrawer mode="panel" alertId={...}
onClose={closeDrawer} />` in a `w-[440px] lg:w-[480px]
xl:w-[520px]` fixed-width sticky panel.

Header, filter row, and modal dialogs (PulseReasonDialog) stay
full-width above / below the split.

## Files touched

- `apps/app/src/features/pulse/PulseDetailDrawer.tsx` —
  `mode` prop + conditional outer wrapper + extracted `body`
  variable
- `apps/app/src/features/pulse/DrawerProvider.tsx` — route-aware
  navigation + suppressed Sheet on routes that own the panel
- `apps/app/src/features/pulse/AlertsListPage.tsx` — split-column
  layout + inline panel render

## Verification

- `vp check` → 1456 files formatted, 0 lint/type errors across
  668 files
- `/rules/pulse?alert=<id>` → page splits, panel shows on right
- `/rules/pulse` (no alert) → page renders single-column as
  before
- `/rules/pulse/history` — same split behaviour for archived
  alerts
- Off-route opens (Today dashboard NeedsAttention card →
  openDrawer) now navigate to `/rules/pulse?alert=<id>` instead
  of showing a floating Sheet over the dashboard

## What's intentionally NOT in this commit

- The `SuggestedActionsPanel`, `AffectedClientsTable`, and other
  drawer-body components keep their existing internal layouts.
  At 440-520px column width they read fine; if Yuqi wants
  tighter content density at panel widths, that's a separate
  pass.
- Mobile (< sm breakpoint): the split-column still applies. If
  this proves cramped on narrow viewports, future work can
  conditionally fall back to the sheet at `sm:` and below.
