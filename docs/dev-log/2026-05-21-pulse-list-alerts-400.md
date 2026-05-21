# Pulse listAlerts 400

**Date:** 2026-05-21

## Symptom

The dashboard triggered `400 BAD_REQUEST` from `/rpc/pulse/listAlerts`.

## Diagnosis

`PulseListAlertsInputSchema` accepts `limit` from 1 to 20, and the D1 repo also
caps active Pulse alerts at 20. The dashboard hero subtitle called the shared
`usePulseListAlertsQueryOptions(50)` helper, so oRPC rejected the request during
input validation before the procedure handler ran.

## Fix

`usePulseListAlertsQueryOptions` now normalizes optional limits before building
the oRPC query options:

- `undefined` stays `undefined`, preserving the server default.
- Oversized values clamp to the contract maximum of 20.
- Non-positive and fractional values are normalized to valid integer inputs.

This keeps the dashboard hero from sending an invalid body and protects future
call sites that use the same helper.

## Docs

No `DESIGN.md` update was required. This is a client/query-contract guard with
no user-visible copy or layout change.

## Validation

- `pnpm --filter @duedatehq/app test -- src/features/pulse/api.test.ts`
- `pnpm exec vp check apps/app/src/features/pulse/api.ts apps/app/src/features/pulse/api.test.ts docs/dev-log/2026-05-21-pulse-list-alerts-400.md`
