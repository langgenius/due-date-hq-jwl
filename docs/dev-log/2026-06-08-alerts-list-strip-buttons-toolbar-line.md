# /alerts list — remove bulk strip, unify row button, full-width toolbar line

Date: 2026-06-08

Three list-view feedback items.

## #1 — Remove the BulkSelectStrip (`PulseAlertRow.tsx`)
The "Select all · N dispatches" bar (Pencil `TAamJ`) at the top of the list
is removed — its count duplicated the per-day bands and it was extra chrome.
Per-row checkboxes still drive selection in selectable mode, and the floating
BulkActionBar still appears once rows are picked. Cleaned up the now-unused
`selectedCount` / `allSelected` / `someSelected` locals and dropped
`onSelectAll` from the destructuring (kept in the prop type for caller compat).

## #2 — Row Dismiss button uses the canonical primitive (`PulseAlertRow.tsx`)
The hover-revealed Dismiss action was a hand-rolled bordered `<button>` whose
style diverged from the rest of the app. Swapped to `<Button variant="outline"
size="xs">` so it matches Review beside it and every other button.

## #3 — Full-width toolbar line (`AlertsListPage.tsx`)
Replaced the short vertical divider between the Search/View cluster and the
dropdowns with a full-width hairline: the sticky filter-row container now
carries `border-b border-divider-subtle`, so the bar reads as a defined
toolbar with a clean bottom edge against the scrolling list ("a line, fill
the width").

Verified live on :5177 (the main-worktree server, restarted with a fresh
build). Typecheck + lint clean.
