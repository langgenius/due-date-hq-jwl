# X Draft Buffer and Three-Day Cadence Design

## Status

Approved for implementation on 2026-08-12.

## Goal

Keep three valid, unapproved X drafts available for review after every daily scheduler pass, while
changing normal automatic X publication from a two-day cadence to a three-day cadence.

The scheduler remains the only automatic publishing authority. Social Ops remains the only approval
authority, and the GitHub Issue remains a visibility-only mirror.

## Required Behavior

### Review buffer

- During every 09:00-09:29 `America/New_York` scheduler window, the Worker reconciles active X
  candidates and fills the valid `draft` buffer to a target of three.
- The target counts only eligible Posts whose current status is `draft`. `ready`, `scheduled`,
  `published`, `unknown`, and `cancelled` Posts do not consume the target.
- A buffer containing zero, one, two, or three valid drafts creates three, two, one, or zero new
  drafts respectively.
- Approving all three drafts therefore allows the following daily scheduler pass to expose up to
  three new drafts, assuming enough eligible Alerts exist.
- Candidate selection stays newest-Pulse-first and continues to enforce the configured
  `X_SOCIAL_START_AT` cutover for automatic creation.
- If fewer than three eligible, not-yet-outboxed Alerts exist, the scheduler creates the available
  prefix and reports the actual count without fabricating or duplicating content.
- Draft replenishment also runs on automatic cadence-pause days. A day that cannot publish may
  still refresh the review buffer.

### Automatic publication cadence

- A normal automatic publish slot is available only when neither of the preceding two ET calendar
  dates has an occupied `social_publish_run` for X.
- This produces a three-calendar-day cadence: a Monday automatic run makes Thursday the earliest
  next automatic run, leaving Tuesday and Wednesday empty.
- Weekends remain ordinary calendar days.
- The existing unique `(channel, local_date)` run ledger continues to enforce at most one automatic
  run per channel and ET date.
- Manual `publish-now` remains an explicit operator override and is not newly restricted by the
  automatic cadence policy.

## Architecture

### Shared draft-buffer orchestration

Extract the bounded buffer-fill loop currently used by the Social Ops `seed-drafts` route into a
shared server-side social helper. Both the operator route and `runXSocialCron` call this helper with
their own policy inputs:

- Automatic scheduler: target `3`, `since = X_SOCIAL_START_AT`.
- Operator backfill: requested target `1..14`, `since = new Date(0)`.

The helper owns candidate pagination, deterministic newest-first ordering, runtime validation,
copy construction, sequential conditional inserts, and the final authoritative buffer read. Its
result reports existing, created, total, target reached, buffer full, and skipped counts.

The caller remains responsible for cancelling active Posts that are no longer eligible before
filling the buffer. This preserves the current claim ordering and keeps cancellation policy outside
the reusable creation helper.

### Atomicity and idempotency

Each creation uses the existing `createDraftIfBufferBelow` conditional insert. D1 checks the current
eligible `draft` count and candidate uniqueness in the same SQL statement, so repeated Cron ticks or
concurrent operator requests cannot grow the eligible buffer beyond the requested target.

The shared helper inserts sequentially. This keeps the returned `created` prefix aligned with
durable D1 state and avoids racing several read-then-insert operations.

The obsolete daily-one-draft path (`createDailyDraft` and its daily creation-window guard) is
removed after the scheduler moves to the shared buffer helper. No schema migration is required.

## Scheduler Data Flow

Within the valid daily ET window:

1. Validate `X_SOCIAL_START_AT` and initialize the repository.
2. Read occupied X run dates covering the preceding two ET calendar dates.
3. Cancel active X Posts that no longer pass runtime eligibility.
4. If either preceding date is occupied:
   - attempt to fill the draft buffer to three;
   - return `cadence_pause` with the actual `draftsCreated` count;
   - do not claim or enqueue a Post.
5. Otherwise claim at most one `ready` Post for today's automatic slot.
6. After the claim transition, fill the draft buffer to three. Running replenishment after claim is
   important in draft/shadow mode because the claimed Post returns to `draft` and must count toward
   the target rather than producing a fourth draft.
7. In live mode, enqueue the claimed run exactly as today. Draft replenishment failure emits the
   existing ops alert but does not prevent the already-claimed Post from reaching the queue.

Idle and draft/shadow results retain their current publication semantics while returning the actual
number of drafts created during that scheduler pass.

## Queue Projection

`X_AUTOMATIC_PUBLISH_INTERVAL_DAYS` changes from `2` to `3` and remains the single exported cadence
constant for the read-only queue projection.

For every projected date, the preview rejects dates within two calendar days before or after any
occupied or already projected date. It continues to show drafts without dates until approval and
maps `ready` Posts newest-Pulse-first into tentative three-day slots.

The `cadenceDays` response becomes `3`. `nextAutomaticLocalDate`, projected dates, the CLI queue
view, and the GitHub review mirror therefore stay aligned with the scheduler.

No future `social_publish_run` rows or queue messages are created by a preview.

## Error Handling and Observability

- Candidate validation failures are skipped and counted; they do not consume the target.
- Candidate conflicts continue to the next eligible Alert.
- A concurrent `buffer_full` result stops replenishment and is treated as a successful idempotent
  outcome.
- D1 or copy-building failures use the existing `social.x.draft_replenish_failed` log and ops-alert
  path.
- On live publish days, replenishment failure never cancels or rolls back an already claimed run.
- On cadence-pause days, replenishment failure still returns `cadence_pause` with
  `draftsCreated: 0`; it never opens a publish slot.
- Existing X main-Post and first-reply failure semantics are unchanged.

## Security and Privacy

- Draft creation continues to use deterministic copy built only from already approved,
  externally useful Pulse fields.
- Existing PII, source-policy, sample-data, date, and runtime eligibility checks remain mandatory.
- No X, Social Ops, or GitHub credential moves into the shared helper or public response.
- GitHub continues to mirror the token-gated Social Ops projection and cannot approve a draft.

## Test Strategy

Implementation follows test-driven development.

- Scheduler tests prove that a paused day replenishes to three without claiming, an eligible day
  replenishes after claim, a full buffer creates nothing, and a live enqueue survives replenishment
  failure.
- Shared-helper tests prove zero-to-three, partial fill, insufficient candidates, invalid-candidate
  pagination, candidate conflicts, and concurrent buffer-full behavior.
- Repository tests retain the conditional-count and uniqueness assertions while removing tests for
  the obsolete daily-one-draft insert.
- Queue-preview tests prove Friday-to-Monday three-day projection, two empty calendar days around
  occupied runs, weekend inclusion, `cadenceDays: 3`, and the next automatic date after today's
  occupied slot.
- Social Ops route tests prove `seed-drafts` still supports explicit `1..14` targets through the
  same shared helper.
- Focused social/server/database suites run before the full `pnpm ready` handoff gate.

## Documentation and Rollout

Update the system architecture, data model, security notes, X operations runbook, and a dated dev
log in the same implementation change. Remove claims that automatic operation creates at most one
draft or uses an every-other-day cadence.

The change requires a Worker deployment but no D1 migration or credential change. Deployment does
not publish immediately by itself; the next valid 09:00 ET scheduler pass applies the new buffer and
cadence rules.

## Non-Goals

- Reserving future publish runs or assigning dates to unapproved drafts.
- Changing newest-Pulse-first publication priority.
- Automatically approving drafts.
- Changing manual `publish-now` behavior.
- Changing the link-free main Post plus tracked first-reply format.
- Mutating production D1 or publishing to X as part of implementation verification.
