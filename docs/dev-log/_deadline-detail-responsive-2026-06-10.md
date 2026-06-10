# Deadline detail — responsive contract (2026-06-10)

Yuqi (c): full responsive contract (xl/lg/md/sm) for /deadlines/:ref.

## Breakpoints (verified live)

- **xl (≥1280)**: navigator rail 380px + detail (Pencil baseline).
- **lg (≥1024)**: rail 340px + detail.
- **md / sm (<1024)**: master-detail collapses to **detail-only** — the rail is
  `hidden lg:flex`, so the detail takes full width; the crumb's "Deadlines" link
  returns to the table. (`DeadlineNavigatorRail`.)
- Hero date cards already stack `grid-cols-1 sm:grid-cols-3` (1-up on mobile,
  3-up at sm+). Status tab is single-column at every width. Ownership/Linked-from
  footer is `grid-cols-1 sm:grid-cols-2`. Tab bar scrolls horizontally on narrow.

Verified at mobile (375) and tablet (768): rail hidden, date cards stack/flow,
hero + workflow card + footer all readable full-width.

## Known follow-up

Page gutters stay `px-12` at all widths — slightly generous on phones; a
`px-5 sm:px-12` step (with matching `-mx` on the full-bleed date strip / tab bar)
is a future polish, deferred to keep this pass low-risk.
