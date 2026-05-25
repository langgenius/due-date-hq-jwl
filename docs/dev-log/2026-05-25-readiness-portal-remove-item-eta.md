# 2026-05-25 · Readiness portal remove item ETA

## Summary

Removed per-item ETA/date capture from the client-facing readiness portal.

## Changes

- The `/readiness/:token` checklist now asks only for each item status and optional note.
- The public readiness contract no longer returns or accepts per-item `etaDate`.
- Submitted readiness responses rely on the overall `submittedAt` timestamp as the response time.

## Validation

- `pnpm exec vp check apps/app/src/routes/readiness.tsx apps/server/src/routes/readiness.ts packages/contracts/src/readiness.ts docs/dev-log/2026-05-25-readiness-portal-remove-item-eta.md`
- `pnpm --filter @duedatehq/app exec tsc --noEmit`
- `pnpm --filter @duedatehq/server exec tsc --noEmit`
- Browser smoke against the provided portal URL confirmed the `Select date` controls are gone.
