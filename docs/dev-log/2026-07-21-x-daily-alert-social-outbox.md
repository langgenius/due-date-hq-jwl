# X daily Alert social outbox

**Date:** 2026-07-21 · Alert / acquisition / Worker

## Outcome

DueDateHQ now owns X Alert publishing inside the existing Cloudflare Worker. D1 stores a reviewed
social outbox and one ET-calendar-day publish slot, the existing 30-minute Cron selects at most one
ready item at 09:00 America/New_York, and a serialized Queue performs the remote X create. The
operator script is a control plane only; it is not another scheduler.

The implementation ships in `draft` mode. No real X Post is created until the seven-day shadow is
reviewed, all four OAuth 1.0a user credentials plus the dedicated social ops token are configured,
and `X_POSTING_MODE` is deliberately changed to `live`.

## Data and scheduling

- Migration `0082_social_alert_outbox.sql` adds `social_alert_post` and `social_publish_run` with
  channel/Pulse and channel/local-date uniqueness constraints.
- Only approved, non-sample, externally useful, source-backed Pulses after the configured cutover
  enter the automatic candidate set. Internal source-health and drift events are excluded.
- Copy is generated deterministically from reviewed Pulse fields and frozen at approval. Approval
  regenerates and revalidates the current facts before setting `ready`.
- The ET scheduler uses IANA timezone conversion, prioritizes manual or near-deadline urgency,
  promotes old ready items, and otherwise preserves FIFO ordering.
- The D1 claim is an atomic batch. Duplicate Cron invocations, competing claims, Queue redelivery,
  and DLQ delivery are guarded by unique slots plus conditional status transitions.
- The consumer rejects a queued run whose reserved ET date is no longer current, so a delayed
  prior-day delivery cannot combine with the new day's slot and produce two actual Posts.
- Explicit X 4xx responses become `failed`. Timeouts, network interruptions, 5xx responses, or
  success bodies without a Post ID become `unknown` and require operator reconciliation; they are
  never blindly replayed.

## Protected acquisition path

The frozen Post URL points to `/alerts?ref=<opaque token>` with campaign-level UTM values. A public
teaser endpoint returns only the already-posted one-line teaser, agency, and jurisdiction. It does
not expose the full summary, official source URL, client matching, or a tenant Alert ID.

Email OTP, Google, and Microsoft sign-in preserve the safe in-app continuation. After auth, the
protected resolver materializes or reuses a zero-match `pulse_firm_alert` for the current firm and
redirects to that firm's own Alert ID. A new firm with an explicit social intent can review that
Alert before migration; the ordinary signup flow is unchanged. Empty impact results offer the
existing client import wizard so the user can unlock matching.

## Operations and monitoring

- `pnpm social:x -- candidates|approve|cancel|reconcile` calls token-protected internal endpoints.
- `SOCIAL_QUEUE` runs with batch size and concurrency of one and has a dedicated DLQ.
- The watchdog reports `unknown` items and ready backlog older than seven days through the existing
  ops alert channel.
- The launch runbook now names the Worker as the sole scheduling authority. No duplicate local Codex
  daily-X automation was present when this change was implemented.

See `docs/ops/x-daily-alert-publishing.md` for shadow review, live cutover, failure reconciliation,
and D1 verification procedures.

## Validation

- Local D1 migration `0082` applied successfully.
- DB: 22 test files, 216 tests passed.
- Contracts: 1 test file, 29 tests passed.
- Worker: 66 test files, 652 tests passed.
- App: 81 test files, 571 tests passed and 2 skipped.
- Social operator CLI: 1 test file, 4 tests passed.
- `pnpm ready` completed formatting/type checks, all workspace tests, and all builds.
- The X OAuth signer is tested with mocked HTTP; no live X request was made.
