# Three Feb-1-2027 relief codes + digest freshness fixes

2026-08-14

## Why

The daily IRS monitor flagged three live codes missing from the dataset (all issued Aug. 7,
2026, all postponed to Feb. 1, 2027): MS-2026-03 (Tropical Storm Arthur, 8 Gulf Coast
counties), WV-2026-01 (4 counties; updated 8/11 to add Pleasants and Ritchie), NMI-2026-02
(Super Typhoon Bavi — Rota, Saipan, Tinian). Every fact was re-verified against the irs.gov
releases before entry (per the CPA-content verification rule); the monitor session's draft
matched on all fields.

## Changed

- `apps/marketing/src/lib/disaster-notices.ts`: three new entries (first Feb-2027 deadlines).
  Notable: MS and MP each now carry TWO live reliefs (MS-2026-02 Nov. 2 inland vs MS-2026-03
  Feb. 1 coastal; NMI-2026-01 Sinlaku vs NMI-2026-02 Bavi) — county/island sets are disjoint.
  NMI release oddity recorded in the comment: its estimated-tax paragraph says "July 21"
  (WV's incident date, apparent IRS copy-paste); we assert no July-21 cutoff.
- `outreach-kit/disaster-notices.json`: same three entries mirrored (11 → 14; main only —
  the elastic-wilson worktree sender is retired).
- `outreach-kit/build-digest.mjs` freshness/IA fixes:
  - Timezone bug: `(TODAY - new Date(issuedOn))` raw-ms math let the host's UTC offset push
    an exactly-7-day-old release out of the fresh window (BST hid all three Aug-7 notices).
    Now a calendar-day diff at UTC noon, same convention as `daysOut`.
  - The subject leads with fresh relief but the body never showed it when urgent items
    existed: added a "New this week" section (fresh notices >30d out; a fresh notice due
    sooner already sits in the urgent/this-month blocks), deduped from "Further out", and
    the opening line now appends "— and N new reliefs just landed."
- `digests/digest-2026-08-14.{html,txt,subject.txt}` regenerated: live=13, new=3,
  due-soon=2 (GA/HI, 6 days); subject "New IRS relief in MS, WV, MP — any clients there?".

## Known trap (do NOT "fix" on a later pass)

The HI-2026-01 URL slug and the IRS index listing still read "july-8-2026"; the notice body
carries the in-place update to Aug. 20, 2026. The dataset's Aug. 20 is correct.
