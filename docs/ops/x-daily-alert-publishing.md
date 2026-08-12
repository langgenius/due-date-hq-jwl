# X Alert Publishing Runbook

## Scope and invariants

The SaaS Worker is the only scheduling authority. Its publishing/replenishment branch runs only in
the 09:00 America/New_York window; the separate social watchdog still runs on every 30-minute Cron
tick. If either of the preceding two ET calendar days has an occupied publish run, the automatic
claim pauses for the day. Every daily 09:00 pass still removes ineligible drafts and atomically fills
the valid review buffer to three from the newest not-yet-outboxed Alerts. On an eligible run day,
the same fill happens after today's claim and before a live Queue enqueue; a shadowed Post returned
to draft counts toward the target. A separate serialized `SOCIAL_QUEUE` creates a link-free main
Post, durably checkpoints its X ID, and then creates the tracked DueDateHQ URL as the first reply.
The `pnpm social:x` script is an operator control plane; do not schedule that script with Codex,
launchd, GitHub Actions, or another cron.
`.github/workflows/x-draft-review.yml` is the narrow exception for visibility only: it reads the
existing queue projection and the bounded published projection after the 09:00 slot, then mirrors
their lifecycle into one GitHub issue. It never runs the operator CLI, mutates D1, reserves a date,
approves a Post, or enqueues X work. Actions delay or failure therefore does not affect the Worker
publishing path.

Hard invariants:

- `UNIQUE(social_alert_post.channel, pulse_id)` prevents the same Alert entering the outbox twice.
- `UNIQUE(social_publish_run.channel, local_date)` caps every ET calendar day at one attempt.
- An occupied publish run blocks automatic claim on each of the following two ET calendar days.
  Automatic Posts therefore have two empty calendar days between them; pause days still replenish
  review drafts.
- An explicitly re-approved Post may promote its own same-day `draft_only` shadow row to `queued`;
  that row cannot be reused for a different Post, channel, or ET date.
- A failed or unknown attempt consumes that day; no replacement is sent.
- A queued message without a main `xPostId` is sent only while its reserved ET `local_date` is still
  current. A delayed prior-day delivery becomes `failed` and returns to review. Once the main ID is
  checkpointed, a redelivery may finish only the missing reply even after that date; it cannot
  create another main Post.
- `unknown` never retries automatically. Check the DueDateHQ X account, then reconcile.
- Main X Posts contain no URL. Their first reply contains the tracked protected
  `/alerts?ref=...` URL; there is no public Alert detail page.
- Approved, non-sample, source-backed Pulses are eligible unless their source is explicitly marked
  as signal-only. FEMA declarations and generic GovDelivery inbound Alerts provide early signals
  that have not yet been attributed to a tax filing or deadline change, so they never enter the
  social outbox. `action_mode='review_only'` alone does not disqualify an otherwise useful source
  change.
- Public header copy expands two-letter state codes to full state names. Official form identifiers
  and `utm_content` keep their stable state codes.
- Normal live operation uses an eligible 09:00 ET slot every three days and publishes at most one
  previously approved `ready` Post. `publish-now` is reserved for an explicit operator exception.
- Draft generation, ready projection, and the normal automatic claim order by the source Pulse's
  `created_at DESC, id DESC`. A newer Alert therefore enters review and publishes before an older
  Alert once both are approved. The stored `urgent` label does not overtake a newer Alert;
  `publish-now` is the explicit operator override.
- The automatic branch targets three valid review drafts on every daily pass, including cadence
  pauses. The shared D1 conditional insert checks `draft_count < 3` for each candidate, so duplicate
  Cron deliveries and concurrent fills cannot exceed the target. This buffer has no reserved dates
  and never bypasses approval.
- Full runtime/PII validation runs before a candidate is drafted. If an entire 100-row newest-first
  page is rejected, the scheduler continues with a `(Pulse.createdAt, Pulse.id)` keyset cursor so
  older valid Alerts are not permanently starved.
  Draft creation never bypasses the explicit `draft -> ready` approval gate.
- If enqueue or the main-Post create definitely fails before a main ID exists, the attempted Post
  returns to `draft`. Once a main ID exists, no failure path may return it to draft: a rejected or
  ambiguous first reply becomes `unknown` and emits an ops alert so reconciliation cannot duplicate
  the public main Post.
- The future queue is a read-only projection of the current `ready` backlog. Viewing it never
  creates a draft, reserves a future `social_publish_run`, or sends a future `SOCIAL_QUEUE` message.
- A GitHub issue snapshot is public visibility, not editorial approval. A comment, reaction, label,
  or issue state change never moves a Post from `draft` to `ready`; only the token-gated Social Ops
  approve endpoint with a real Better Auth reviewer can do that.
- After a successful production CLI approval, the CLI best-effort dispatches the same default-branch
  review workflow with only `postId + draftUpdatedAt`. The workflow re-reads the exact Post through a
  token-gated, public-field allowlist and updates the bot-owned draft comment. GitHub failure never
  rolls back or reclassifies an already-committed D1 approval.
