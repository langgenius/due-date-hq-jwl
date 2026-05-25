# 2026-05-25 · Readiness portal client-safe header

## Summary

Restored the firm name in the public readiness portal header, but made the value client-safe.

## Changes

- The customer-facing `/readiness/:token` header again shows the firm name, followed by the tax form
  and due date under the client name.
- The portal payload now includes `senderName` from the readiness request creator, so clients can see
  which CPA sent the checklist.
- The public readiness API now maps internal demo-plan seed names such as "Team Plan Demo CPA" to
  "Mock Practice CPA" before returning portal data.
- Ordinary real firm names are kept as-is so clients still see who sent the request.

## Validation

- `pnpm exec vp check apps/app/src/routes/readiness.tsx apps/server/src/routes/readiness.ts apps/server/src/routes/readiness.test.ts docs/dev-log/2026-05-25-readiness-portal-client-safe-header.md`
- Browser smoke against the provided portal URL confirmed the header shows `Mock Practice CPA` and no
  longer contains `Team Plan`, with the request sender shown before the tax form.
