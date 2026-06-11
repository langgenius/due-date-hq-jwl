# Rebase 107 commits onto origin/main (linear-history rule)

**Date:** 2026-06-11

main enforces `required_linear_history` — merge commits are rejected. Rebased the
local commits onto origin/main with `-X theirs` (favor local for conflicting
hunks; origin's non-conflicting backend — RBAC role-hierarchy fix, db search,
brief retirement — preserved). git dropped 2 commits already upstream.

Rebase-artifact fixes:

- `daily-brief-card.tsx` → took origin's version (orphaned; local renders
  MergedBriefCard. `-X theirs` had produced malformed JSX merging the two).
- `routes/dashboard.tsx` → removed the dead `requestBriefRefresh` mutation +
  `queryClient` (origin deleted that contract/procedure).
- `rules/states-rail.tsx` → `StateBadge size="2xs"` → `"xs"` (2xs isn't a valid
  StateBadgeSize).

App tsgo clean.
