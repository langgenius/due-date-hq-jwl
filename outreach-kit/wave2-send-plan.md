# Wave-2 send plan (touch-1 for 290 new + touch-2 for the original ~198)

**Date:** 2026-07-07. Sender = `send-outreach.mjs` (dry-run by default; add `--send`).

## 0. Prerequisites (do these first)
1. **`git pull` the main checkout** (`/Users/yuqi/dev/due-date-hq-jwl`). The 290 wave-2 rows were
   merged into `duedatehq-OUTREACH-sequence.csv` on `origin/main`; this checkout is behind, so
   without the pull the sender won't find them. (Commit/stash the in-flight WIP + your
   suppress-list edit first so the pull is clean.)
2. **Env** (only you have the key): `RESEND_API_KEY`, `FROM="Gigi from DueDateHQ <gigi@duedatehq.com>"`,
   `REPLY_TO=gigi@dify.ai`, `FOOTER_ADDRESS="548 Market St PMB 60083, San Francisco, CA 94104"`.
3. **Commit the suppress-list bounces** (`outreach-suppress.txt`) so they're skipped.
4. **Reconfirm or drop the 4 listing-only wave-2 emails** before their batch day (they're in these
   files): `John@turkcpas.com` (MO Turk), `info@janiebarry.com` (TX Janie Barry),
   `bobbielhoward@blhcpas.com` (LA Bobbie Howard), `tabby@lemaytax.com` (LA LeMay).
5. Optional but wise: mail-tester / seed-inbox check before Day 1.

## 1. Files
- `wave2-ramp-day1.csv` … `wave2-ramp-day6.csv` — the 290 new verified emails split 50/50/50/50/50/40,
  one `Email` per line. Used with `--wave` to bound each day's touch-1 send.

## 2. Daily cadence (keep daily total ≤ ~100–110 to protect the young domain)
Run per day (dry-run first — omit `--send` — then add it):

```bash
cd outreach-kit

# (A) NEW contacts — touch 1, one batch file per day
node send-outreach.mjs --wave wave2-ramp-day1.csv --touch 1 --send --limit 60 --delay 8000
#   day 2 → wave2-ramp-day2.csv, … day 6 → wave2-ramp-day6.csv

# (B) ORIGINAL 205 — touch 2 (ramped). The script enforces the ≥4-day gap from the
#     2026-07-02 touch-1 itself and skips repliers/bounces/suppressed automatically.
node send-outreach.mjs --touch 2 --send --limit 50 --delay 8000
```

Suggested schedule: Day 1 = ramp-day1 (50 new) + touch-2 (50 old); Day 2 = ramp-day2 + next 50
touch-2; … through Day 4 touch-2 is exhausted (~198), Days 5–6 finish the new batches.

## 3. Safeguards built into the sender (no action needed, just know)
- **De-dupes** from `.outreach-state.json` — never re-sends a touch to the same address.
- **Honors `outreach-suppress.txt`** on every touch.
- **Dry-run by default** — nothing sends without `--send`.
- Touch-1 HTML is the locked v11 template (rebuilt in code); touch-2/3 are the plain-text bodies
  from the sequence CSV.

## 4. Caveats
- **Touch-2 = the OLD generic follow-up** on `main`. Your upgraded **concierge** touch-2
  (`buildTouch2`) is on a different branch, *not merged* — if you want that version to go out, land
  that branch on `main` first.
- After each send day, commit the updated `.outreach-state.json` + `send-log-*.txt`.
- The 7 addresses Resend already shows as **Suppressed** (everybeancounts, porterkinney, cpatx,
  ldtaxadvisors, whytecpapc, jrcpa, 212tax) won't send — all still publish the same address, so
  there's no corrected address to retry. Leave them / pursue by phone or form.
