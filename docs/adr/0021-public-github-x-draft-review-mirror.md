# ADR 0021 · Public GitHub Issue Mirror for X Draft Review

Date: 2026-07-23

## Context

The Social outbox already creates at most one new deterministic review draft during the daily
09:00 `America/New_York` branch. Operators can inspect it through `pnpm social:x -- queue`, but that
requires production URL and token setup on every machine and makes a routine editorial review
unnecessarily easy to miss.

The repository is public, and GitHub does not provide private issues inside a public repository.
Mirroring a draft here therefore makes its proposed copy and tracked `/alerts?ref=...` URL public
before the operator approves it for X. The ref is an opaque locator into a protected
registration/login flow, not an authorization credential, but the snapshot can be indexed and a
manually copied URL can contaminate `utm_source=x` attribution.

## Decision

Use one stable public GitHub Issue as a best-effort review-notification mirror.

- The Cloudflare Worker, D1 outbox, and `SOCIAL_QUEUE` remain the only scheduling and publishing
  authority. The GitHub workflow reads `GET /api/ops/social/queue?includePublished=true` and never
  calls a Social mutation.
- Run two serialized probes at 09:17 and 09:47 `America/New_York`, plus a manual dispatch fallback.
  GitHub schedule timing is not a publication SLA.
- Create or reopen the Issue by a stable body marker. Add one comment for each unseen
  `postId + updatedAt` revision so duplicate probes are idempotent and a Post returning to draft is
  reviewed again.
- A successful production `pnpm social:x -- approve` best-effort dispatches the same workflow with
  only the exact `postId + draftUpdatedAt`. The workflow re-reads the server's narrow
  `/api/ops/social/:postId/review-status` allowlist, then updates that bot-owned comment with the
  final approval-boundary copy and an idempotent `postId + approvedAt` state marker. A missing
  draft comment produces a new approved-state comment rather than editing another revision.
- A scheduled, scoped-push, or manual probe also reads the server's bounded list of recent
  D1-confirmed `published` Posts. When the corresponding bot comment exists, the workflow updates
  that same comment with `postId + publishedAt`, the publication timestamp, and a validated
  `https://x.com/i/web/status/<xPostId>` link. It does not create comments for older published Posts
  that were never mirrored.
- Allowlist only the exact deterministic X copy, a non-reserved earliest queue horizon, and the
  operator approval command. Never dump the raw queue row or include Pulse/source, reviewer,
  credential, firm, client, or email data.
- Render exact copy in a Markdown code block so its tracked URL is not an accidental GitHub click
  target and its text cannot trigger `@mention` notifications.
- Treat Issue comments, reactions, labels, and state as presentation only. Explicit token-gated
  Social Ops approval with a real Better Auth reviewer remains the only `draft -> ready` transition.
- Trust hidden markers only on Issues/comments authored by `github-actions[bot]`; public users can
  copy a marker, but cannot suppress a notification or redirect a status update.
- Use the protected `due-date-hq-staging` environment for the existing Social bearer, restrict the
  workflow to default-branch schedule/dispatch/scoped push, disable redirects, and grant the
  short-lived `GITHUB_TOKEN` only `contents: read` plus `issues: write`. Do not place a GitHub PAT
  or GitHub write credential in the Worker; all Issue writes remain inside GitHub Actions.

## Consequences

- The operator can review the new daily draft from GitHub without running the queue CLI.
- After a CLI approval, the same comment normally changes to `approved · ready` and shows the
  final frozen copy. GitHub dispatch/PATCH failure is reported separately and never rolls back the
  already-committed D1 approval.
- After the Queue consumer has recorded both `xPostId` and `publishedAt` in D1, a later workflow
  probe normally changes that comment to `published` and links the public X Post. An HTTP 202 from
  `publish-now` means only `queued` and is not sufficient to show a published status.
- Notification failure cannot block or duplicate X publication; the CLI remains the canonical
  fallback.
- Draft copy and its ref URL become intentionally public before X approval and remain in Issue
  history after cancellation. This is a visibility decision, not a relaxation of Alert
  authentication or tenant isolation.
- Copying the tracked URL out of the code block can create X-attributed traffic from GitHub. Funnel
  analysis must account for that small known source of attribution noise.
- `SOCIAL_OPS_TOKEN` is broader than the workflow's read-only behavior. The current trust boundary
  is limited to default-branch code already able to access the same protected environment; any
  future PR/fork execution must first introduce a dedicated read-only credential.
- GitHub schedules may be delayed or disabled after prolonged repository inactivity. Two probes,
  workflow failure monitoring, and manual dispatch reduce but do not eliminate notification gaps.

## Status

accepted
