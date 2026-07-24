---
title: 'X published status in GitHub Issue mirror'
date: 2026-07-24
area: alerts
status: implemented
---

# X published status in GitHub Issue mirror

## Outcome

The public X review Issue now follows a mirrored Alert through successful publication. After the
Social Queue consumer records the authoritative `published` state in D1, a later scheduled,
scoped-push, or manual mirror run updates the same bot-owned comment with the X Post link and
publication timestamp. GitHub remains a presentation surface; D1 remains the lifecycle authority.

## Implementation

- Added an opt-in `includePublished=true` queue projection for the review workflow. It returns only
  the 100 most recent published Post records and only the narrow public lifecycle allowlist:
  `id`, `status`, frozen `postText`, `approvedAt`, `xPostId`, `publishedAt`, and `updatedAt`.
- Extended the exact single-Post review-status response with `xPostId` and `publishedAt`, preserving
  the same tenant-, Pulse-, reviewer-, ref-token-, source-, and credential-exclusion boundary.
- Added a `postId + publishedAt` marker. A published row updates the existing trusted draft or
  approved bot comment, retains the frozen copy, removes tentative queue placement, and displays a
  numeric-ID-validated `https://x.com/i/web/status/<xPostId>` link plus timestamps.
- Unified that numeric X Post ID invariant across X success parsing, operator reconciliation, and
  the repository terminal write so one malformed row cannot block the bounded mirror batch.
- Normal probes do not create comments for published Posts that lack an existing mirror comment.
  This prevents the initial rollout's 100-row published window from flooding the Issue with
  historical snapshots.
- Kept all GitHub writes in the existing Action using its short-lived, repository-scoped
  `GITHUB_TOKEN`. The Cloudflare Worker has no GitHub PAT or write credential.

## State boundary

An accepted `publish-now` request returns HTTP 202 after the message is queued. That is not proof of
an X publication, so the Issue remains approved/non-published at that point. The published label,
link, and timestamp appear only after the Queue consumer—or an explicit operator reconciliation—
has persisted `status=published`, `xPostId`, and `publishedAt` in D1.

Queue failure or ambiguous delivery likewise cannot produce a false published label. GitHub
schedule, push, dispatch, or PATCH failures only delay the public mirror and do not change or roll
back the Social outbox state.

## Validation

- Repository tests cover the bounded newest-first published selection and the narrow Social Ops
  response.
- Automation tests cover published rendering, same-comment PATCH, marker idempotency, numeric X
  Post IDs, missing-publication-field fail-closed behavior, and no historical comment creation.
- Existing approval, bot-author trust, secret isolation, redacted-error, and import-safety coverage
  remains in the CI contract.
