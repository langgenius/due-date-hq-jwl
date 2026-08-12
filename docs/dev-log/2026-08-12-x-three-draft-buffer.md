# X three-draft review buffer and three-day cadence

**Date:** 2026-08-12 · Social distribution / X / Worker

## Outcome

The daily 09:00 `America/New_York` social pass now keeps three valid X drafts available for review,
including on cadence-pause days. Normal automatic publishing uses a three-calendar-day cadence:
an occupied run on either of the preceding two ET dates blocks today's claim, leaving two empty
dates between automatic Posts.

This addresses the review bottleneck where an operator could approve only the single draft created
on an eligible publish day. Approval remains explicit; filling the buffer never moves a Post from
`draft` to `ready` and never reserves a future publish date.

## Shared buffer boundary

- `fillXDraftBuffer` owns newest-Pulse-first candidate paging, runtime/PII validation, deterministic
  main/reply copy construction, conflict handling, and the final authoritative buffer read.
- The automatic scheduler calls it with target `3` and the `X_SOCIAL_START_AT` cutover. The
  token-gated `seed-drafts` route calls the same helper with an operator target from `1` through `14`
  and may intentionally include pre-cutover candidates.
- Both paths rely on `createDraftIfBufferBelow`, whose conditional insert prevents duplicate Cron,
  retries, or concurrent requests from exceeding the target. The obsolete one-draft-per-day
  repository method was removed.
- A shadow claim returns its Post to `draft` before reconciliation, so that Post counts toward the
  target and cannot cause a fourth draft.
- Replenishment errors emit `social.x.draft_replenish_failed`; an already claimed live Post still
  proceeds to the serialized publish Queue.

## Cadence and projection

`UNIQUE(channel, local_date)` remains the hard one-run-per-ET-date cap. The scheduler and read-only
queue preview share `X_AUTOMATIC_PUBLISH_INTERVAL_DAYS = 3`; the preview looks back two ET dates and
does not create future run rows. For example: Monday automatic Post, Tuesday pause, Wednesday pause,
Thursday next eligible automatic Post. Pause-day reconciliation still fills the draft buffer.

No schema migration was required because the existing outbox rows, per-date run ledger, and atomic
buffer insert already model the new behavior.

## Validation

- Shared buffer, scheduler, queue projection, and Social Ops route: 4 files / 52 tests passed.
- DB social repository: 1 file / 36 tests passed after removing the obsolete daily-draft API.
- Changed TypeScript files passed formatting, lint, and type-aware checks.
- No real X API request, remote D1 mutation, deployment, or push was performed during implementation.
