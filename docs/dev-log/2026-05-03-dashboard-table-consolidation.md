---
title: 'Dashboard Table Consolidation'
date: 2026-05-03
author: 'Codex'
---

# Dashboard Table Consolidation

## Context

Dashboard showed the same operating risk in three nearby surfaces: `Next deadlines`,
`Operational closure`, and the default `This Week` tab inside `Triage queue`. The closure panel also
repeated the top metrics and exposed an internal glass-box implementation note.

## Change

- Removed the standalone `Next deadlines` table and kept `Triage queue` as the only row-level
  Dashboard action table.
- Removed `Operational closure`.
- Promoted `Needs review` into the top metric strip.
- Kept Deadline Radar visible as the top exposure metric with ready / needs-input / unsupported
  counts in the card detail.
- Preserved the Dashboard `#pulse` anchor on the Pulse banner wrapper.

## Docs Check

- Updated frontend architecture notes to describe the single table layout.
- Updated the user manual and app module summary so they no longer mention `Next deadlines` or
  queue stats as separate Dashboard surfaces.

## Validation

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check`
- `pnpm --filter @duedatehq/app test`
- `git diff --check -- apps/app/src/routes/dashboard.tsx apps/app/src/i18n/locales/en/messages.po apps/app/src/i18n/locales/en/messages.ts apps/app/src/i18n/locales/zh-CN/messages.po apps/app/src/i18n/locales/zh-CN/messages.ts docs/dev-file/05-Frontend-Architecture.md docs/project-modules/01-app-spa.md docs/project-modules/14-user-manual.md docs/dev-log/2026-05-03-dashboard-table-consolidation.md`
