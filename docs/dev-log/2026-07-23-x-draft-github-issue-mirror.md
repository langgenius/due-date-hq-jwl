---
title: 'X draft GitHub Issue review mirror'
date: 2026-07-23
area: alerts
status: implemented
---

# X draft GitHub Issue review mirror

## Outcome

The daily X review draft is now mirrored into one stable public GitHub Issue after the Worker
09:00 `America/New_York` slot. Operators can see the proposed copy and exact approval command
without configuring and running the Social queue CLI. The Worker and D1 outbox remain the only
publishing authority.

## Implementation

- Added `.github/workflows/x-draft-review.yml` with serialized 09:17 and 09:47 ET probes, manual
  dispatch, and a scoped main-push bootstrap.
- Added `scripts/social-x-github-review.mjs`, which reads the token-protected queue, creates or
  reopens the stable Issue, paginates existing comments, and writes only unseen draft revisions.
- Extended successful production approvals with a best-effort, exact
  `workflow_dispatch(post_id, draft_updated_at)`. The Worker returns non-secret transition metadata
  and exposes a token-gated single-Post review-status allowlist, so Actions re-reads the final
  approval-boundary copy rather than trusting CLI input.
- The workflow now updates the exact bot-owned draft comment to
  `approved · ready` using a stable `postId + approvedAt` marker. A missing original comment creates
  an approved snapshot; a forged public marker is ignored.
- Follow-up on 2026-07-24 extended the same presentation path through publication: normal probes
  read a bounded D1-backed published allowlist and PATCH an existing bot comment with
  `postId + publishedAt`, the public X link, and publication time. The Worker still has no GitHub
  credential, and an HTTP 202 enqueue response is not treated as published.
- Revision markers use `postId + updatedAt`: duplicate probes do not repeat a comment, while a
  definite publish failure that returns the same Post to draft produces a new review notification.
- The public comment allowlist contains the exact deterministic copy in a Markdown code block, a
  non-reserved earliest queue horizon, and the operator approval command. It does not dump queue
  rows or expose Pulse, source, reviewer, tenant, client, email, or credential data.
- The Social bearer is sent only to `https://app.duedatehq.com` with redirects disabled and a
  timeout. The short-lived GitHub token is scoped to the current repository with
  `contents: read` / `issues: write`.
- The CLI invokes `gh` with an argument array against the fixed canonical repo/main and removes
  `SOCIAL_OPS_TOKEN` / `SOCIAL_OPS_REVIEWER` from the child environment. Dispatch failure is
  reported as a presentation-only partial failure with an exact retry command; the completed D1
  approval is not rolled back or mislabeled as failed.
- Added the Node automation suite to the root CI contract so helper behavior is checked by
  `pnpm run ci` and pre-push.

## Public-boundary decision

This repository's Issue is public. The exact tracked ref URL is therefore visible before X
approval, although it remains only a locator into the protected auth/tenant flow. The code block
prevents an accidental clickable link and `@mention`, but a manually copied link can create a small
amount of X-attributed traffic from GitHub. ADR 0021 records this intentional tradeoff.

## Validation

- Helper coverage verifies Issue creation, closed-Issue reopen, revision idempotency, strict queue
  validation, targeted approval status PATCH, final frozen copy, bot-author marker isolation,
  credential-origin isolation, and secret-redacted failures.
- The workflow reports queue truncation instead of claiming a complete historical mirror.
- GitHub Issue interaction remains presentation-only; token-gated Social Ops approval is unchanged.
