# GA/HI Aug-20 reminder — /r/ga /r/hi short links

2026-08-07

## Why

The GA (78) + HI (32) covered-firm reminder for the Aug. 20, 2026 IRS relief deadline sends
today (window 08-06–08-10, second touch on the July alert wave). Like the WA wave, the email
is plain text to land in Gmail Primary, so the long UTM URLs need the short-301 treatment.

## Changed

- `apps/marketing/public/_redirects`: four new outreach short links —
  `/r/ga`, `/r/ga-app`, `/r/hi`, `/r/hi-app` → notice page / app with
  `utm_campaign=disaster_alert&utm_content=rem_ga|rem_hi` (continues the July campaign key so
  Amplitude segments the reminder separately from the first alert).

## Facts re-verified today (per the CPA-content verification rule)

- IRS GA-2026-03: Aug. 20 deadline, Clinch/Echols/Brantley, wildfires + straight-line winds.
- IRS HI-2026-01: Aug. 20 (in-place revision from Jul. 8 on 5/12), Hawaii/Honolulu/Kauai/Maui.
- gov.georgia.gov 2026-05-08: GA state conformity uses its own calendar (Feb. 12 2027 /
  Oct. 13 2026), not the federal Aug. 20.
- HI DOTAX Announcement 2026-03 (amended) + governor.hawaii.gov NR 2026-09: state relief is a
  case-by-case penalty/interest waiver via Form L-115 (aligned to Aug. 20), not an automatic
  extension.

## Sender consolidated back to main

The digest/alert features had accumulated on the elastic-wilson worktree's copy of
`send-outreach.mjs` (branch `claude/suspicious-borg-15c7c5`), whose stale toolchain now
hangs `vp staged` — and memory already says "send from main, never from elastic-wilson".
So main's `outreach-kit/send-outreach.mjs` is now the single canonical sender: the worktree's
feature set (`--alert`, `--digest`/`--digest-id`/`--subject`, `--text-only`, `--today`,
`--self`, cid wordmark) merged on top of main's v13 canon-aligned touch-1 template (the
worktree copy still carried v12 with the banned "deadline monitoring" subject — v13 kept),
plus the new `--alert-reminder` branch:

- Gate key `rem_<abbr>_<yyyymmdd>` (e.g. `rem_ga_20260820`) — the July `alert` gate would
  have skipped all 110 GA/HI firms; one reminder per deadline, future deadlines unblocked.
- Bespoke fact-verified copy per state (GA/HI whitelisted in `buildReminder()`; other states
  are skipped, never templated), WA-wave conventions: permission-first open, plain text with
  `/r/<abbr>` short links, noon-to-noon day count with `--today` override.
- Standing self-copy rule: one `[your copy]` per state variant before that variant's first
  real send.

Dry runs from main: reminder → 109 (110 minus one suppressed), digest remainder → 1,009,
touch 1 → 0 (all gated, as expected).
