# Excise the dead `historyMode` branch from AlertsListPage

_2026-06-16_

`AlertsListPage` carried an `@deprecated historyMode` prop that was **never
passed `true` in the app** — `/alerts/history` renders the dedicated
`AlertHistoryView` (via `AlertsHistoryRoute`), not `AlertsListPage historyMode`.
Only 3 tests exercised the prop. Removed the whole dead path (behavior-preserving:
the always-taken `!historyMode` branches are kept).

## Removed
- The `historyMode` prop + its JSDoc; `historyMode = false` destructure.
- The history query path (`useAlertsHistoryQueryOptions` / `listHistory`); the
  page now always uses `useAlertsListQueryOptions`.
- The history-only **Status dropdown** block, the `statusFilterText` /
  `statusFilterLabel` helpers, the `STATUS_FILTER_ICON` map, the
  `statusFilterOptions` const, and the `AlertsHistoryRecordLegend` component +
  the `AlertsEmptyState` history branch.
- ~10 `historyMode` / `!historyMode` conditionals collapsed to their live form
  (selection-enabled, queue-sync effect, priority-queue gate, filter predicate,
  View-history button, AlertListRail props, dismiss handlers).
- Orphaned imports (9): the history query hook, `ACTIVE/HISTORY_STATUS_FILTER_OPTIONS`,
  `isStatusFilter`, `ALERT_STATUS_ICON`, `LucideIcon`, `CircleCheckIcon`,
  `FileCheckIcon`, `Undo2Icon`.

**AlertsListPage.tsx: 1973 → 1784 LOC** (−189 net; the dead branches were
interspersed, so the gross dead-code removed is larger).

## Tests
- Removed the 3 `historyMode` tests (they exercised the dead twin). Kept their
  active-path counterparts (e.g. "hides Status on the active surface", "uses the
  active query").
- **Coverage note (pre-existing gap, now visible):** the LIVE history surface
  (`AlertHistoryView`) has no tests — the removed tests gave false confidence by
  testing the dead `AlertsListPage` twin. Writing `AlertHistoryView.test.tsx` is a
  tracked follow-up.
- Fixed the stale router comment (`/alerts/history` renders `AlertHistoryView`,
  not "AlertsListPage with historyMode={true}").

Typecheck 0; alerts suite 109 pass; full suite 535 pass (−3 = the removed tests).
/alerts active board verified live (rows + Review/Active tabs render, no error).
