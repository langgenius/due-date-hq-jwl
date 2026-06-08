# /alerts — row Dismiss/Review button corners

Date: 2026-06-08

Yuqi (#4): the hover Dismiss/Review buttons had "wrong rounded corners." They
used the Button base's squircle corner, which read differently from the row's
chips (state/form/etc., plain circular rounded-[6px]). Kept the button styles
(Dismiss outline, Review filled) per Yuqi; overrode the corner to circular
`rounded-[6px] [corner-shape:round]` so they match the row chips.

## Verify
tsgo clean; the Review button computes corner-shape: round, radius 6px (was
squircle). At 1512×861.
