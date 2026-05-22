---
title: 'Dashboard Zero Penalty Cards'
date: 2026-05-04
author: 'Codex'
---

# Dashboard Zero Penalty Cards

## Context

The Dashboard metric strip always rendered `90-day legacy penalty estimate` and `Accrued penalty`, even when
their cents totals were zero. That left non-actionable risk cards taking fixed-width slots in the
summary row.

## Change

- Hide `90-day legacy penalty estimate` when `summary.legacyPenaltyTotalCents` is `0`.
- Hide `Accrued penalty` when `summary.totalAccruedPenaltyCents` is `0`.
- Change the metric strip from a fixed six-column layout to an auto-fit grid so visible cards divide
  the full row width.

## Docs Check

No DESIGN.md update was needed. This is a Dashboard presentation rule that reuses the existing card
component and spacing tokens.

## Validation

- `pnpm exec vp check --fix apps/app/src/routes/dashboard.tsx docs/dev-log/2026-05-04-dashboard-zero-penalty-cards.md`
- `pnpm exec vp check apps/app/src/routes/dashboard.tsx docs/dev-log/2026-05-04-dashboard-zero-penalty-cards.md`
