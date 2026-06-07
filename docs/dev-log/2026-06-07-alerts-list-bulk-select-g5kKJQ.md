# Alerts list — bulk-select + smart-priority insets (Pencil g5kKJQ)

Date: 2026-06-07

Brought the active `/alerts` list up to the `g5kKJQ` ("option 1") anatomy.
The bulk-select strip, per-row checkboxes, per-row smart-priority insets, and
floating bulk-action bar were added **additively** — every existing wired
behavior (data fetching, per-alert apply/dismiss/snooze, history mode, map
view, the day-grouped `PulseAlertRow` list) is preserved.

## What shipped

### `PulseAlertRow` (`components/PulseAlertRow.tsx`)

- **Per-row checkbox** (`gT3zO chk`, 18px) ahead of the time rail. Gated on a
  new `selectable` prop; click is `stopPropagation`'d so ticking a row doesn't
  open the drawer.
- **"Why?" toggle** (`X6enpJ whyAff`) in the meta strip — only when the alert
  carries priority-queue reasons.
- **Smart-priority inset** (`IciLB PriorityReasons`) — collapsed until "Why?"
  is clicked. Header "Why this is urgent · priority N" + "N signals", then one
  chip per scoring reason ("+30 · A preparer asked about this client"). All
  values are the **real** priority data (`PulsePriorityQueueItem.priorityScore`
  - `priorityReasons`), keyed in by id — nothing hardcoded.
- `PulseAlertList` grew the **BulkSelectStrip** (`TAamJ`): tri-state "Select
  all" checkbox + dispatch count + "Mark all read", rendered only in
  `selectable` mode.

### `AlertsListPage` (`AlertsListPage.tsx`)

- Local `selectedIds` selection set; selection is **active-surface + list-view
  only** (history rows are already-handled; map view has compact rows).
- Priority-queue query (`useAlertsPriorityQueueQueryOptions`) gated on
  `permissions.canViewPriorityQueue && !historyMode`, reduced into a
  `Map<id, AlertPriorityInfo>` handed to the list.
- **Floating `BulkActionBar`** (`saDv7`): dark bottom-center pill with the
  "N selected / of M dispatches" read-out and the action cluster.

## Bulk-action wiring decision

No bulk RPC exists in the pulse contract. Per the brief, the wired bulk actions
**loop the existing per-alert mutations**:

- **Snooze** → loops `orpc.pulse.snooze` with a 24h `until` (matches the
  per-row snooze toast).
- **Dismiss** → loops `orpc.pulse.dismiss`.

The other Pencil bar actions are rendered but **not wired**, each disabled with
a reason:

- **Apply all** — disabled + tooltip. A true bulk apply needs per-alert
  source-verification (the F-041 gate in `AlertDetailDrawer`); silently
  applying N deadline shifts is the highest-liability path in the product.
- **Assign / Export** — disabled; no contract surface.
- **"Mark all read"** in the strip is hidden (no `markRead` RPC).

## TODO(data) flags

- `orpc.pulse.bulkSnooze` / `bulkDismiss` — collapse N looped mutations + N
  toasts into one round-trip + one toast.
- `orpc.pulse.bulkMarkRead` (+ a per-alert read state) for the "Mark read" /
  "Mark all read" affordances.
- A bulk-apply RPC that still threads per-alert verification, to wire
  "Apply all".
- `orpc.pulse.bulkAssign` + an export endpoint for "Assign" / "Export".

## Detail surface

The `/alerts/[id]` drawer content (`AlertDetailDrawer`) already matched the
`ibEoz` section anatomy from prior passes (Hero, Source extract, Extracted
facts, Affected clients, Provenance, sticky footer with kbd hints + audit-ledger
shield + action buttons); no changes were needed this pass.

## Tests

`AlertsListPage.test.tsx`:

- Added `firms.listMine.queryKey` + `pulse.listPriorityQueue` stubs (the page
  now calls `useAlertPermissions` + the priority-queue query at render).
- New `bulk selection` describe: strip + per-row checkbox render on the active
  surface; selecting a row reveals the bulk-action bar with Snooze + Dismiss;
  history rows are **not** selectable (mirrors the existing history-mode
  action-suppression contract).
