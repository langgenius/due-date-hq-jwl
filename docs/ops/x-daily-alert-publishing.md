# X Daily Alert Publishing Runbook

## Scope and invariants

The SaaS Worker is the only scheduling authority. Its daily publishing/replenishment branch runs
only in the 09:00 America/New_York window; the separate social watchdog still runs on every
30-minute Cron tick. After claiming today's slot and before a live Queue enqueue, the daily branch
atomically creates at most one eligible draft for that ET calendar day from the newest
not-yet-outboxed Alert. Older drafts may remain in review; they do not block the next day's draft.
A separate serialized `SOCIAL_QUEUE` performs the remote X create.
The `pnpm social:x` script is an operator control plane; do not schedule that script with Codex,
launchd, GitHub Actions, or another cron.
`.github/workflows/x-draft-review.yml` is the narrow exception for visibility only: it reads the
existing queue projection after the daily slot and mirrors unseen drafts to one GitHub issue. It
never runs the operator CLI, mutates D1, reserves a date, approves a Post, or enqueues X work.
Actions delay or failure therefore does not affect the Worker publishing path.

Hard invariants:

- `UNIQUE(social_alert_post.channel, pulse_id)` prevents the same Alert entering the outbox twice.
- `UNIQUE(social_publish_run.channel, local_date)` caps every ET calendar day at one attempt.
- An explicitly re-approved Post may promote its own same-day `draft_only` shadow row to `queued`;
  that row cannot be reused for a different Post, channel, or ET date.
- A failed or unknown attempt consumes that day; no replacement is sent.
- A queued message is sent only while its reserved ET `local_date` is still current. A delayed
  prior-day delivery becomes `failed` and returns to review, preventing two actual Posts on the new
  ET date.
- `unknown` never retries automatically. Check the DueDateHQ X account, then reconcile.
- X links go to protected `/alerts?ref=...`; there is no public Alert detail page.
- Approved, non-sample, source-backed Pulses are eligible unless their source is explicitly marked
  as signal-only. FEMA declarations and generic GovDelivery inbound Alerts provide early signals
  that have not yet been attributed to a tax filing or deadline change, so they never enter the
  social outbox. `action_mode='review_only'` alone does not disqualify an otherwise useful source
  change.
- Public header copy expands two-letter state codes to full state names. Official form identifiers
  and `utm_content` keep their stable state codes.
- Normal live operation uses the 09:00 ET slot and publishes at most one previously approved
  `ready` Post. `publish-now` is reserved for an explicit operator exception.
- Draft generation, ready projection, and the normal daily claim order by the source Pulse's
  `created_at DESC, id DESC`. A newer Alert therefore enters review and publishes before an older
  Alert once both are approved. The stored `urgent` label does not overtake a newer Alert;
  `publish-now` is the explicit operator override.
- The daily branch generates at most one automatic review candidate per ET calendar day. A D1
  conditional insert uses exact DST-aware day bounds, so duplicate Cron deliveries cannot add two
  candidates that day. Older drafts and existing `ready` Posts do not hide the newest item awaiting
  review.
- Full runtime/PII validation runs before a candidate is drafted. If an entire 100-row newest-first
  page is rejected, the scheduler continues with a `(Pulse.createdAt, Pulse.id)` keyset cursor so
  older valid Alerts are not permanently starved.
  Draft creation never bypasses the explicit `draft -> ready` approval gate.
- If a live enqueue or later Queue delivery definitely fails, the attempted Post returns to
  `draft`. It may sit beside the newly replenished review candidate; both remain visible and require
  an explicit approval or cancellation. This safe failure state does not create a second X Post or
  reuse the consumed ET slot.
- The future queue is a read-only projection of the current `ready` backlog. Viewing it never
  creates a draft, reserves a future `social_publish_run`, or sends a future `SOCIAL_QUEUE` message.
- A GitHub issue snapshot is public visibility, not editorial approval. A comment, reaction, label,
  or issue state change never moves a Post from `draft` to `ready`; only the token-gated Social Ops
  approve endpoint with a real Better Auth reviewer can do that.

## Configuration

Keep this during the seven-day shadow:

```bash
X_POSTING_MODE=draft
X_SOCIAL_START_AT=2026-07-21T00:00:00.000Z
```

Generate and store `SOCIAL_OPS_TOKEN` separately from auth, E2E, and X credentials. The operator CLI
reads these shell variables (it does not load Worker `.dev.vars` automatically):

```bash
export SOCIAL_OPS_URL=https://app.duedatehq.com
export SOCIAL_OPS_TOKEN='<dedicated token>'
export SOCIAL_OPS_REVIEWER='<better-auth user id>'
```

Before live mode, configure all four OAuth 1.0a user credentials:

```bash
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=
```

