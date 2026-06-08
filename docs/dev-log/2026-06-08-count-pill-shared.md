# CountPill — unify the alerts count chip across list & detail

Date: 2026-06-08

Yuqi (/alerts): "why does this button not work" + "ensure Alert and Alert detail
use the same style." The page header's count chip was a SOLID
`Badge variant="destructive" size="lg"` reading "8 urgent" — it looked like a
tappable button but did nothing (dead affordance), and it didn't match the detail
rail head, which used a soft `#fef3f2` dot-pill reading "7 active". Same page,
same data, two different looks + two different numbers (all alerts vs matched) +
two different words (urgent vs active).

## Fix

- New shared `CountPill` primitive (`components/primitives/count-pill.tsx`): the
  one canonical soft destructive dot-pill (pink fill, red dot, destructive text).
  A status indicator, not a button.
- `routes/alerts.tsx`: header count now reads the SAME metric as the rail
  (`status === 'matched'`) and renders `<CountPill>N active</CountPill>` — so the
  header and the detail rail head show an identical "7 active" pill. Removed the
  destructive `Badge` (and its import).
- `AlertListRail.tsx` + `ObligationListRail.tsx`: their inline copies of the same
  dot-pill markup now use `CountPill` (the deadlines rail's "N overdue" too).

## Verify

tsgo clean; `/alerts` list header and the detail rail head both show "● 7 active"
in the identical pill at 1512×861.
