# Cold-outreach kit + day-1 launch — 2026-07-02

`outreach-kit/` graduates from throwaway to tracked: the campaign is live, and
`.outreach-state.json` (who got touch 1, when) is what makes touch 2/3 dedupe
possible over the next 10 days. Losing it would break the follow-up sequence.

## What's in the kit
- `duedatehq-MASTER-verified.csv` — 283 verified CPA/firm targets (7 states,
  every firm's site visited, decision-makers named, emails only if published
  on the firm's own site — never guessed).
- `duedatehq-OUTREACH-sequence.csv` — 3-touch sequence per target.
- `ALL-track{A,B,C}*.csv` — send waves (A = GA disaster 2, B = multi-state 63,
  C = entity book 140, split C1/C2).
- `send-outreach.mjs` — zero-dep Resend sender. Touch-1 renders the locked v11
  template: serif hero question, product-faithful GA alert card (IRS/GEORGIA
  comparison table, counties, whole card links to app ?lng=en), cid-embedded
  wordmark signature, CAN-SPAM footer (address via env, reply-"no thanks"
  opt-out + List-Unsubscribe header). Throttles, dedupes via state file,
  honors `outreach-suppress.txt`, dry-runs by default.
- `send-log-day1.txt` / `.outreach-state.json` — live launch record.

## Channel
Resend from `gigi@duedatehq.com` (domain already verified in the product's
Resend account — SPF/DKIM aligned; mail-tester confirmed inbox placement).
Replies route to the sender's inbox via Cloudflare Email Routing.

## Day-1 plan
Wave 1 (A+B, 65) fired 2026-07-02; C1/C2 (70+70) follow at ~4h intervals.
Touch 2 ≈ +4d, touch 3 ≈ +10d via the same script (`--touch 2|3`).

No secrets in the tree: the API key and footer address are env-only.
