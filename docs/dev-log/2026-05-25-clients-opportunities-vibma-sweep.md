# 2026-05-25 — /clients + /opportunities Vibma sweep

## Why

Yuqi sent a fresh 9-item Vibma list on `/clients` and a 1-item meta
note on `/opportunities` ("应该尽量从别的页面中取得，这样可以保持
一致性" — borrow from the other pages so the surface stays
consistent). This batch ships the items that were unambiguous code
changes; #1 (page-level consistency meta) and #5 (an ambiguous
margin question on the AppShell wrapper) are folded into the
shipped changes where they overlap and otherwise captured for
follow-up.

## Shipped (8 items)

### /clients #2 — Import history button now shows "Archive"

The icon-only `ArchiveIcon` button in the page header (which opens
the CSV import-history drawer) was relying on a tooltip to surface
its action label. Promoted to a labeled `Button variant="outline"
size="sm"` with the literal word "Archive" inline. The drawer is
the imports archive, so the verb fits; tooltip widened to
"Imports archive — review past CSV migrations" so the
discoverable label still distinguishes it from the client-level
Archive action on `/clients/[id]`.

### /clients #3 — Missing-facts alert reads as more urgent

The banner that calls out "N clients are missing state or entity
type" was sitting at the same visual weight as the stat tiles
below (both bordered amber, both quiet bg). Added a 3px left rail
in `severity-medium` amber plus a soft `shadow-sm` ring, and
bumped the inline message text from `decoration-dotted` only to
`font-medium text-text-primary` so the eye lands on it. Fix-now
button promoted `variant="outline"` → default primary so the
banner carries a clear primary CTA color.

### /clients #4 — Tighter banner / strip gap

Wrapper `flex flex-col gap-3` → `gap-2`. The banner and the stat
tiles below now read as one related cluster (8px gap) rather than
two separate sections (12px gap).

### /clients #9 — SurfaceSummaryStrip → three card tiles

Retired the inline `SurfaceSummaryStrip` (4 dot-separated counts
in one bar) in favor of three discrete `ClientsStatTile`s
matching the `StatTile` shape used on `/rules/library`:

- **At risk** — destructive red number when > 0, clickable to
  toggle the local "overdue" filter
- **Waiting on client** — warning amber, clickable to toggle the
  local "waiting docs" filter
- **Pulse hits** — review tone, clickable to apply
  `pulse=affected`

The fourth "missing facts" metric moved entirely into the banner
above (it was duplicated in both the strip and the banner) — the
banner now carries that CTA cleanly without a second redundant
count.

Each tile uses `aria-pressed` + a pressed background
(`bg-state-accent-hover` + `border-state-accent-solid`) when its
filter is active, so the CPA can see at a glance which subset is
narrowing the table.

### /clients #8 — Filter dropdowns moved out of column headers

Mirrors the `/rules/pulse` filter rhythm. Was: four
`TableHeaderMultiFilter` funnel triggers, one inline in each
column header (Client / States / Entity / Owner). Now: one
`ClientsFilterToolbar` row above the table with four wide
outline-button triggers (`trigger="toolbar"` on the existing
primitive) plus a `Reset` button on the right. Column headers
keep only the sort-arrow trigger — sort and filter are no longer
sharing a header cell.

Retired the table-level `openHeaderFilter` / `setHeaderFilterOpen`
state (each toolbar trigger now manages its own uncontrolled open
state) and trimmed the `columns` useMemo dep array accordingly.

### /clients #6 — Entity badge consistency across list + detail

The list cell rendered the entity chip as `Badge variant="outline"
rounded-sm font-normal tabular-nums`; the detail page header chip
used `Badge variant="outline" text-xs`. Same identity fact, two
visual treatments. Unified the list cell to match detail
(`text-xs font-normal`); dropped the `tabular-nums` override
(entity labels aren't numeric — "S corp", "LLC", "C corp" — the
class was a copy-paste from the dot column next door).

### /clients #7 — States column uses StateBadge primitive

Was a square `Badge variant="secondary" rounded-sm font-mono` with
the two-letter state code as text — different from every other
place in the app where a jurisdiction shows up (Alerts page chip
strip, Pulse drawer fact card, Alerts list card all use the
`StateBadge` SVG flag/seal motif). Swapped to `<StateBadge
code={code} size="sm" />` for both the primary state and the two
visible "other" states. Overflow chip (`+N`) preserved at the end
of the row so row width stays predictable.

### /opportunities #1 — Page consistency with /clients + /rules/library

The whole page restructured to match the GitHub-density rhythm
used on every other table-bearing route:

- Outer container: `gap-6 p-4 md:p-6` → `gap-4 p-3 md:p-5`
- Summary cards: replaced the heavy `<Card>` shape with the same
  `StatTile` rectangle (uppercase caption label + tabular number)
  used on `/rules/library` and `/clients`. New
  `OpportunitiesStatTile` primitive scoped to this page.
- List section: dropped the `Card / CardHeader / CardContent`
  wrapper. The h2 + description anchor the section; rows still
  get hairline `divide-y` separators. Loading skeleton + empty
  state preserved.

## Deferred / captured

### /clients #1 — Page-level consistency (meta)

This was Yuqi's framing direction for the whole batch, not a
specific code site. The seven shipped items above address it
piecemeal: stat tiles, filter toolbar, state badges, entity
badge, padding all align with `/rules/library` + `/rules/pulse`.

### /clients #5 — "what about the margin?"

The annotation pointed at the SidebarInset's max-width wrapper. I
couldn't disambiguate "the margin" from the screenshot alone — the
wrapper already uses `mx-auto max-w-page-wide p-3 md:p-5`, which
is the canonical layout. Will return when we have a screenshot
showing which margin Yuqi wants tightened.

## Files touched

- `apps/app/src/routes/clients.tsx` — Archive button label
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
  - Header columns: removed inline filter funnels
  - New `ClientsFilterToolbar` filter strip above the table
  - New `ClientsStatTile` (3-card replacement for
    `SurfaceSummaryStrip`)
  - State column: StateBadge primitive
  - Entity column: badge variant unified with detail
  - Missing-facts alert: stronger left rail + Fix-now CTA
- `apps/app/src/features/opportunities/opportunities-page.tsx`
  - Outer container density aligned with /clients
  - New `OpportunitiesStatTile` (StatTile shape)
  - Dropped Card chrome around the list section

## Verification

- `vp check` → All 1447 files formatted, 0 lint/type errors
  across 667 files
