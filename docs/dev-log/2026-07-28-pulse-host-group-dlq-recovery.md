# Pulse host-group DLQ recovery

Date: 2026-07-28

## Incident

Staging emitted `pulse.queue.dead_letter` for a `pulse.ingest.source` message whose affected
sources were `irs.disaster,irs.guidance,irs.tips`. The comma-separated value is the expected
host-group payload, not an invalid source id. The email's `attempts: 1` is the first delivery to
the DLQ consumer; the original message had already exhausted the main Pulse queue retries.

All three IRS listing pages were reachable with HTTP 200 during diagnosis. The local Wrangler
session was not authenticated, so the staging runtime log for this exact message was not available.
The reproducible code-path failure boundary is the Queue invocation budget: the host-group consumer
processed every source in one delivery, while the adapters can start 10, 12, and 12 detail-page
fetches in addition to their three listing-page fetches. At the enforced 30-second same-host
interval, 37 starts require 18 minutes before response time and retry overhead, exceeding
Cloudflare's documented
[15-minute Queue consumer wall-clock limit](https://developers.cloudflare.com/queues/platform/limits/).
A runtime hard kill bypasses the handler's normal source-error recording, which is why the DLQ
email did not carry an application error.

## Fix

- Keep one initial message per host, but treat its `sourceIds` as a continuation chain.
- Process only the head source in each Queue delivery.
- Re-enqueue the remaining group with a 30-second delivery delay after the current source finishes.
- Remove host-group chunking so two chunks for the same host cannot start in parallel on different
  isolates.
- Keep legacy single-source messages compatible and preserve snapshot/extract idempotency for
  at-least-once delivery.

## Validation

- Focused Pulse ingest tests cover one-source-per-delivery continuation, the 30-second delay,
  unknown-head recovery, and unchunked host grouping.
- Architecture and source-catalog current-truth docs now describe the chained execution contract.