- A Post is shown as published in the Issue only after Social Ops returns the authoritative D1
  `published` state after both main and first reply succeed, with `xPostId` and `publishedAt`. An HTTP 202 enqueue response is still
  `queued`; it never makes the Issue claim that the Post is live.
- X API success handling, operator reconciliation, and the repository terminal write all require
  `xPostId` to contain 1–30 decimal digits. An invalid ID cannot enter the published projection and
  block unrelated Issue updates.

Cadence example: Monday automatic Post -> Tuesday pause -> Wednesday pause -> Thursday next
eligible automatic Post. The Tuesday and Wednesday passes still refill the review buffer to three.

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
this trust boundary. The Worker has no GitHub PAT or GitHub write credential; Issue mutations run
only inside this GitHub Action.

Immediate post-approval status refresh also requires an authenticated GitHub CLI on the operator
machine:

```bash
gh auth status
```

The CLI invokes only the fixed `x-draft-review.yml` workflow in
`langgenius/due-date-hq-jwl@main`. It removes `SOCIAL_OPS_TOKEN` and `SOCIAL_OPS_REVIEWER` from the
child process environment and never passes either value as a workflow input.

Verify the fixed account with a signed, read-only OAuth 1.0a request. The command returns only the X
user ID and username; it never prints credentials:

```bash
pnpm social:x -- verify-account
```

## Review commands

List drafts and their current preview main/reply copy. Approval rebuilds the deterministic main
copy and tracked first reply from the current Pulse and freezes the resulting `ready` Post:

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
operation relies on the three-day scheduler and continues to enforce that cutover:

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

On a successful production approval, this command prints the authoritative Social Ops response and
then queues a targeted GitHub workflow dispatch. “Issue status sync queued” means GitHub accepted
the workflow event, not that the Issue PATCH has already completed. The workflow uses the approval
response's original draft revision to update the exact bot comment to `approved · ready`, replaces
the draft snapshot with the final copy rebuilt and frozen at approval, and shows the current
tentative slot when it remains in the 14-day projection. The `post_id` and `draft_updated_at`
dispatch inputs are accepted only as a pair. The workflow never publishes to X.

If `gh` is missing, unauthenticated, times out, or GitHub rejects the dispatch, the approval remains
successful and the CLI emits a separate Issue-sync warning; do not retry the approval. Fix GitHub
CLI access and manually dispatch `x-draft-review.yml` with the reported Post/revision if needed.
The scheduled mirror also reconciles approved Posts that remain in its visible queue slice.

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
newest-Pulse-first order used by the automatic claimant. The CLI horizon is fixed at 14 ET calendar
days. When eligible candidates are available after daily replenishment, the same response directly
lists them under `drafts` with
`reason: approval_required`; no preceding `candidates --pulse` command is required. Only `ready`
Posts receive an estimated date. Use `candidates --status draft` only when you want the focused
approval view. A draft has no place or date in the publishing sequence until it is approved. A
newer Alert approved later can move ahead of older ready Posts; cancellation, `publish-now`, and
failed/unknown attempts can also change a date. The response includes `cadenceDays: 3` and
`nextAutomaticLocalDate`; if today already has a publish run, that next automatic date is three
days later.

For unusually large backlogs, `readyBacklogTruncated` or `draftBacklogTruncated` indicates that the
JSON omits additional rows outside the fixed horizon/view cap. Both visible sequences are ordered
from newest to oldest by their source Pulse, rather than by draft creation or approval time.

The displayed dates are a projection, not reserved appointments. A newly approved, newer Alert,
cancellation or loss of Pulse eligibility, `publish-now`, or a failed or unknown attempt can
change later positions and dates. Run the command again for the current view. The preview performs
no write, does not consume the per-date unique slot, and does not enqueue X work ahead of time. The
Worker claims at most one item at 09:00 ET every three calendar days; weekends are included.

## Public GitHub lifecycle mirror

After the Worker 09:00 slot window, the `X Draft Review Issue` workflow probes the queue at 09:17 and 09:47
`America/New_York`. The second probe covers delayed Worker, Queue, or Actions work; both probes are
serialized and state-idempotent. GitHub schedule delivery is best effort, so these times are a
review/status-notification window rather than a publishing SLA. A scoped default-branch push and
`workflow_dispatch` are the other supported triggers.

The workflow creates one stable issue on its first successful run, reopens that issue if it was
closed, and adds one comment for every unseen draft revision in the visible queue response. The
comment contains a strict allowlist:

- the exact deterministic link-free X main copy and tracked first-reply copy in separate Markdown
  code blocks;
- the earliest automatic slot and the fact that no publication date is reserved;
- the exact `pnpm social:x -- approve '<post id>'` command;
- an opaque hidden marker derived from Post ID plus `updatedAt`.

After approval, the targeted workflow queries
`GET /api/ops/social/:postId/review-status`, whose response is restricted to Post ID, status,
frozen public main copy, deterministic `replyText`, `approvedAt`, `xPostId`, `publishedAt`, and
`updatedAt`. It updates the exact
bot-owned draft comment in place with:

- `approved` plus the current non-published lifecycle state;
- the final frozen X main and first-reply copy rebuilt at the approval boundary;
- `approvedAt`, and a tentative slot/position only when visible in the queue projection;
- an idempotency marker derived from `postId + approvedAt`.

