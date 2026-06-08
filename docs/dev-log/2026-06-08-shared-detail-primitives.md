# Shared detail primitives — JurisdictionLabel + DetailStatusBanner

Date: 2026-06-08

Yuqi (on the deadline detail panel): "ensure all of the elements are sustainable
and reusing component." The earlier parity pass had left two patterns
copy-pasted between the alert detail and the deadline detail. Extracted both into
shared primitives and pointed BOTH panels at them.

## New shared primitives
- **`JurisdictionLabel`** (`components/primitives/state-badge.tsx`): the detail-
  header jurisdiction treatment — StateBadge seal (16px) + bold mono code + full
  jurisdiction name. Was hand-rolled identically in AlertDetailDrawer and
  ObligationQueueDetailDrawer.
- **`DetailStatusBanner`** (`components/patterns/detail-status-banner.tsx`): the
  colored top-of-panel status band, `tone` = danger/success/warning. `compact`
  → the h-7 single-line form (title + right `note`); stacked → icon + title +
  `description` + right-side `action`. Replaces FOUR inline copies: the deadline
  detail's overdue/done/pending banner and the alert detail's
  error/applied/pending banners.

## Reuse
- `AlertDetailDrawer`: jurisdiction → `<JurisdictionLabel>`; all three
  `DecisionBanners` variants → `<DetailStatusBanner>` (Retry/Undo passed as
  `action`, conf/due as `note`). Dropped the now-unused `StateBadge` import.
- `ObligationQueueDetailDrawer`: jurisdiction → `<JurisdictionLabel>`; the
  overdue/filed/pending banner → `<DetailStatusBanner compact>`. Dropped the
  `StateBadge`/`getJurisdictionName` direct imports.

## Verify
tsgo clean; `/alerts` detail (amber "Pending your review" + "CA California") and
`/deadlines` detail (red "Past deadline · 27 days overdue" + "FED Federal") both
render correctly at 1512×861 with no new console errors.
