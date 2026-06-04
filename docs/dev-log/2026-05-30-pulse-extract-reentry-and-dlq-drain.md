# 2026-05-30 · Pulse extract re-entry, DLQ drain, queue retry metric

Three reliability/observability fixes on the Pulse queue path. They are
complementary: #1 stops snapshots from silently stranding, #3 makes the
failures that do happen visible, #4 makes the retry telemetry that precedes
them correctly labeled.

## Context

A review of the Pulse ingest → extract → firm-alert pipeline surfaced three
gaps in the queue/extract layer:

1. **Snapshot stuck in `extracting` forever.** `extractPulseSnapshot` marks
   `parseStatus: 'extracting'` before running the AI extraction, but the
   re-entry guard only re-processed `pending_extract` and `failed`. If an
   attempt was hard-killed (CPU / wall-clock limit) _after_ the mark but
   _before_ its catch could run, the row stayed `extracting`. Every
   subsequent queue retry then hit the guard and returned a no-op `skipped` —
   the snapshot was dead but looked in-flight forever.

2. **Pulse DLQ had no consumer.** `wrangler.toml` wires
   `dead_letter_queue = "due-date-hq-pulse-dlq-staging"` on the pulse
   consumer, but nothing consumed that DLQ. A snapshot that exhausted
   `max_retries` landed there and died silently — no alert, no log, no trace.

3. **Queue retry metric mislabeled.** The dispatch catch emitted
   `recordPulseMetric('pulse.queue.retry', { queue: 'unknown', ... })`. The
   category was wrong (a failing email / dashboard / audit job was logged as a
   `pulse` metric) and `queue` was hardcoded to the literal `'unknown'`, so
   the structured log never told you which contract actually failed.

## Change

### #1 — `extracting` is now re-enterable (`jobs/pulse/extract.ts`)

- Guard now also re-processes `extracting`, so a stranded row gets picked back
  up on the next retry instead of short-circuiting to `skipped`.
- Wrapped the extraction body in a try/catch around the `extracting` mark. A
  _thrown_ error (R2 / AI / DB infra — distinct from an AI refusal, which
  returns a `failed` result) resets `extracting → failed` so the DB never
  shows a dead row as perpetually extracting, records a `failed` extract
  metric, then re-throws so the queue can retry / DLQ. The status write is
  best-effort: a secondary write error is swallowed so the original error
  still propagates.
- Extracted the unchanged ~185-line body into `runPulseExtractionAfterMark`
  so the new try/catch did not force a re-indent of the whole function.

### #3 — Pulse DLQ drain consumer (`wrangler.toml`, `jobs/queue.ts`)

- Added a `[[queues.consumers]]` for `due-date-hq-pulse-dlq-staging` with
  `max_retries = 0` and no chained DLQ — draining must not re-run the failing
  handler.
- `queue()` now detects a DLQ batch via `isPulseDeadLetterQueue(batch.queue)`
  and routes it to `drainDeadLetterBatch`, which emits one
  `pulse.queue.dead_letter` alert per message (via `recordPulseAlert`,
  carrying `queue` / `messageType` / `attempts` / `snapshotId`) and acks. The
  poisoned message is now observable instead of vanishing.

### #4 — Correctly labeled retry metric (`jobs/queue.ts`)

- Replaced the mislabeled `recordPulseMetric('pulse.queue.retry', …)` call
  with `recordQueueRetry(body, error)`, which logs a
  `type: 'queue.metric'`, `name: 'queue.dispatch.retry'` structured line
  carrying the real `messageType` (from the new `queueMessageType` helper) and
  the error message. Any queue's dispatch failure is now labeled by its actual
  contract, not bucketed under `pulse`.
- Added `queueMessageType` and `isPulseDeadLetterQueue` as exported helpers so
  the consumer and the tests share one definition.

## Why this shape

- The three fixes close one loop. #1 was the root failure mode (silent
  stranding); but even with #1, a genuinely poisoned snapshot still needs a
  terminal signal — that's #3. And the retry telemetry that leads up to a DLQ
  landing was unusable because of #4. Fixing one without the others would have
  left a blind spot.
- `extracting` re-entry is deliberately permissive rather than adding a
  separate "stale extracting" sweeper: the queue already retries, so the
  cheapest correct fix is to let the existing retry re-enter.
- The DLQ consumer alerts-and-acks rather than re-dispatching by design — the
  whole point of a DLQ is that the handler already failed `max_retries` times;
  re-running it would just re-poison.

## Validation

- `pnpm --filter @duedatehq/server test -- jobs` — all jobs tests pass
  (63), including the 5 new ones:
  - extract: resets to `failed` + rethrows on mid-flight throw; re-processes a
    snapshot stranded in `extracting`.
  - queue: labels messages by contract type; detects pulse DLQ without
    matching the live queue; drains a DLQ batch and alerts instead of
    re-dispatching (acks once, never retries).
- `pnpm --filter @duedatehq/server exec tsc --noEmit` — clean.
- `vp check` — 0 errors (8 pre-existing warnings, none from this change). The
  queue test doubles needed an `eslint-disable typescript-eslint/no-unsafe-type-assertion`
  file header, matching the existing convention in `extract.test.ts`.

## Follow-ups / not closed

- **Deploy:** `due-date-hq-pulse-dlq-staging` already exists (it was the DLQ
  target); adding it as a consumer is wired by the next `wrangler deploy`. The
  other DLQs (`email`, `dashboard`, `audit`) still have no drain consumer —
  same silent-death gap, not addressed here.
- **Alerting:** there is no alert rule yet on the `pulse.queue.dead_letter`
  alert or the `queue.dispatch.retry` metric — they are emitted as structured
  logs but nothing pages on them.
- **Out of scope (from the same review):** `withPulseMutationLock` uses a
  non-atomic KV read-then-write (race window); `scheduled` runs `runPulseIngest`
  synchronously every 30 min on the cron path. Neither touched here.
