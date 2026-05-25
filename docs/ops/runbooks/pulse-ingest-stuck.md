# Pulse Ingest Stuck Runbook

## Scope

This runbook covers `PULSE_QUEUE`, `R2_PULSE`, `pulse_source_state`,
`pulse_source_snapshot`, and `pulse_source_signal`.

## Triggers

- Ingest metrics, logs, or Sentry show repeated fetch/parser failures.
- `pulse_source_state.consecutive_failures` increases or `last_error` stays non-null.
- `pulse_source_snapshot.parse_status` stays `pending_extract`, `extracting`, or `failed`.
- FEMA/GovDelivery style signals appear in `pulse_source_signal` but no T1 Pulse follows.

## First Checks

1. Identify the affected source:

```sql
select source_id, health_status, consecutive_failures, last_checked_at, last_success_at, failure_reason
from pulse_source_state
order by updated_at desc;
```

2. Inspect recent snapshots and signals:

```sql
select id, source_id, title, parse_status, failure_reason, pulse_id, fetched_at
from pulse_source_snapshot
order by fetched_at desc
limit 20;

select id, source_id, title, signal_type, status, linked_pulse_id, fetched_at
from pulse_source_signal
order by fetched_at desc
limit 20;
```

3. If a raw snapshot exists, inspect the `raw_r2_key` object in `R2_PULSE` and compare it against
   the official source URL recorded on the snapshot.

## Recovery

- `selector_drift`: compare the stored raw text with the adapter selectors, patch
  `packages/ingest/src/adapters/index.ts`, add or update a fixture, then re-run ingest tests.
- `pending_extract` / transient AI failure: retry the extract queue after confirming the raw source
  is still official.

- Bad extraction or source mismatch: pause the affected source, mark the bad Pulse/source snapshot
  for engineering review, and notify affected firm owners/managers if an alert already reached
  Rules > Pulse Changes.

- T2 signal without T1 follow-up: leave `pulse_source_signal.status='open'`, verify the matching
  IRS/state canonical source, and only allow firm alerts from T1 evidence.

- Source takedown or revoked source: disable future ingest first, then mark unreconciled Pulse rows
  from that source as `source_revoked`. This preserves historical snapshots/Evidence while blocking
  new apply/dismiss/snooze actions on affected alerts.

## Validation

- `pnpm --filter @duedatehq/ingest test`
- `pnpm --filter @duedatehq/server test -- pulse ingest queue`
- Confirm the next successful run resets `consecutive_failures`, clears `last_error`, and leaves
  CPA-facing `pulse_source_state.health_status='healthy'` unless the source is manually paused.
- Confirm no customer-visible alert was generated from `pulse_source_signal` alone.
- Confirm Obligations/Dashboard dates are derived from active overlay applications after a Pulse apply.

## Post-Mortem Notes

Record the source ID, failure class, first failure timestamp, raw R2 key, fix commit, and whether any
approved Pulse or email digest was affected.
