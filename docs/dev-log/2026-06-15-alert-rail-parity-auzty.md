# Alert detail rail — parity with the aUZTy list treatments

_2026-06-15_

When an alert opens, the left column swaps from the full /alerts list to the
compact `AlertListRail`. After the aUZTy row pass, the rail had drifted out of
sync — no unread dot, no confidence pill — so opening an alert read as a jarring
swap. Brought the two signals over so the hand-off from list → detail layout is
smooth.

## What

`RailItem` now carries the same two signals as `PulseAlertRow`:

- **Unread dot** leads the date column (accent while the alert is
  matched / partially_applied; reserves its slot when read so dates stay
  aligned). The time aligns under the date, past the dot's slot.
- **Confidence pill** in the badge row — the same low-only amber pill
  ("Low confidence" / "Very low confidence"); high confidence shows nothing.

The wand action pill is intentionally NOT added to the rail — the open detail
pane beside it already shows the action, so repeating it would be redundant.
The rail keeps its compact date-column structure (it's the navigator, not the
full row).

## Verified

Live (panel open on the FL 46% alert): rail items show accent dots + "Low
confidence" (58%) / "Very low confidence" (46%) pills matching the list; high-
confidence rows show none. tsgo + vp check clean; strings reused (no new
catalog entries, only reference syncs).
