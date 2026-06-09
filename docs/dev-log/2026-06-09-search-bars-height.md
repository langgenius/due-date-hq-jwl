# Search bar height — settled at 36px — 2026-06-09

Yuqi first asked "all search bar is 40px height," then — once the toolbar
alignment tradeoff surfaced — settled on **"all search bars 36px"** so they sit
at the same height as the delicate `h-9` filter pills they share rows with.

## Net result (no functional change from baseline)

Search bars stay at **`h-9` (36px)**:

- `SearchInput` primitive (`components/primitives/search-input.tsx`) — `h-9`
  (the 40px excursion was reverted). Covers `/clients`, `/deadlines` toolbar,
  `/rules/library`, `/audit`, `/notifications`, rules coverage/states rail.
- `/alerts` hand-rolled search (`features/alerts/AlertsListPage.tsx`) — `h-9`,
  matching the `FilterTrigger` pills + View toggle in its toolbar row.

The doc comments in both files now record 36px as the settled height + the
rationale (alignment with the delicate round-83 filter sizing), so a future pass
doesn't "fix" it back up to 40px.

## Deliberately NOT changed

- **`SidebarQuickFind`** ("Quick find…") stays `h-10` (40px). It's a ⌘K
  command-palette trigger styled as a search box, not a page search input, and
  Yuqi's feedback was about page-level search bars. Flagged here in case she
  wants it brought to 36px for strict "all search bars" parity.
- **`FilterTrigger`** stays `h-9` (its doc says h-10, but round 83 deliberately
  shrank it; left delicate per Yuqi's settle-on-36px choice).
