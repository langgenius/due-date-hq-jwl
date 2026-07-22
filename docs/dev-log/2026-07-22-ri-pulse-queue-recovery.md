---
title: '2026-07-22 · RI Pulse challenge routing and queue failure evidence'
date: 2026-07-22
author: Codex
---

# RI Pulse challenge routing and queue failure evidence

## Incident

The `ri.tax_disaster_advisories` Pulse message reached delivery attempt 4 and emitted
`queue.dispatch.dropped`. A production-equivalent direct request to
`https://tax.ri.gov/guidance/advisories` returned HTTP 403 with
`cf-mitigated: challenge` and the Cloudflare “Just a moment” interstitial.

The source-level fetch failure path already recognizes that interstitial as a standing block, but
the queue alert did not contain the exception that escaped source processing. The queue also
discarded delivery 4 before calling the handler, so a transient D1 recovery on the final available
delivery could never succeed.

## Changes

- Added `ri.tax_disaster_advisories` to `PULSE_BROWSERLESS_SOURCE_IDS`. It now uses the existing
  Cloudflare Browser Rendering `/content` endpoint, alongside `ri.temporary_announcements`, while
  retaining the disaster-specific official source.
- Changed queue dispatch to process all four deliveries produced by `max_retries=3`. A fourth
  failure is acknowledged and emailed with `queue`, `messageId`, `messageType`, `attempts`,
  `sourceId`, and the actual terminal `error`.
- Expanded pre-final `queue.dispatch.retry` logs with the same identity and error fields.
- Made Pulse ingest read existing source state before falling back to `ensureSourceState`, avoiding
  a steady-state D1 upsert + read-back on every queue delivery. The loaded state is reused for
  conditional-request headers, avoiding a second point read.
- Added explicit `source_state_load_failed` and `source_failure_state_write_failed` errors. When
  recording a fetch failure in D1 also fails, the propagated queue error preserves both causes.

## Validation contract

- RI adapter tests must prove the allowlisted source calls the render endpoint with the official
  advisory URL.
- Queue tests must prove delivery 4 executes, successful recovery is acked without an alert, and a
  terminal failure includes the final error and message identity.
- Pulse ingest tests must prove steady-state reads avoid the upsert and D1 read/write failures name
  their source and stage.
