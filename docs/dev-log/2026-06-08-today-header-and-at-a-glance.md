# /today — header trim + At-a-glance removal (Pencil VJbaH / qYrr3 / ErW76)

Date: 2026-06-08

Two rounds of Yuqi /today page-feedback applied to `routes/dashboard.tsx`.

## PageHeader actions (Pencil ErW76)

- **"Add deadline" removed.** The `CreateObligationDialog` trigger left the daily
  triage header entirely — creation belongs on the deadlines surface, not the
  morning brief. Dropped the `CreateObligationDialog` import.
- **"Import clients" → dark icon-only "+".** Collapsed the labelled outline button
  to a compact filled square (`variant="primary"`, `size="icon-sm"`, bare
  `PlusIcon`), matching Pencil's single filled affordance. The permission guard +
  `aria-label` (now always set, so the icon-only control stays accessible and the
  tooltip explains a missing-role click) are preserved. Dropped `UploadIcon`.

## At-a-glance section removed (feedback #2)

- Deleted the standalone four-tile "AT A GLANCE" strip (`DashboardAtAGlance` +
  `GlanceTile` + their test). Pencil VJbaH folds the day's headline numbers into
  the **Daily Brief** bar (qYrr3) that already renders above, so the separate strip
  duplicated that signal with extra chrome. Removed the now-orphaned
  `dueTodayCount` derivation (and its only consumers `daysUntilDueFromAsOf` /
  `TERMINAL_STATUSES`).
- Files deleted: `features/dashboard/at-a-glance-section.tsx`,
  `features/dashboard/glance-tile.tsx`, `features/dashboard/glance-tile.test.tsx`.

## Page padding (feedback #6)

- Tightened the page wrapper: `md:px-16 → md:px-8` and `gap-8 → gap-6`. The 64px
  side gutters were too generous on Yuqi's 1512px screen; 32px lets the content
  breathe without floating.

## Verify

- tsgo 0; dashboard feature tests pass (10 + 1 skipped); header verified in
  preview (only the icon-only Import-clients control remains); `vp check` clean on
  touched files; no new i18n strings (`Import clients` already existed via Trans).
