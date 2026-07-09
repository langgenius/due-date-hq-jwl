# 2026-07-09 · FL TIP Constant Contact envelope parser

## What happened

`fl.tips` inbound email still rejected a legitimate Florida DOR Tax Information Publications
message as `sender_domain_mismatch` even after `in.constantcontact.com` was added to the source
sender allowlist.

The actual failure was address parsing: Constant Contact uses VERP-style envelope senders such as
`AhNj/OJ...==_...@in.constantcontact.com`. The Pulse email ingest regex only accepted a narrow
local-part character set, so it failed to extract the address and never compared the allowed
`in.constantcontact.com` domain.

## Change

- Expanded the inbound email regex to accept the common RFC 5322 local-part punctuation used by
  ESP bounce/envelope senders.
- Added a regression case using the observed Constant Contact sender shape for `fl.tips`.

The attribution gate is unchanged: `fl.tips` still requires a matched subscription address plus the
configured sender domain and passing Cloudflare DKIM/SPF verdicts when `PULSE_EMAIL_REQUIRE_AUTH` is
enabled.
