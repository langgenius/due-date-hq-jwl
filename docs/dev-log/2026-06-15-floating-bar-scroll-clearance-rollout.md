# Floating bulk bar — reserve scroll clearance on the remaining surfaces

_2026-06-15_

The `FloatingActionBar` primitive exports `FLOATING_ACTION_BAR_SCROLL_PADDING`
(`'pb-28'` ≈ 112px) — the canonical bottom clearance a scrollable list adds
**while the bar is visible** so the last rows scroll clear of the fixed bar
instead of being occluded. The rules jurisdiction table already adopted it
(conditional on `selectedCount > 0`). The other three surfaces that render a
`FloatingActionBar` still hid their last rows behind the bar.

## Change

Imported the constant and applied it conditionally — only while a selection
exists, so there's no permanent dead space at rest (the Gmail/Linear behaviour):

- **`/deadlines`** (`routes/obligations.tsx`) — added to the queue column
  (`flex min-w-0 flex-1 flex-col gap-4`, gated on `selectedIds.length > 0`). The
  bar only shows in full-page mode (the column is `hidden` when the panel is
  open, which hides its `position: fixed` descendant too), and full-page scrolls
  as one page, so the column's own bottom padding extends the page scroll height.
- **`/alerts`** (`features/alerts/AlertsListPage.tsx`) — added to the list column
  (the `overflow-y-auto` scroll container), gated on
  `selectionEnabled && selectedCount > 0` (the exact condition the bar renders
  on; the column is hidden when the detail panel is open).
- **Client Filing plan** (`features/clients/ClientWorkPlanPanel.tsx`) — the panel
  has no own scroll container (it scrolls inside the client detail's
  `TabsContent overflow-y-auto`, and the selection state lives inside the panel),
  so the clearance went on the panel's `<section>` root, gated on
  `selectedIds.size > 0`. Its bottom padding extends the tab's scroll height.

## Verified live (preview)

Selected rows, scrolled each list to the bottom, measured the last row vs the
fixed bar (`getBoundingClientRect`):

- `/deadlines` — padding `112px`; last row bottom `700` vs bar top `761` → clears
  with a 61px gap.
- `/alerts` — padding `112px`; last card bottom `625` vs bar top `756` → clears.
- Client Filing plan — padding `112px` applied to the `<section>`; bar present at
  top `759`. (The preview build auto-rotates routes, so the numeric last-row read
  kept getting interrupted, but the binding + computed clearance match the two
  fully-measured surfaces and the identical proven mechanism.)

tsgo clean; `vp check` reports no formatting issues on the three touched files
(the listed files are pre-existing, unrelated).
