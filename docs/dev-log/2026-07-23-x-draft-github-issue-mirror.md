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
- Revision markers use `postId + updatedAt`: duplicate probes do not repeat a comment, while a
  definite publish failure that returns the same Post to draft produces a new review notification.
- The public comment allowlist contains the exact deterministic copy in a Markdown code block, a
  non-reserved earliest queue horizon, and the operator approval command. It does not dump queue
  rows or expose Pulse, source, reviewer, tenant, client, email, or credential data.
- The Social bearer is sent only to `https://app.duedatehq.com` with redirects disabled and a
  timeout. The short-lived GitHub token is scoped to the current repository with
  `contents: read` / `issues: write`.
- Added the Node automation suite to the root CI contract so helper behavior is checked by
  `pnpm run ci` and pre-push.

## Public-boundary decision

This repository's Issue is public. The exact tracked ref URL is therefore visible before X
approval, although it remains only a locator into the protected auth/tenant flow. The code block
prevents an accidental clickable link and `@mention`, but a manually copied link can create a small
amount of X-attributed traffic from GitHub. ADR 0021 records this intentional tradeoff.

## Validation

- Helper coverage verifies Issue creation, closed-Issue reopen, revision idempotency, strict queue
  validation, credential-origin isolation, and secret-redacted failures.
- The workflow reports queue truncation instead of claiming a complete historical mirror.
- GitHub Issue interaction remains presentation-only; token-gated Social Ops approval is unchanged.
