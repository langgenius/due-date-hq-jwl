# /alerts — "Show suggested action" toggle

Date: 2026-06-08

Yuqi: "add an option checkbox 'show suggested action'." Added a toolbar checkbox
that toggles the per-row ACTION suggestion line across the list.

## Changes

- `AlertsListPage.tsx`: new `showSuggestedAction` state (default on); a `Checkbox`
  - "Show suggested action" label in the filter toolbar (before Reset); passed as
    `showAction` to both PulseAlertList call sites (list + map rail).
- `PulseAlertRow.tsx`: `PulseAlertList` + `PulseAlertRow` gained `showAction`
  (default true); the row nulls `actionText` when off, which also collapses the
  KeyChange row cleanly if nothing else fills it.

## Verify

tsgo clean; `/alerts` toolbar shows the checkbox; unchecking it hides every row's
"↳ ACTION …" line; re-checking restores it. At 1512×861.
