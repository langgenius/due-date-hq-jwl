# /today — Actions grouped by the six statuses (Yuqi)

Date: 2026-06-08

Yuqi: "Actions 分组表头 有六个status" — the Actions table's group headers should be
the six lifecycle statuses, not the prior 3-way (Ready to work / Waiting / Blocked)
subgroups nested inside severity tiers.

## Change (`actions-list.tsx`)

- Replaced the severity-tier grouping (`critical` / `high` / `upcoming`, each its
  own table with a left accent border) with a **single table grouped by lifecycle
  status**. Per-row urgency still reads from the red due-countdown + the
  Smart-Priority rank order, so dropping the tier axis loses no signal.
- New `classifyStatusGroup` folds the 10-value status enum into the 6 canonical
  buckets (in_progress → review; paid / not_applicable → completed; extended →
  pending). `STATUS_GROUP_ORDER` = Not started → Waiting on client → Blocked → In
  review → Filed → Completed.
- `StatusGroupLabel` renders the six labels; divider headers appear only for the
  statuses actually present (and only when the table spans >1 status). Rows are
  `toSorted` by status order — stable, so priority order is preserved within each
  group.
- Removed `resolveTier`, `TIER_ORDER_LOCAL`, `TIER_ACCENT_BORDER_CLASS`, the
  `tier`/`showTierAccent` props, and the `SeverityTier` import. The Why-now line's
  "always-open for urgent rows" now derives `isUrgent` from `severityToTier(row.severity)`
  directly.

Demo result: **NOT STARTED** (4 rows) + **IN REVIEW** (1 row).

## Verify

- tsgo 0; `vp check` 0 warnings/errors; dashboard tests 10/10; verified in preview
  @1512 — status divider headers render, priority order preserved within groups.
- No new i18n strings (status labels already in the catalog via the lifecycle
  strip + status badges).
