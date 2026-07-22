# 2026-07-22 — X OAuth 1.0a immediate publish control

## Context

The daily Alert outbox already supported deterministic review, a 09:00 ET claim, and serialized X
publishing. Operators also needed to send one specifically approved Post immediately without waiting
for the next scheduler tick, while retaining the one-Post-per-ET-day and ambiguous-response rules.

## Changes

- Added `claimExactDailyReadyPost` for one exact eligible `ready` Post. A new claim creates the normal
  `queued` daily run. A same-day `draft_only` run may be promoted only when it belongs to that same
  re-approved Post; a different Post cannot reuse it.
- Added an `EXISTS` run gate to the scheduler claim. The run mutation, Post CAS, and failed-claim
  compensation now execute in one D1 batch, so a losing concurrent claimant cannot strand a
  scheduled Post or queued run.
- Added a signed, read-only OAuth 1.0a account lookup against X `/2/users/me`. Social Ops returns only
  the user ID and username, never credential material.
- Added `GET /api/ops/social/x/account` and
  `POST /api/ops/social/:postId/publish-now`. Immediate publish verifies the exact Post/Pulse first,
  checks the fixed X account before claiming, then sends only a run ID to `SOCIAL_QUEUE`.
- Added `pnpm social:x -- verify-account` and `pnpm social:x -- publish-now <post-id>`.
- Queue enqueue failure transitions the claimed run through the existing definite-failure path. If
  that recovery CAS also fails, the endpoint returns HTTP 500 with the run ID for manual inspection.

## Verification

- Focused Vitest coverage exercises OAuth signing/preflight, exact and shadow-run claims, run gating,
  Queue enqueue recovery, Social Ops authorization, and CLI parsing.
- No Worker deployment, remote D1 write, X create request, or posting-mode change was performed as
  part of this change.
