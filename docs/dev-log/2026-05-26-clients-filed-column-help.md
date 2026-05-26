# 2026-05-26 — Clients filed column help

## Context

Browser review flagged the `/clients` table's `Filed YTD` header as unclear:
"what does this column mean, and what data does it display?"

## Change

- Renamed the column label from `Filed YTD` to `Filed`.
- Hid the column by default; it remains available from the column-toggle UI.
- Kept the existing data source: `doneCount`, built from client deadlines whose
  status is `done` / user-facing `Filed` or `completed` / user-facing
  `Completed`.
- Added header title/ARIA help so the sortable header says it counts deadlines
  already Filed or Completed.
- Added the same status-based definition to both zero and non-zero count cells.

## Notes

The summary is status-based, not a true year-to-date timestamp filter. A future
YTD metric should derive from audit timestamps for transitions into `Filed` or
`Completed`, then bound those events to the desired filing year.
