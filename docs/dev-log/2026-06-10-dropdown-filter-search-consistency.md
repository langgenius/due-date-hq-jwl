# Dropdown / filter / search consistency pass

Date: 2026-06-10

Yuqi audited dropdown buttons + filters + the clear-filters interaction, then
every page search ("their hover state… every state of search should be the
same"). This fixes the bugs/gaps found, at the primitive level where possible.
Explicitly left the **/deadlines consolidated filter popover + View menu**
alone (sensitive, intentionally a different pattern) — only its toolbar *search*
was migrated.

## Dropdown / filter

- **/rules toolbar alignment** (`jurisdiction-rule-table.tsx`): row gap `gap-3`
  → `gap-2` (every other page is `gap-2`); the status `Segmented` was at the
  primitive default (~h-8) next to h-9 FilterTriggers — added
  `className="h-9 [&>button]:h-8"` (the same treatment /alerts uses) so they
  line up.
- **Clear-filters standardized** on one model — **always rendered, `disabled`
  when nothing to clear, labeled "Clear filters"** (no layout reflow on the
  wrapping toolbar row):
  - `/alerts`: was "Reset" that *unmounted* when inactive → now "Clear filters",
    always shown, disabled.
  - `/rules`: had **no** clear affordance → added one (clears facet filters +
    sort + search; leaves the status Segmented, which is a view scope).
  - `/clients`: already this model; corrected the stale comment that claimed
    /alerts said "Clear filters" (it said "Reset" until now).
  - `/deadlines`: keeps "Reset filters" inside its View menu — different
    control, left as-is.

## Search — unified on the `SearchInput` primitive

The base `Input` already has the full state machine (hover
`components-input-bg-hover`, focus border+bg recolor + 1px inset ring,
token placeholder). The page-level searches bypassed it with hand-rolled
`<label><input/></label>` markup: `rounded-xl`, **no hover**, ring-2 (no
recolor), no clear-(×), no Esc, drifting placeholder colors. Migrated them onto
`SearchInput`:

- `/alerts` toolbar + `/alerts` history (`AlertsListPage`, `AlertHistoryView`).
- `/deadlines` main toolbar (`obligations.tsx`) — preserved the rate-limited
  `setObligationQueueQuery` onChange + the `searchInputRef`; the clear-X and
  Escape both route through it (`next === ''`).

All now share: `rounded-lg` (8px, the input radius — was `rounded-xl`), icon-
left, white→faint-gray hover, focus recolor + inset ring, `text-secondary`
placeholder, inline clear-(×), Escape-to-clear.

### New `compact` SearchInput variant for rails

The sidebar rail searches were a third species and weren't even consistent with
each other: `AlertListRail` + `ObligationListRail` were hand-rolled (h-7,
borderless, `state-base-hover` hover, no clear), `DeadlineNavigatorRail` was
hand-rolled too (text-sm, no clear, sharing a row with a status dropdown), and
`states-rail` already used `SearchInput` but with the bordered h-9 *default*.
Added `variant="compact"` to `SearchInput` — borderless h-7, transparent →
state-base-hover on hover/focus, no ring, tighter icon/clear insets — sharing
every other behavior with the default. Migrated **all four** rails to it, so a
rail search is now the SAME control as a page search, just denser chrome. After
this pass there are **zero** hand-rolled `type="search"` inputs left in the app.

## Left intentionally

- The `CommandInput`-based searches (⌘K command palette, faceted filter popover
  typeahead, combobox) — a coherent separate modal/typeahead family.
- The /deadlines filter popover + View dropdown structure.
- The /deadlines per-row assignee picker (`size-8` dashed-circle "?" trigger) —
  a row-cell affordance, not a toolbar/search control; flagged in the audit as a
  minor alignment nit, deliberately not changed here.

## Verify

tsgo clean (0 errors in touched files). `vp check` clean on touched files
(formatter normalized the new rules clear-button block). Live @1440×900:
`/alerts` toolbar — all controls h-9 aligned, "Clear filters" present+disabled,
search icon-left `rounded-lg` (8px confirmed via computed style). `/deadlines` —
search migrated (`rounded-lg`), Filter + View dropdowns untouched, table intact.
(The `dueText is not defined` console error + Base-UI `nativeButton` warnings are
pre-existing / unrelated to this pass — `merged-brief-card.tsx`.)
