# Pulse listAlerts 400

**Date:** 2026-05-21

## Symptom

The dashboard triggered `400 BAD_REQUEST` from `/rpc/pulse/listAlerts`.

## Diagnosis

`PulseListAlertsInputSchema` accepted `limit` from 1 to 20, and the D1 repo also
capped active Pulse alerts at 20. The dashboard hero subtitle called the shared
`usePulseListAlertsQueryOptions(50)` helper, so oRPC rejected the request during
input validation before the procedure handler ran.

## Fix

`/rpc/pulse/listAlerts` now supports up to 50 active alerts end-to-end:

- The contract accepts `limit` from 1 to 50.
- The D1 repo caps the query at 50.
- `usePulseListAlertsQueryOptions` normalizes optional limits before building
  the oRPC query options, preserving `undefined` for the server default and
  clamping invalid values into the supported range.

This lets the dashboard hero request 50 alerts for its open/delta counts and
protects future call sites that use the same helper.

## Docs

No `DESIGN.md` update was required. This is a client/query-contract guard with
no user-visible copy or layout change.

## Validation

- `pnpm --filter @duedatehq/app test -- src/features/pulse/api.test.ts`
- `pnpm --filter @duedatehq/contracts test -- src/contracts.test.ts`
- `pnpm exec vp check packages/contracts/src/pulse.ts packages/contracts/src/contracts.test.ts packages/db/src/repo/pulse.ts apps/app/src/features/pulse/api.ts apps/app/src/features/pulse/api.test.ts docs/dev-log/2026-05-21-pulse-list-alerts-400.md`
