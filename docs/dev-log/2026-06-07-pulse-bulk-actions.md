# Pulse bulk dismiss/snooze + functional per-row actions

Date: 2026-06-07

First item of the backend data pass: replace the alerts bulk-action bar's
client-side per-alert loop (Pencil g5kKJQ shipped it as a stopgap with a
`TODO(data)`) with real batch endpoints, and make the per-row Snooze/Dismiss
buttons actually fire.

## What shipped

### `pulse.bulkDismiss` / `pulse.bulkSnooze` (no DB migration)
- `packages/contracts/src/pulse.ts` — `PulseBulkDismissInputSchema`,
  `PulseBulkSnoozeInputSchema` (`alertIds` max 100), shared
  `PulseBulkActionOutputSchema` (`alerts`, `auditIds`, `failedIds`); registered
  in `pulseContract` after `dismiss`/`snooze`; barrel-exported.
- `apps/server/src/procedures/pulse/index.ts` — handlers loop the existing
  scoped `pulse.dismiss`/`snooze` repo methods, so **every alert keeps its own
  audit event**; un-actionable alerts (already-terminal, snooze-in-past,
  unauthorized) fall into `failedIds` instead of aborting the batch; one
  dashboard-brief refresh fires at the end. Registered in the router in
  contract key order (the parity test deep-equals the key lists).
- `packages/contracts/src/contracts.test.ts` — froze the two new procedure keys.

### Client wiring (`apps/app/src/features/alerts/AlertsListPage.tsx`)
- Bulk bar now calls `bulkSnooze`/`bulkDismiss` once (one round-trip + one
  toast, with a warning toast when `failedIds` is non-empty) instead of looping
  N per-alert mutations client-side.
- Completed the per-row direct-fire intent: row Snooze/Dismiss now call the
  per-alert mutations directly (24h snooze / no-reason dismiss) — they
  previously set an unconsumed `reasonState` (dead scaffolding from the g5kKJQ
  pass), so the row buttons were no-ops. Removed the dead `reasonState` /
  `closeReasonDialog` / `ReasonAction` plumbing.

## Still unwired (no contract surface)
- "Apply all" — must keep the per-alert source-verification gate (F-041), the
  highest-liability path; stays disabled with a tooltip.
- "Mark all read" (needs a per-alert read-state column), "Assign", "Export".

## Verify
- tsgo (app + server + contracts) → 0
- alerts 72/73, server pulse 75/75, contracts 29/29
- `vp check` → 0 errors
