# X publishing queue preview

**Date:** 2026-07-22 · Alert / acquisition / Social Ops

## Outcome

Social Ops now exposes a read-only preview of the upcoming X publishing sequence. Operators can see
the currently approved backlog and its estimated ET publication dates before the Worker sends one
Post per day:

```bash
pnpm social:x -- queue --days 14
```

The CLI reads `GET /api/ops/social/queue` with the existing dedicated Social Ops authorization. The
preview is derived from D1 state and uses the same urgent/aging/FIFO ordering contract as the daily
claim. It does not become a second scheduler.

## Queue semantics

- Only `ready` Posts receive an estimated publication date. Their public copy and target URL are
  already frozen at approval.
- Eligible `draft` Posts appear in the preview's separate `drafts` collection and remain available
  through `candidates --status draft` for focused review. They have no position or date until
  approval.
- Dates use `America/New_York` calendar days and include weekends. Actual publishing remains capped
  at one Post during the 09:00 ET slot each day.
- The preview does not reserve future `social_publish_run` rows and does not put delayed messages in
  `SOCIAL_QUEUE`. The daily claim remains the only operation that consumes a publishing slot and
  enqueues a real X create.
- Dates are estimates. New urgent Posts, the three-day aging promotion, cancellation or loss of
  eligibility, `publish-now`, and failed/unknown attempts can reorder or shift later dates.
- Ready reads are split into urgent and normal FIFO partitions before the per-slot aging simulation;
  this prevents a large current urgent backlog from hiding a normal Post that reaches 72 hours
  during the preview window. Truncation flags disclose rows beyond the requested/viewable horizon.

## Safety and validation contract

The endpoint remains behind `SOCIAL_OPS_TOKEN` outside development and is read-only: requesting a
preview must not update Post status, create a run, or send a Queue message. The required repository,
route, and CLI coverage includes claim-order parity, consumed ET days, date projection across DST
boundaries, input bounds, authorization, and pnpm's preserved `--` argument separator.
