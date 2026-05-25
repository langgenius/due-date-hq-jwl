---
title: 'Dashboard Radar Urgent Window'
date: 2026-05-03
author: 'Codex'
---

# Dashboard Radar Urgent Window

## Context

The `Next deadlines` panel could show overdue rows while Deadline Radar excluded overdue exposure
from `summary.legacyPenaltyTotalCents`. That made the Radar number look unrelated to the visible
exposure rows.

## Change

- Changed Dashboard aggregation so the urgent window includes overdue obligations plus the next
  seven days.
- Deadline Radar ready / needs-input / unsupported counts now use that same urgent window.
- Changed the Dashboard first-screen `Next deadlines` table to render the `This Week` triage rows
  instead of a global top-three priority slice.
- The Dashboard request now asks for the maximum supported top limit so normal urgent queues can be
  shown without truncating after three rows.

## Docs Check

- Updated frontend architecture notes to document the shared urgent-window semantics.
- Updated the user manual Dashboard steps so Deadline Radar and Next deadlines describe the same
  urgent set.

## Validation

- `pnpm --filter @duedatehq/db test -- dashboard`
- `pnpm exec vp check apps/app/src/routes/dashboard.tsx packages/db/src/repo/dashboard.ts packages/db/src/repo/dashboard.test.ts docs/dev-file/05-Frontend-Architecture.md docs/project-modules/14-user-manual.md docs/dev-log/2026-05-03-dashboard-radar-urgent-window.md`
- `git diff --check -- apps/app/src/routes/dashboard.tsx packages/db/src/repo/dashboard.ts packages/db/src/repo/dashboard.test.ts docs/dev-file/05-Frontend-Architecture.md docs/project-modules/14-user-manual.md docs/dev-log/2026-05-03-dashboard-radar-urgent-window.md`
