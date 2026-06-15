# Alerts list — one left edge + inline day count

_2026-06-15_

Yuqi (screenshot feedback on the /alerts list): "the left side is not
aligned" and "avoid eyes move horizontally (like Wednesday May 20 ————
1 alert) — that is bad readability."

## What was wrong

Three staggered left edges down the list:

- Toolbar (`Review / Active / Suggested action`) sat at the list column
  edge (x≈16).
- The card frame's content — row checkboxes + day-band checkboxes — sat
  one `px-5` further in (x≈36), because the rows/bands carry their own
  horizontal padding inside the rounded frame.
- Row/day content (time, "Wednesday") sat past the checkbox column (x≈64).

So the filter row read as floating ~20px left of everything below it.

Separately, each day band right-pinned its count with `ml-auto`
("Wednesday May 20 ——————————— 1 alert"), forcing the eye across the full
width of the list to read a one- or two-digit number.

## Fix

- **Toolbar** (`AlertsListPage.tsx`): added `px-5` to the sticky filter
  row so its leading control shares the card content edge. Now the
  toolbar, the row checkboxes, and the day-band checkboxes line up on one
  edge (verified x≈36–38), and the toolbar's right side aligns with the
  card content's right padding too.
- **Day band** (`PulseAlertRow.tsx`): dropped the `ml-auto` count and
  moved it inline after the date with a `·` separator — "Wednesday May 20
  · 1 alert". One quiet header phrase, read left-to-right with no jump.

## Verified

DOM measurement + screenshot at 1512×861: toolbar control, day checkbox,
and row checkbox all align; day bands read "<day> <date> · N alerts"
inline. `tsgo` clean, `vp check` clean.
