# Email outbox: 100% Resend send failure (tags + 429 handling)

**Date:** 2026-07-05 · triggered by the `[DueDateHQ ops] cron.branch_failed.email_flush`
alert of 2026-07-04T18:00:43Z ("Queue send failed: Bad Gateway")

The alert itself was benign — a transient Cloudflare Queues 502 on the cron
tick's `EMAIL_QUEUE.send` (Cloudflare reported a North-America network
performance incident spanning Jul 3–4; the next 30-min tick re-enqueued the
flush and no backlog remained). But checking the blast radius surfaced the real
problem: **every `email_outbox` row ever flushed had failed — 49/49 failed,
0 sent, since the first row on 2026-06-11.** No morning digest or deadline
reminder email had ever been delivered.

Two independent bugs in `apps/server/src/jobs/email/outbox.ts`:

- **Resend tag validation killed every send that reached the API (26 rows).**
  `processOutboxRow` passed `row.externalId` verbatim as a Resend tag value,
  but externalIds use `:` separators (`morning-digest:<firm>:<user>:<date>`)
  and Resend rejects any tag value outside `[A-Za-z0-9_-]` — the whole send
  fails with "Tags should only contain ASCII letters, numbers, underscores,
  or dashes." Fixed with `resendTagValue()`: non-safe chars → `_`, sliced to
  Resend's 256-char cap.
- **Rate-limited sends were marked terminally failed (23 rows).** The flush
  sent up to 10 rows via `Promise.all`, tripping Resend's requests-per-second
  limit whenever a digest fan-out filled the batch, and the catch-all marked
  429s `failed` with no retry. Fixed twice over: the flush loop is now
  sequential, and transient Resend errors (`rate_limit_exceeded`,
  `concurrent_idempotent_requests`, `application_error`,
  `internal_server_error`) put the row back to `pending` (failureReason
  "Will retry: …") for the next flush tick instead of failing it — safe
  because each row already sends with idempotency key `email-outbox/<row.id>`.
  Validation-class errors stay permanent so a bad row can't retry forever.

Verified: outbox unit tests 6/6 (3 new: tag sanitization, 429 → pending
deferral counted as `skipped`, validation error still terminal), server suite
601/601, `vp check` clean.

Backfill decision: of the 49 failed rows, the 48 morning digests (Jun 11–Jul 3)
are stale and stay failed; the one `deadline_reminder` (created Jul 4, due date
2026-07-11) is still relevant and gets reset to `pending` after this deploys.
Watch out for Resend's 24h idempotency window on the retry — if the Jul 4
failed attempt cached the key, the sanitized payload may 409
(`invalid_idempotent_request`, correctly terminal); re-reset after
2026-07-05T12:01Z if so.
