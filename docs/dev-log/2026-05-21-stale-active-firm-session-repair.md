---
title: 'Stale Active Firm Session Repair'
date: 2026-05-21
author: 'Codex'
area: auth
---

# Stale Active Firm Session Repair

## Context

Local OAuth sessions can outlive a practice soft-delete. When `session.activeOrganizationId`
still points at a firm whose `firm_profile.status` is `deleted`, protected RPC calls reach
tenant middleware and fail with a 403 before the app can switch the user to another active firm.

## Change

- Added session middleware repair that validates `activeOrganizationId` against active membership
  plus active, non-deleted `firm_profile`.
- If the current firm is stale, the current session is updated to the user's earliest active firm.
- Kept first-time users on the existing onboarding path when no active firm exists.
- Added middleware coverage for the stale-session repair path.

## Validation

- `pnpm --filter @duedatehq/server test -- src/middleware/session.test.ts`
