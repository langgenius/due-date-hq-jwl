---
title: '2026-05-23 · Rule review audit metadata'
date: 2026-05-23
author: 'Codex'
---

# Rule review audit metadata

## Change

- Rule detail no longer renders seed placeholders like
  `practice.owner_or_manager_required` as practice review metadata.
- Reviewed rules now expose display-only `reviewedByName` and ISO `reviewedAt` fields through the
  rules contract, while keeping database `reviewedBy` values as user ids for FK/audit purposes.
- Rule detail displays the reviewer name and firm-timezone timestamp only when those audited
  practice review fields exist.
- Rule detail no longer displays rule-level `nextReviewOn`; future source changes are surfaced
  through Pulse/source review instead of a static rule maintenance date.
- Rule detail now uses practice-facing copy for pending rules: review is required before the rule
  can create client deadlines, instead of exposing reminder-generation internals.
- Added a focused server test covering rule accept review audit behavior: `rules.accepted` keeps
  `actorId` as the user id and stores the display reviewer metadata on the accepted rule payload.

## Product boundary

Template seed metadata remains catalog provenance, not practice review history. If a pending rule
or default-active Federal template has not been reviewed by a practice owner/manager, the Practice
review footer is hidden instead of showing seed dates or internal identifiers. Source maintenance
timing is handled by source monitoring and Pulse review, not by showing static rule review dates in
the rule detail.

## Validation

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check`
- `pnpm --filter @duedatehq/contracts test -- contracts.test.ts`
- `pnpm --filter @duedatehq/server test -- src/procedures/rules/review-audit.test.ts src/procedures/rules/onboarding-activation.test.ts src/procedures/rules/_obligation-generation.test.ts`
- `pnpm --filter @duedatehq/app test -- --run src/routes/rules.library.test.tsx`
