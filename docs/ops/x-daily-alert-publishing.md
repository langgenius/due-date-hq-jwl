# X Daily Alert Publishing Runbook

## Scope and invariants

The SaaS Worker is the only scheduling authority. Its existing 30-minute Cron creates deterministic
drafts and, at 09:00 America/New_York, reserves at most one D1 publishing slot. A separate serialized
`SOCIAL_QUEUE` performs the remote X create. The `pnpm social:x` script is an operator control plane;
do not schedule that script with Codex, launchd, GitHub Actions, or another cron.

Hard invariants:

- `UNIQUE(social_alert_post.channel, pulse_id)` prevents the same Alert entering the outbox twice.
- `UNIQUE(social_publish_run.channel, local_date)` caps every ET calendar day at one attempt.
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

## Daily review commands

List drafts and the frozen copy/URL:

```bash
pnpm social:x -- candidates --status draft --limit 50
```

Create a one-off draft for a specific eligible historical Pulse (the automatic cutover is bypassed,
but all approval, source, PII, sample, scope, and date gates still apply):

```bash
pnpm social:x -- candidates --pulse '<pulse id>'
```

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

## Seven-day shadow gate

For seven consecutive ET publishing days:

1. Leave `X_POSTING_MODE=draft`.
2. Inspect candidate facts, deterministic copy, weighted length, CTA, ref token URL, and priority.
3. Mark the chosen draft ready before the next 09:00 ET slot.
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

Monitor daily publish count, ready backlog length, oldest ready age, failed/unknown runs, landing
visits, completed registrations, and Alert opens. `unknown` and a ready backlog older than seven days
emit ops alerts when `OPS_ALERT_EMAIL` is configured.

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
```

The first query must always return zero rows.
