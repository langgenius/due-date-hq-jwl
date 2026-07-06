# Cold-outreach wave 2 — sourced, merged into master + send sequence

**Date:** 2026-07-06
**Area:** `outreach-kit/` (cold-email campaign)

## What
Sourced a second wave of verified, emailable US CPA / accounting-firm contacts and merged them
into both the verified master roster and the send sequence.

- **360 net-new contacts** across **19 states** → `duedatehq-MASTER-verified-wave2.csv`
  (290 verified real emails · 47 contact-form · 23 find-manually).
- Deepened the original 7 states (FL, TX, CA, GA, WA, NY, AZ) with new firms in less-saturated
  secondary cities, and expanded into 12 FEMA-disaster-heavy states (LA, MS, AL, SC, NC, TN, KY,
  MO, OK, AR, CO, OR) — chosen because the "a deadline just moved (FEMA relief)" story lands
  wherever the IRS/state grants disaster relief.
- Sourcing notes + method + per-state breakdown: `wave2-sourcing-notes.md`.

## Merges
- **Master roster** `duedatehq-MASTER-verified.csv`: 289 → **649 rows**. Existing rows preserved
  byte-for-byte (append only).
- **Send sequence** `duedatehq-OUTREACH-sequence.csv`: 289 → **649 rows**. Generated the wider
  16-col schema (Channel + Subject1/Email1/Subject2/Email2/Subject3/Email3) for each new contact,
  matching the existing row format exactly:
  - Touch-1 subject/track by fit: `Business-entity` → the "S-corps and partnerships" subject
    (track C, 325 rows), `Multi-state`/other → the general subject (track B, 35 rows). Touch-1
    HTML itself is rebuilt in code by `buildTouch1()` (fixed Georgia showcase card), so no
    per-state disaster data was needed.
  - Touch-2/3 plain-text bodies rendered from the locked follow-up copy.
  - First-name greeting extracted from the decision-maker with a conservative parser (drops
    initials, honorifics, role-words, surname-only partner lists); **84 rows fall back to the
    safe "Hi there,"**. Full extraction audit: `wave2-sequence-greeting-review.csv`.

## Verification
- Programmatic dedupe: **0 email collisions** vs the 211 existing master emails, **0 internal
  duplicates**, **0 firm-name overlaps**. (12 states are brand-new; the 7 existing states were
  deduped during research — researchers pre-dropped ~14, incl. Springer & Company.)
- Cross-checked vs the 7 new hard-bounce suppressions (uncommitted in the primary worktree) →
  **0 overlap**.
- Ran the real sender in **dry-run** (`--touch 1`): all 290 new emailable rows process cleanly,
  `failed=0`, correct track + greeting per row. (The 6 extra "would send" are the pre-existing
  2026-07-03 association rows that never got touch 1 — not part of this change.)
- Row integrity: every sequence row parses to 16 columns; every master row to 9. No malformed rows.

## Not done here (deliberate)
- **Nothing sent.** The sender stays dry-run by default; touch gating + suppress list unchanged.
- Did not touch `.outreach-state.json`, `send-outreach.mjs`, or the suppress list.
- 4 listing-only emails are flagged in `wave2-sourcing-notes.md` §8 to reconfirm before a send
  (MO Turk `John@`, TX Janie Barry, LA Bobbie Howard + LeMay).

## Provenance
`duedatehq-MASTER-verified-wave2.csv` is retained as the wave-2 provenance record alongside the
merged master. Pre-merge backups were taken at `/tmp/master-backup-premerge.csv` and
`/tmp/sequence-backup-premerge.csv`.
