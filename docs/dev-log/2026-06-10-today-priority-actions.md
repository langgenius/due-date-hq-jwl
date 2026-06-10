# Dev log — Today Priority Actions scope (2026-06-10)

Changed the Today action queue from a "this week" bucket to a practice-wide Smart Priority
shortlist.

- `apps/app/src/routes/dashboard.tsx` now passes `dashboard.load.topRows` into
  `DashboardActionsList` instead of `triageTabs.this_week.rows`.
- `apps/app/src/features/dashboard/actions-list.tsx` now labels the section
  **Priority Actions**, shows up to 10 rows, and keeps the existing lifecycle-status grouping.
- The tooltip and subtitle now describe top open deadlines ranked by Smart Priority, not
  deadlines due this week.

Product rationale: CPA work starts before a deadline enters the 7-day bucket. Today should
surface the next best work across the practice while leaving `/deadlines` as the complete queue.
