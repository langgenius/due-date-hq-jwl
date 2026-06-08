# Critique fixes — Deadlines dead-code + density control

Date: 2026-06-08

From the `/critique` audit, obligations/deadlines cluster.

- **Removed ~330 lines of dead duplicate code:** `toolbar.tsx` exported
  `RollForwardAction` + `CalendarSyncPopover` that nothing imported (obligations.tsx
  has its own copies); deleted them and their now-orphaned imports.
- **Removed the redundant dual annual-rollover:** `/deadlines` rendered both
  `<AnnualRolloverDialog>` and `<RollForwardAction>` (both hitting
  `createAnnualRollover`). Kept the header dialog as the single entry point.
- **Wired the orphaned `density` param to a real control:** added a Comfortable /
  Compact `<Segmented>` in the toolbar (the URL param + cell-padding existed but had
  no UI to set it).
- **Removed the disabled "Snooze (coming soon)" bulk menu item.**
- **Status-cell badge consistency:** dropped `uppercase tracking-wide` from the
  payment-late badge to match its calmer siblings; removed meaningless
  `tabular-nums` from the 2-letter state-code badge.

Verify: tsgo clean; `/deadlines` shows the density toggle + single Annual-rollover.
