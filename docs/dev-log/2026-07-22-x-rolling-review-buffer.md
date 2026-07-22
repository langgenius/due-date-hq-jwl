---
title: 'X daily review drafts and newest-first queue'
date: 2026-07-22
area: alerts
status: implemented
---

# X daily review drafts and newest-first queue

## Outcome

The X scheduler no longer turns every eligible Pulse into a draft on every 30-minute Worker tick.
During the 09:00 `America/New_York` daily slot, it processes one ready Post and creates at most one
new deterministic draft for that ET calendar day. The candidate is the newest eligible,
not-yet-outboxed Pulse. Older drafts may remain visible while the next day's newer candidate is
added.

Operators can therefore use the existing command directly after the daily run:

```bash
pnpm social:x -- queue
```

The command has a fixed 14-day horizon. Automatic review candidates appear under `drafts` with
`reason: approval_required`; a separate
`candidates --pulse` bootstrap is not part of normal daily operation. The queue endpoint remains
read-only and does not generate content while it is being viewed.

## Safety and scheduling semantics

- A single `INSERT ... SELECT` checks whether the channel already created any Social Post inside
  the current ET day's exact UTC bounds. Together with `(channel, pulse_id)` uniqueness, duplicate
  Cron delivery cannot create two automatic review candidates that day.
- Existing `ready` Posts remain date-projected while the automatic draft exposes the next item that
  still needs review.
- The explicit approval gate is unchanged. Drafts have no projected date; approval rebuilds and
  freezes the current deterministic copy before the Post enters the ready queue.
- Candidate generation, ready claim, and queue preview all use `Pulse.createdAt DESC` with Pulse ID
  as a deterministic tie-breaker. A newly approved, newer Alert moves ahead of older ready Posts.
- A draft is a review candidate, not a reserved appointment. Cancellation, `publish-now`, and
  failed/unknown runs can still move its eventual date.
- A stale draft does not block later ET days. Operators should still approve or cancel it; the next
  day independently adds at most one then-newest eligible candidate.
- `pnpm social:x -- seed-drafts` is a token-gated operator bootstrap that atomically fills the
  current buffer to three eligible drafts from newest candidates; retries and concurrent calls
  cannot append a second full batch, and it is not a second scheduler.
- Newest-first candidate reads use keyset pagination after full PII/runtime validation, so a rejected
  100-row page cannot permanently starve older valid Alerts.
- Runtime-invalid drafts are swept before replenishment so a row hidden from queue preview cannot
  permanently block the review buffer.
- The sweep keyset-paginates every active draft/ready row, and database projection shares the same
  conservative email/nine-digit public-copy guard as content generation.
- Operator seeding applies the same sweep, counts only drafts whose joined Pulse still satisfies
  candidate policy inside the atomic insert, and re-reads the eligible projection before reporting
  the final buffer. Concurrent seed requests therefore report the durable shared result.
- Because seeding is a token-gated operator backfill, it can fill the initial buffer from the newest
  pre-cutover Alerts; the unattended daily scheduler alone enforces `X_SOCIAL_START_AT`.
- Live enqueue or later Queue failures return the attempted Post to draft and consume that ET day's
  slot. It can sit beside the already-created rolling draft; both remain visible for explicit review
  instead of being discarded.
- A replenishment failure is logged and emits an ops alert, but does not prevent today's already
  claimed Post from reaching Queue.

## Validation

- Focused scheduler coverage locks the daily-only gate, DST-aware bounds, one-candidate
  replenishment, invalid candidate skipping, candidate-race continuation, shadow behavior,
  pre-enqueue ordering, and enqueue-failure handling.
- Repository coverage inspects newest-first SQL, the atomic D1 daily guard, reasoned no-op results, and
  runtime-invalid draft cleanup.
- Queue preview uses the same newest-first order as the production claim and remains a read-only
  projection that exposes drafts separately from dated ready Posts.
