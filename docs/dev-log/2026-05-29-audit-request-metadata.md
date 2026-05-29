# Audit Request Metadata

## Context

The audit detail drawer showed `IP hash` and `User agent hash` as `Not recorded` for most
product mutations, because the audit schema already had those columns but only a few auth/security
paths populated them. The drawer also displayed the raw practice id, which is not useful for CPA
review.

## Changes

- Added request metadata hashing for tenant-scoped RPC audit writes.
- The middleware now derives an IP candidate from `cf-connecting-ip`, then `x-forwarded-for`, then
  `x-real-ip`, hashes it with `AUTH_SECRET`, and does the same for `user-agent`.
- Wrapped `scoped.audit.write` and `writeBatch` so product procedures inherit the metadata without
  touching every audit call site; explicit audit metadata still wins.
- Removed raw Practice ID from the audit detail drawer.

## Validation

- Added focused tests for request metadata hashing and tenant middleware injection.
- Ran targeted server/app tests, i18n extraction/compile, and `pnpm check`.
- Ran a Playwright smoke on `http://localhost:5173`: created an e2e session, changed a deadline
  status to write a fresh audit event, opened the audit detail drawer, confirmed Practice ID is hidden,
  and confirmed IP / User-Agent hashes are recorded.
