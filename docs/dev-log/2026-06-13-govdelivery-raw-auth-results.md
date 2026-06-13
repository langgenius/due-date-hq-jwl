# GovDelivery Raw Authentication Results

## Context

An Ohio Tax Alert reached staging through Cloudflare Email Routing and matched
`oh.temporary_announcements`, but the transport gate emitted `pulse.email.auth_reject` with
`auth_results_missing`. The stored R2 artifact showed the raw RFC822 email contained
Cloudflare-stamped `Authentication-Results` / `ARC-Authentication-Results` with DKIM, SPF, and DMARC
passing.

## Change

- Updated the GovDelivery inbound auth gate to fall back from Worker `message.headers` to parsed raw
  RFC822 headers when reading Cloudflare `mx.cloudflare.net` authentication verdicts.
- Kept the existing sender-domain gate and DMARC/SPF/DKIM checks unchanged.
- Added a regression test for the real failure mode: runtime headers omit `authentication-results`,
  but raw RFC822 headers contain passing Cloudflare verdicts for an Ohio GovDelivery message.
- Updated the inbound email runbook so future `auth_results_missing` alerts point operators at the
  stored raw RFC822 artifact.

## Validation

- `pnpm --dir apps/server test --run src/jobs/pulse/govdelivery.test.ts`