Never pass secrets as command arguments or put them in a tracked file.

The GitHub mirror reads the same token from the protected `due-date-hq-staging` environment. The
workflow has no `pull_request` trigger, checks out only the default branch revision that triggered
the run, sends the Social bearer only to `https://app.duedatehq.com`, and gives the short-lived
repository `GITHUB_TOKEN` only `contents: read` plus `issues: write`. Never print either token or
the raw queue payload. `SOCIAL_OPS_TOKEN` remains a broad operator credential, so any future
workflow that needs PR or fork code must use a separate read-only credential rather than expanding
this trust boundary.

Verify the fixed account with a signed, read-only OAuth 1.0a request. The command returns only the X
user ID and username; it never prints credentials:

```bash
pnpm social:x -- verify-account
```

## Daily review commands

List drafts and their current preview copy/URL. Approval rebuilds the deterministic copy from the
current Pulse and freezes the resulting `ready` Post:

```bash
pnpm social:x -- candidates --status draft --limit 50
```

Create a one-off draft for a specific eligible historical Pulse (the automatic cutover is bypassed,
but all approval, source, PII, sample, scope, and date gates still apply):

```bash
pnpm social:x -- candidates --pulse '<pulse id>'
```

Ensure that the current review buffer contains three drafts, filling any missing positions from the
newest eligible Alerts. This is useful immediately after the first deployment. It is an explicit
operator mutation and may deliberately backfill Alerts from before `X_SOCIAL_START_AT`; normal
operation relies on the one-per-day scheduler and continues to enforce that cutover:

```bash
pnpm social:x -- seed-drafts
```

For an exceptional bounded target, pass `--count 1..14`. The endpoint first cancels active drafts
that no longer pass runtime eligibility, then the D1 insert atomically checks the eligible
`draft_count < target`. A final eligible-buffer read makes retry and concurrent responses accurate;
neither can append another full batch beyond the target.

Approve exactly the draft intended for a future slot:

```bash
pnpm social:x -- approve '<social post id>'
```

Optional manual priority override:

```bash
pnpm social:x -- approve '<social post id>' --priority urgent
```

Cancel a bad/stale draft with an auditable reason:

```bash
pnpm social:x -- cancel '<social post id>' --reason 'Pulse was superseded'
```

## Future queue preview

Preview the next 14 ET calendar days of approved Posts:

```bash
pnpm social:x -- queue
```

The command calls the token-protected, read-only `GET /api/ops/social/queue` endpoint. It shows each
currently `ready` Post's frozen text and estimated `America/New_York` publication date in the same
newest-Pulse-first order used by the daily claimant. The CLI horizon is fixed at 14 ET calendar
days. When eligible candidates are available after daily replenishment, the same response directly
lists them under `drafts` with
`reason: approval_required`; no preceding `candidates --pulse` command is required. Only `ready`
Posts receive an estimated date. Use `candidates --status draft` only when you want the focused
approval view. A draft has no place or date in the publishing sequence until it is approved. A
newer Alert approved later can move ahead of older ready Posts; cancellation, `publish-now`, and
failed/unknown attempts can also change a date.

For unusually large backlogs, `readyBacklogTruncated` or `draftBacklogTruncated` indicates that the
JSON omits additional rows outside the fixed horizon/view cap. Both visible sequences are ordered
from newest to oldest by their source Pulse, rather than by draft creation or approval time.

The displayed dates are a projection, not reserved appointments. A newly approved, newer Alert,
cancellation or loss of Pulse eligibility, `publish-now`, or a failed or unknown daily attempt can
change later positions and dates. Run the command again for the current view. The preview performs
no write, does not consume the daily unique slot, and does not enqueue X work ahead of time. The
Worker still claims at most one item at 09:00 ET each calendar day; weekends are included.

## Public GitHub draft mirror

After the Worker daily slot, the `X Draft Review Issue` workflow probes the queue at 09:17 and 09:47
`America/New_York`. The second probe covers a delayed Worker or Actions run; both probes are
serialized and revision-idempotent. GitHub schedule delivery is best effort, so these times are a
review-notification window rather than a publishing SLA. `workflow_dispatch` is the manual fallback.

The workflow creates one stable issue on its first successful run, reopens that issue if it was
closed, and adds one comment for every unseen draft revision in the visible queue response. The
comment contains a strict allowlist:

- the exact deterministic X copy in a Markdown code block;
- the earliest queue horizon and the fact that no publication date is reserved;
- the exact `pnpm social:x -- approve '<post id>'` command;
- an opaque hidden marker derived from Post ID plus `updatedAt`.

