# Deadline detail — rail status icon + footer prominence (2026-06-10)

Closing out the Qn4nX feedback batch.

## #10 — rail status as icon (expand on active)

`DeadlineNavigatorRail` rows showed the full status _label_ text. Now each row
shows the canonical status **icon** (`STATUS_ICON` tinted via
`STATUS_ICON_COLOR`); only the **active** (currently-viewed) row expands it to
icon + label. Keeps the rail scannable and reserves the text for where you are.

## #12 — sticky footer more prominent (不够醒目)

The page-mode action footer got a stronger top border
(`divider-subtle` → `divider-regular`) and a restrained upward lift-shadow
(`0 -2px 4px -2px`, blur 4 — within the micro-shadow rule) so the committed
action surface (Assign · Snooze · Mark as filed) reads clearly above the gray
content scrolling under it.

## Verified

`tsgo --noEmit` clean. Live: rail icons render per status, active row shows
icon + "In review"; footer lifts off the content.

## Batch status

Done: white-top reorg + 56px crumb (A/B), #1 tab-bar padding, #2 (already
removed), #3 content padding, #5 stepper unbox, #6 bold active card, #7/#8
activity rows, #10 rail icon, #12 footer. #4 (content↔stepper align) resolved by
the unbox/rebox. Deferred (separate, larger): comment-cruft trim (app-wide),
plus the pre-existing functional gaps — extension fold, rail-follows-table
sort/filter, full responsive contract.
