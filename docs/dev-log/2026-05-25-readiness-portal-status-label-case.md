# 2026-05-25 · Readiness portal status label case

## Summary

Capitalized the selected readiness status labels in the client-facing portal.

## Changes

- The `/readiness/:token` status select now displays `Ready`, `Not yet`, and `Need help` in the
  trigger instead of raw enum values like `ready`.
- Submission payloads still use the existing enum values, so server behavior is unchanged.

## Validation

- `pnpm exec vp check apps/app/src/routes/readiness.tsx docs/dev-log/2026-05-25-readiness-portal-status-label-case.md`
- `pnpm --filter @duedatehq/app exec tsc --noEmit`
- Browser smoke confirmed the visible selected status is `Ready`.