The repository and issue are public. The tracked `/alerts?ref=...` URL is therefore disclosed before
X publication, but it remains a non-authorizing locator into the protected registration/login
flow. Rendering the copy as code prevents casual clicks and `@mention` notifications; manually
copying that URL can still contaminate `utm_source=x` attribution. The mirror never includes the
raw queue row, Pulse ID, reviewer, OAuth/Social Ops credentials, tenant fields, source detail,
client data, or email addresses. Cancelling a draft does not erase its already-public issue history.

The issue is a snapshot, not the source of truth. Approval rebuilds the deterministic copy from the
current Pulse, so rerun `pnpm social:x -- queue` or the focused candidate view before approving if
the GitHub comment is no longer fresh. If `draftBacklogTruncated=true`, the workflow reports the
truncation in its run result; the newest daily draft remains in the visible newest-first slice, but
the Issue is not a complete historical backlog.

## Immediate live publish

`publish-now` is an operator override for the normal 09:00 ET claim time, not an override for the
daily cap or editorial approval. It is available only when the deployed Worker has
`X_POSTING_MODE=live` and all four OAuth 1.0a user credentials. To publish one exact ready Post:

```bash
pnpm social:x -- candidates --status ready --limit 50
pnpm social:x -- verify-account
pnpm social:x -- publish-now '<social post id>'
```

The endpoint revalidates that exact Post and its Pulse, verifies the authenticated X account with a
read-only request, atomically reserves the current ET date, and enqueues `social.x.publish`. HTTP 202
means queued; the serialized Queue consumer performs the remote create and records `published`,
`failed`, or `unknown`.

If today's shadow run already used this same Post, first approve the returned draft again. The exact
same `draft_only` ledger row is then promoted to `queued`; no second daily row is created. A shadow or
live slot belonging to another Post returns 409 and must not be bypassed. If enqueue recovery returns
HTTP 500, preserve the reported `runId`, stop, and inspect D1/Queue state before issuing any further
command.

## Seven-day shadow gate

For seven consecutive ET publishing days:

1. Leave `X_POSTING_MODE=draft`.
2. Inspect candidate facts, deterministic copy, weighted length, CTA, ref token URL, and priority.
3. Confirm the daily branch exposes its review candidate through `queue`, approve
   it, then rerun the queue preview to review its tentative ET publication date.
4. Confirm exactly one `draft_only` run for the local date and no X post.
5. Exercise the link through logged-out login, Email OTP and OAuth, new-firm onboarding, and an
   existing firm. Confirm the final URL is that firm's `/alerts?alert=<id>`.
6. Confirm a same-day batch remains in the backlog and advances one item per later day.

A shadowed draft returns to `draft`; shadow approval never silently carries into live. After day 7,
review and approve the intended live backlog again, configure all credentials, then change
`X_POSTING_MODE=live` and deploy.

## Failure and unknown handling

- `published`: verify `x_post_id` and the expected public Post.
- `failed`: authentication, validation, 429, another explicit 4xx, or an expired prior-day Queue
  slot. Fix the cause and approve for a future day; do not send a substitute on the failed date.
- `unknown`: timeout, network interruption, X 5xx, or a success response without a Post ID. Search the
  fixed DueDateHQ X account for the exact frozen text before doing anything.

If the Post exists:

```bash
pnpm social:x -- reconcile '<social post id>' --outcome published --x-post-id '<X Post ID>'
```

If it definitely does not exist:

```bash
pnpm social:x -- reconcile '<social post id>' --outcome not_published \
  --reason 'Checked the DueDateHQ X account and found no matching Post'
```

The second outcome returns the item to operator review; it can only use a future ET slot after a new
approval. Never replay a raw `social.x.publish` message.

## Monitoring and verification

Monitor daily publish count, ready backlog length, oldest ready age, and manually review the current
draft age through the queue/D1 checks below, along with
failed/unknown runs, landing visits, completed registrations, and Alert opens. `unknown` and a ready
backlog older than seven days emit ops alerts when `OPS_ALERT_EMAIL` is configured. A replenishment
failure also emits `social.x.draft_replenish_failed` while allowing today's already-claimed live Post
to continue to Queue. A stale draft is still an approval/cancellation decision, but it does not
block the next ET day's newest eligible draft from appearing.

Also monitor the `X Draft Review Issue` workflow for a failed run, no successful run for 24 hours,
or `draftBacklogTruncated=true`. These are review-notification failures, not X publishing failures;
use `pnpm social:x -- queue` as the canonical fallback and do not rerun or bypass the Worker
scheduler to compensate.

Useful D1 checks:

```sql
select local_date, count(*)
from social_publish_run
where status = 'published'
group by local_date
having count(*) > 1;

select status, count(*)
from social_alert_post
group by status;

select id, pulse_id, created_at
from social_alert_post
where channel = 'x' and status = 'draft'
order by created_at desc;
```

The first query must always return zero rows.