If the original comment is absent, the workflow creates an approved-state comment rather than
editing an unrelated revision. Only issues and comments authored by `github-actions[bot]` are
trusted for hidden-marker matching, so a public user cannot suppress or redirect synchronization
by copying a marker. Later probes use the same approved marker to refresh a changed tentative slot
or queue position; an identical rendered body remains a no-op.

Each normal probe requests
`GET /api/ops/social/queue?includePublished=true`. The opt-in `published` field is a bounded,
newest-first allowlist of up to 100 D1-confirmed published Posts; the ordinary operator queue
preview does not include this history. If a published row matches an existing bot-owned draft or
approved comment, the workflow PATCHes that same comment with:

- `published` as the X lifecycle status;
- the exact frozen main and first-reply copy, without a tentative slot or queue position;
- `approvedAt` and `publishedAt`;
- a numeric-ID-validated `https://x.com/i/web/status/<xPostId>` link;
- an idempotency marker derived from `postId + publishedAt`.

The scheduled projection never creates a new comment solely because an older Post appears in the
published window, which prevents rollout from backfilling historical posts into the Issue. A
published marker copied by a public user is ignored because marker matching still trusts only bot
comments.

The repository and issue are public. The tracked `/alerts?ref=...` URL is therefore disclosed before
X publication, but it remains a non-authorizing locator into the protected registration/login
flow. Rendering the copy as code prevents casual clicks and `@mention` notifications; manually
copying that URL can still contaminate `utm_source=x` attribution. The mirror never includes the
raw queue row, Pulse ID, reviewer, OAuth/Social Ops credentials, tenant fields, source detail,
client data, or email addresses. Cancelling a draft does not erase its already-public issue history.

The issue is a snapshot, not the source of truth. Approval rebuilds the deterministic copy from the
current Pulse; the targeted approval refresh replaces the comment with that final frozen copy.
Publication appears only after the Queue consumer has persisted the successful two-Post thread, or
an operator has manually completed the first reply and reconciled the main ID, as
`status=published`, `xPostId`, and `publishedAt` in D1. In particular, the HTTP 202 returned by
`publish-now` means only that the message was queued; the next probe continues to show the
approved/non-published state until D1 confirms publication. If `draftBacklogTruncated=true`, the
workflow reports the truncation in its run result; the newest buffer drafts remain in the visible
newest-first slice, but the Issue is not a complete historical backlog.

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
`failed`, or `unknown`. The GitHub Issue remains at its approved/non-published status after that
HTTP 202. A later scheduled, scoped-push, or manual mirror run updates the same comment only after
the D1 row is `published` with its X Post ID and publication time.

If today's shadow run already used this same Post, first approve the returned draft again. The exact
same `draft_only` ledger row is then promoted to `queued`; no second daily row is created. A shadow or
live slot belonging to another Post returns 409 and must not be bypassed. If enqueue recovery returns
HTTP 500, preserve the reported `runId`, stop, and inspect D1/Queue state before issuing any further
command.

## Seven-day shadow gate

For seven consecutive ET publishing days:

1. Leave `X_POSTING_MODE=draft`.
2. Inspect candidate facts, deterministic copy, weighted length, CTA, ref token URL, and priority.
3. Confirm the daily branch exposes up to three review candidates through `queue`, approve the
   intended Post, then rerun the queue preview to review its tentative ET publication date.
4. Confirm exactly one `draft_only` run for the local date and no X post.
5. Exercise the first-reply link through logged-out login, Email OTP and OAuth, new-firm onboarding, and an
   existing firm. Confirm the final URL is that firm's `/alerts?alert=<id>`.
6. Confirm the approved backlog advances at most one item per eligible three-day cadence slot.

A shadowed draft returns to `draft`; shadow approval never silently carries into live. After day 7,
review and approve the intended live backlog again, configure all credentials, then change
`X_POSTING_MODE=live` and deploy.

## Failure and unknown handling

- `published`: verify `x_post_id`, `x_reply_post_id`, the link-free main Post, and its tracked first
  reply.
- `failed`: authentication, validation, 429, another explicit 4xx, or an expired prior-day Queue
  slot before the main Post is created. Fix the cause and approve for a future day; do not send a
  substitute on the failed date.
- `unknown`: timeout, network interruption, X 5xx, a success response without a Post ID, or any
  failure after the main Post ID was checkpointed. Search the fixed DueDateHQ X account for both the
  exact frozen main text and its reply before doing anything.

If the main Post exists, ensure the tracked URL is present as its first reply (add it manually if
needed), then reconcile with the main Post ID:

```bash
pnpm social:x -- reconcile '<social post id>' --outcome published --x-post-id '<X Post ID>'
```

Use `not_published` only if D1 has no checkpointed main `x_post_id` and the main Post definitely does
not exist:

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
to continue to Queue. Fewer than three valid drafts is healthy only when the eligible candidate pool
is exhausted; otherwise look for that replenishment alert. A stale draft is still an
approval/cancellation decision, but it does not block the next daily pass from adding a newer
eligible draft.

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
