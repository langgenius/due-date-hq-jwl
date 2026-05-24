---
title: 'Client detail filing plan status sync'
date: 2026-05-24
area: client-detail
---

# Client Detail Filing Plan Status Sync

## Bug

The obligation detail panel can be opened from a client detail Filing plan row. Its stage
buttons, such as "Mark materials received", update the obligation status through the shared
detail-panel mutation path. That path refreshed the drawer detail, obligation queue, dashboard,
deadline tip, and audit queries, but missed the client-scoped `obligations.listByClient` query
that feeds the Filing plan table. The drawer changed while the row pill in the Filing plan could
remain stale.

## Fix

The shared detail invalidation helper now also invalidates `obligations.listByClient`. Any
status-changing action fired from the drawer, including the stage buttons and the drawer status
picker, will refresh the Filing plan rows on the client detail page after the mutation succeeds.

No `DESIGN.md` update required: this fixes data freshness for the existing client detail flow
without changing IA, copy, or layout.

## Validation

- `pnpm --filter @duedatehq/app exec tsc --noEmit --pretty false`
- `git diff --check -- apps/app/src/routes/obligations.tsx docs/dev-log/2026-05-24-client-detail-filing-plan-status-sync.md`
- Playwright smoke on
  `http://localhost:5173/clients/13000000-0000-4000-8000-000000000005` as the `plan-team`
  demo account:
  - before: first Form 1041 row showed `Waiting on client`
  - after clicking `Mark materials received`: the same Filing plan row showed `In review`
  - after toast `Undo`: the row returned to `Waiting on client`
  - console warnings/errors: none
