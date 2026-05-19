---
title: 'Clients detail — match Filings & deadlines chrome to DetailSection'
date: 2026-05-19
area: app
---

# Clients detail — Filings & deadlines chrome unification

After stage 3d shipped, a screenshot caught the page in an HMR mid-state
("ClientAlertsBand is not defined"). The dev server logs confirmed the
latest code recovered after the next HMR pass — but the screenshot
revealed a real design issue worth fixing: **Filings & deadlines used
`Card` chrome while every other section on the page used the new
`DetailSection`-style chrome**. The result felt orphaned.

## What changed

- `ClientWorkPlanPanel` no longer wraps in `<Card>`. It now uses the
  same chrome tokens as `DetailSection`:
  `rounded-md border border-divider-subtle bg-background-default`,
  with the title row in `px-4 py-3` and the body separated by
  `border-t border-divider-subtle px-4 py-3`. The section is **not**
  collapsible (it's primary content), but the visual rhythm now
  matches the secondary sections below it.
- Moved the badge strip (`N overdue · N need review · N payment-linked`)
  from below the table up into the header row, aligned right. The
  header now reads at a glance: title on the left, sub-line "N open ·
  N overdue · N need review", badges on the right.
- The body keeps the existing skeleton / empty state / table branches.

## Why it looked empty

Three earlier HMR moments left the page rendering through the route's
error boundary while the file recompiled:

1. 8:32:28 — `ClientAlertsBand is not defined` (introduced in stage 3d
   before the function definition was saved).
2. 8:39:20 — Babel parse error during this chrome refactor.
3. The error boundary's recovery render dropped most of the body but
   re-mounted with stale layout state.

Each error window closed by the next HMR within seconds; the user
captured the page during one of those windows. Latest HMR at 8:40:13
shows clean reload — refresh the browser to recover.

## Files

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — refactored
  `ClientWorkPlanPanel` chrome + moved badges into the header row.

## Validation

- `pnpm check` clean (579 files).
- `pnpm --filter @duedatehq/app test -- --run` — 40 files, 209 tests
  pass.
- Visually: Filings & deadlines now reads as the same kind of section
  as Filing jurisdictions / Risk inputs / Activity log below it. Just
  always open.
