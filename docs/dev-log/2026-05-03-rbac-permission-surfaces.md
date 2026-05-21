---
title: 'RBAC Permission Surfaces'
date: 2026-05-03
author: 'Codex'
area: security
---

# RBAC Permission Surfaces

## Context

Manager, preparer, and coordinator demo roles needed visible but restricted surfaces so role
differences can be tested without hiding navigation or relying on raw 403 errors.

## Change

- Added the shared `@duedatehq/core/permissions` role matrix and wired server role gates to it.
- Added app-level permission primitives for page, section, and action gates.
- Applied gates across Members, Billing, Practice profile, Audit, Pulse, Migration, Calendar, the
  command palette, and dashboard deadline readiness.
- Updated E2E auth seeding so non-owner role sessions keep a separate practice owner instead of
  being treated as owner through `firm_profile.ownerUserId`.
- Added unit/app/E2E coverage for the key manager, preparer, and coordinator permission surfaces.

## Docs Check

Updated Security and Frontend architecture docs with the shared permission matrix, the visible but
restricted interaction pattern, and the owner-only audit export rule.

## Validation

- `pnpm --filter @duedatehq/core test`
- `pnpm --filter @duedatehq/app test -- --run`
- `pnpm --filter @duedatehq/server test -- --run`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm test:e2e e2e/tests/rbac-permissions.spec.ts`
- `pnpm ready`
