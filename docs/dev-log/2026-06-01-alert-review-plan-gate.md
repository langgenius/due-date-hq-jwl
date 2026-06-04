# Alert review plan gate

## Change

- Removed the Pro+ plan gate from alert review-only actions:
  `pulse.markReviewed`, `pulse.reviewDueDateOverlayDetails`, and `pulse.requestReview`.
- Kept owner / partner / manager as the signing roles for actual alert review; preparers can still
  request review but cannot confirm it.
- Left Production Pulse gates in place for apply, apply reviewed set, revert, dismiss, snooze, and
  reactivate flows.

## Verification

- Added focused `pulse` procedure tests for Solo review access and Pro/Team role gating.
- Ran `pnpm --filter @duedatehq/server test -- src/procedures/pulse/index.test.ts`.
- Ran `pnpm --filter @duedatehq/core test -- src/permissions/index.test.ts src/plan-entitlements/index.test.ts`.
- Ran `pnpm check` and `git diff --check`.
- Smoked the local Solo demo Alerts page at `localhost:5173` with Playwright.
