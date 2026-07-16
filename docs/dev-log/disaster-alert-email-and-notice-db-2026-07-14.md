# Disaster-alert email + verified 2026 IRS-relief database (2026-07-14)

## Why
Alert monitoring is the product's headline value. To prove it (and to send hyper-relevant, higher-intent
outreach), we needed a current, verified database of live IRS disaster-relief postponements and a per-state
"deadline alert" email that auto-fills from it.

> Branch note: this worktree (`claude/suspicious-borg-15c7c5`) is ~48 commits behind origin/main and does
> NOT contain the marketing disaster hub. The **alert email** (sender + JSON) is committed here, where sends
> run. The **`disaster-notices.ts`** update below is prepared and lands separately on **main** (where the hub
> lives) — not in this commit.

## Verified notice database — `apps/marketing/src/lib/disaster-notices.ts` (lands on main)
Rebuilt via 7 parallel research agents, each transcribing from the official irs.gov release (hard red line:
nothing invented). **6 → 11 live notices** (deadline on/after 2026-07-14):

| deadline | notices |
|---|---|
| Aug 5 | WA-2025-03 |
| Aug 20 | GA-2026-03, HI-2026-01 |
| Sept 28 | AZ-2026-01, MT-2026-03 (Fort Peck), MT-2026-04 (Crow) |
| Nov 2 | LA-2026-02, MS-2026-02, WI-2026-02, MI-2026-02, NMI-2026-01 |

- Removed expired MO-2025-03. Added LA/MS/WI/MI/MT×2. Re-verified AZ/GA/HI/NMI (deadlines unchanged).
- **Bug fixed:** old WA entry under-listed affected returns as 4 types; the IRS release covers the full
  business-entity set (1120/1120-S/1065/…) — corrected and re-confirmed against the release.
- HI deadline conflict resolved: current deadline is **Aug 20, 2026** (release updated from the URL's July 8).
- Each entry carries a `Verified 2026-07-14` comment + `sourceHref`. `tsc` clean.

## Sender — `outreach-kit/send-outreach.mjs` + `outreach-kit/disaster-notices.json`
- `disaster-notices.json`: zero-dep, sender-readable copy of the 11 notices (with form-number chips).
- New **`--alert`** mode + `buildAlert(r)`: looks up the recipient's `State`, and if a live notice exists,
  builds a per-state alert email (subject/text/html). **Honest fill** — uses only verified IRS facts
  (state, event, deadline, affected area, affected returns). It does NOT reproduce the mockup's IRS-vs-state
  comparison table, because we only have verified IRS dates, not each state's conformity dates (fabricating
  them would cross the red line). States with no live notice are skipped.
- Tracked under a separate `alert` key in `.outreach-state.json` — never double-sends, independent of t1/t2/t3.
- Dry-run verified: 355 recipients across GA/AZ/WA/MT/LA/MS/WI would get an auto-filled alert; the other
  ~1,295 (states with no live notice) are skipped. `node --check` clean.

## Design reference
`docs/marketing/alert-email-preview.html` — real `buildAlert()` output rendered for GA / WA / LA.

## Hierarchy revision (post first-render critique)
First live render read as list-overload. Fixes to `buildAlert()`:
- **De-duplicated the county list** (was in both lede and card → card only, demoted to muted small text).
- **Tamed "who it hits":** 5 lead form chips (1040 · 1120-S · 1065 · 941/940 · Estimates) + a muted
  `+ …` overflow, instead of 10 chips wrapping two rows.
- **Spec-sheet card staircase:** Date (hero, 23px) → uppercase "RETURNS THAT MOVED" → uppercase
  "AFFECTED COUNTIES" (demoted). Shorter lede; dropped `.toLowerCase()` on the event (was breaking
  proper nouns like "Southeast Georgia").
- Preview: `docs/marketing/alert-email-preview.html` (GA/WA/LA).

## Minimal pass ("too much things")
Stripped further: dropped the lede paragraph and the entire "returns that moved" chips block + the
county-list block. Card collapses to **date + countdown + one summary line** ("Nearly all federal
returns · clients in the affected counties"). Body = headline → card → one product sentence → CTA.
Full county list / return specifics live behind the "official notice" link and the CTA.

## Not sent
Nothing sent. Pilot plan: scope with `--wave` to one live-disaster state (e.g. WA — soonest deadline, and our
Vancouver/Longview firms sit in the affected counties) and measure reply/signup vs the generic campaign's 0.
