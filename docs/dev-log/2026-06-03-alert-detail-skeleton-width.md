# 2026-06-03 - Alert detail skeleton width

Yuqi flagged `/alerts`: opening an alert showed the right-side detail panel skeleton in a narrow
column before the loaded detail settled at full width.

Change:

- The inline alert detail panel now mounts its right-column slot at the final 60% width immediately.
- The inner detail surface still uses the existing bottom-up paper motion.
- Closing the panel still collapses the slot width so the alert list reclaims the space.

Validation:

- `pnpm exec vp check --fix apps/app/src/features/alerts/AlertsListPage.tsx docs/dev-log/2026-06-03-alert-detail-skeleton-width.md`
- `pnpm --filter @duedatehq/app build`
- Browser check on `/alerts`: after clicking the alert card, the right detail slot stayed 835px at
  t0, t40, t200, and t800 instead of expanding from a narrow skeleton width.
- `DESIGN.md` remains aligned; this is a motion/loading-state correction inside the existing
  `/alerts` inline detail panel.
