# Outreach ops docs — status update (2026-07-22)

Brought the two ops docs in line with today's decisions (they still scheduled
touch-2/3 sends that are now cancelled/blocked).

## Decisions recorded

- **Alert campaign complete**: 348 sends across 7 states (LA 37 / MS 49 / WI 35 /
  WA 64 / GA 78 / MI 53 / HI 32) + AZ 64 / MT 28 via touch-1. State file at 1090
  keys, worktree and main copies synced.
- **touch-2 retired** (Yuqi, 07-22): Amplitude shows generic-campaign traffic is
  100% email-scanner bots (6 sessions, 0s) vs disaster-alert 28 human sessions at
  21s avg. The 198 due go unsent; AZ/MT t2 cancelled.
- **touch-3 pending A/B**: skip entirely vs rewrite as farewell + alert-opt-in
  (Formspree). Generic version banned either way.
- **TX policy**: EM-3649 is an EM declaration, not a DR — IRS relief is NOT
  guaranteed to follow. The 107-firm TX list stays locked until an IRS notice
  posts; "watch" content goes to free channels (X/LinkedIn) only.
- **Society emails**: WICPA published Jul 16 → augment variant mandatory
  (recorded 07-21 in the society kit); MSCPA/MICPA speed-gap premises re-verified.
- **Suppress-list precondition**: `outreach-suppress.txt` last touched 07-17 —
  refresh from Gmail before any future touch send.

## Files

- `docs/marketing/launch-runbook-2026-07-17.md` — new §B2 status block superseding
  the §B send calendar
- `outreach-kit/TODAY-send-instructions.md` — warning banner at top (both copies)
