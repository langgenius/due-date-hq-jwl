# /alerts — reuse Today's alert-card vocabulary + header/scroll polish

Date: 2026-06-08

A feedback pass making the `/alerts` list row reuse the dashboard alert
card's information treatment ("do not reinvent new things"), plus three
interrupt fixes (button height, cropped search ring, sticky filters).

## PulseAlertRow

- **Change-kind type (#1 + #3)**: "Deadline shifted" was rendered in
  `font-mono`, bold, accent-blue — hard to read and unlike Today's card.
  Re-aligned to the NeedsAttentionCard treatment: SANS `text-[11px]
  font-semibold tracking-[0.4px]` neutral `text-text-tertiary`. One
  change-kind signature across /today + /alerts.
- **Corner-turn glyph (#2)**: the ACTION sub-clause led with lucide's
  `CornerDownRight` (an arrow). Replaced with a plain elbow SVG (down →
  right, rounded corner, no arrowhead) per "just a corner turn, remove the
  arrow head." Dropped the now-unused `CornerDownRightIcon` import.
- **Day-group band (#4 + #5)**: the band now carries the same slight-gray
  fill as the /today Actions table's status-group header (`#e9ebf0`), and
  the redundant right-side "N DISPATCH" count is removed — Today's section
  headers carry just the label, so this matches that vocabulary.

## Header (`routes/alerts.tsx`)

- **Coffee-button height**: the morning-sweep icon button was `icon-sm`
  (32px), 4px shorter than the `h-9` "Alert history" button beside it.
  Bumped to `icon` (36px) so the two header actions align.

## Filter row (`AlertsListPage.tsx`)

- **Cropped search ring**: the search field's focus ring was an outset
  `ring-2` getting clipped by the `overflow-y-auto` list column. Made it
  `ring-inset` so it draws inside the field and can't be cropped.
- **Sticky filters**: the search + filter row is now `sticky top-0` within
  the scrolling list column (page-wash `bg-background-inset` + `pb-2`), so
  search/filters stay reachable while paging through alerts — answering
  "should the search bar/filters stay when you scroll up?" with yes.

## Repo note

A concurrent `git stash pop` left a conflict in `PulseAlertRow.tsx` (the
icon import block — upstream had `CornerDownRightIcon`, the stash had
`ClockIcon`; neither is used in the body any more). Resolved by dropping
both. Separately, the shared 5177 dev server's HMR is wedged on an
unrelated syntax error in the `ddhq-deadlines-parity` worktree
(`deadlines-at-a-glance.tsx:207`), so these were verified by typecheck +
source inspection rather than that preview.
