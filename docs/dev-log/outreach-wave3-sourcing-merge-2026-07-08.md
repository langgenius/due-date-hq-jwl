# Outreach wave-3 — deep sourcing + merge into send list (2026-07-08)

## What
Sourced **1,001 verified, emailable, ICP-qualified US CPA contacts** across 35 states and merged them into
the cold-outreach master roster + send sequence. (1,003 qualified − 2 removed by MX pre-check, see below.)

- `outreach-kit/duedatehq-MASTER-verified.csv`: 649 → **1,650** rows
- `outreach-kit/duedatehq-OUTREACH-sequence.csv`: 649 → **1,650** rows (16-col, rendered)

## How (sourcing)
"Crank it" depth pass — 48 subagents in rate-safe batches of ~7:
- **4 fresh disaster states**: MT, NV, UT, ID.
- **31 already-covered states deepened** into secondary/tertiary cities at ~40-firm depth
  (the 12 wave-3 tornado states + 19 prior states).
- **Email-recovery pass** over 194 form-only firms → 53 real emails recovered (all literally published).

Hard rules enforced: no guessed emails (pattern-only/AI-summary hits rejected), no fabricated Fit/Notes,
programmatic dedupe vs the 688-email base (0 dup emails in final file).

## Target-user (ICP) fit gate
Every row gated to DueDateHQ's ICP: a US CPA / CPA-solo **tax-compliance** practice carrying a recurring
filing-deadline calendar. **1,003 qualified; 3 held for review** (`wave3-review-fit.csv`) — a wealth-management
hybrid, an IRS-resolution solo, and one firm not accepting new clients. First gate pass over-flagged 98 legit
CPA firms for lacking a literal "tax" token in terse Notes; corrected to gate only on positive disqualifier
signals (wealth/mill/not-accepting), not absence-of-signal.

## How (merge/render)
- Templates lifted byte-exact from existing sequence rows (2 variants): **track C** (Fit contains
  business/entity → "S-corps and partnerships" subject/body, 802 rows) vs **track B** ("your clients", 201).
  Touch-2/3 copy identical across tracks. `buildTouch1()` still regenerates the touch-1 GA card at send time.
- Channel = Email for all 1,003. First-name greeting extracted from Decision-maker (589 named; 414 "Hi there,"
  of which 378 are blank-DM firm inboxes and 36 are multi-partner names → `wave3-sequence-greeting-review.csv`).
- Validated: master/sequence = 1,652 each, all 16-col, **0 duplicate emails**, header intact, base byte-identical
  to origin/main. Send-script dry-run touch-1: `failed=0`.

## New files
`duedatehq-MASTER-verified-wave3.csv` (1,003), `wave3-review-fit.csv` (3), `wave3-form-and-manual.csv` (265),
`wave3-sequence-greeting-review.csv` (36), `wave3-sourcing-notes.md`.

## Deliverability / reputation guard
- **MX pre-check on all 969 recipient domains** (dig, Google-DNS re-verify): 967 have valid mail servers;
  2 domains were genuinely dead (no MX + no A) → their recipients removed before commit:
  `trish@legriscpa.com`, `david@ondrovichcpa.com`. (4 others flagged initially were transient DNS timeouts.)
- Risk mix of the 1,001: 553 personal mailboxes (lowest risk), 448 role inboxes (info@/office@), 33
  free-provider, 52 recovered. Recommend a **warm-up ramp** (personal mailboxes first, ~40–60/day, 8s apart),
  not a single 1,000-send blast from a domain that's only sent ~500 — and pause if bounces exceed ~3%.

## ⚠️ Before sending
- **Use the canonical `.outreach-state.json` (origin/main: t1=500, t2=198).** This worktree's copy is stale
  (t1=205) — sending against it would re-send touch-1 to ~295 already-contacted originals. The state file was
  NOT modified or committed here.
- Re-check the live **suppress list** before any send.
- Nothing was sent. The 1,003 are net-new, so they gate as fresh touch-1s.
