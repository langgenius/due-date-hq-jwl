# Critique fixes — Alerts cluster

Date: 2026-06-08

From the product-wide `/critique` audit. Alerts cluster (`features/alerts/`).

- **Bug:** the Alert-history tab ladder had no `expired` case, so the Expired
  tab rendered the label "Reverted". Tabs now render their label from the `TABS`
  array (single source of truth) via the shared `<Segmented>`.
- **Segmented rollout:** four hand-rolled pill toggles → shared `<Segmented>`:
  the List/Map view toggle (header + filter-row duplicate), the AlertListRail
  All/Unresolved toggle, and the Alert-history status tabs.
- **Dead affordances removed/wired:** deleted the never-rendered "Mark all read"
  button + its dead `onMarkAllRead` prop; removed the permanently-disabled bulk
  "Assign"/"Export" buttons (no backend) — Snooze/Dismiss stay; deleted a dead
  `{x ? null : null}` ternary.
- **Filtered-empty dead end:** added a "Clear filters" button (shared
  `resetFilters` callback, reused by the toolbar Reset too).
- **Destructive parity:** single-row Dismiss now shows an "Undo" toast
  (`pulse.reactivate`) instead of silently archiving — no blocking confirm.
- **mono restraint:** dropped `font-mono` from jurisdiction codes, change-kind
  labels, the map "Active alerts" header, and the detail-drawer section eyebrows
  (kept on timestamps/percentages).
- **red restraint:** Alert-history `reverted` status tone destructive → secondary
  (a calm archive has no urgent cue).

Verify: tsgo clean; `/alerts` renders with the shared Segmented toggles; alerts load.
