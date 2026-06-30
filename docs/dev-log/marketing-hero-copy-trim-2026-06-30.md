# Marketing hero — copy trim (fewer words)

**Date:** 2026-06-30.

Tightens the homepage hero sub-paragraph on `main` without touching its structure. The
headline ("Deadline monitoring for **US CPA firms**" + the "IRS · 50 states · DC" coverage
line), `subLead`, and `subEm` are unchanged — only the wordy tail is trimmed. Both locales.

## Changes (`Hero.astro`)

- EN `subRest`: "you see which clients it affects and the official notice behind it —
  federal, state, or a FEMA disaster postponement." → "you see who it hits and the official
  notice behind it — IRS, state, or FEMA." ("who it hits" echoes the `subLead` hook as a
  call-and-answer; the three sources kept, shorter.)
- EN `subStrong`: "Do it yourself: paste your client list and your first sourced deadline
  shows up in about 10 minutes." → "Do it yourself: paste your client list, first sourced
  deadline in ~10 minutes."
- zh `subRest`: 牵动哪些客户…联邦、各州，或 FEMA 灾害延期 → 影响到谁…IRS、各州或 FEMA。

Copy-only; no markup or CSS change.

## Verify

- `pnpm -F @duedatehq/marketing dev` → homepage at 375px: headline unchanged, sub reads
  tighter and wraps cleanly.
