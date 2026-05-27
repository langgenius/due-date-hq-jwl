# 2026-05-27 — audit-drain x2: Rule library UX rework

Branch: `design/audit-drain-x2-rule-library-ux`

## Yuqi's ask

> Change rule library's list to infinite scroll. Inspect the UX
> interactions and information display. Rule library row — the
> progress bar shows the progress, hover onto the progress, shows
> how many needs review. Put a Needs Review number in a new column.

Three mandatory deliverables: infinite scroll, progress-bar hover
tooltip, dedicated Needs-review column.

## What shipped

### 1. Infinite scroll on the jurisdiction-group list

`apps/app/src/routes/rules.library.tsx`

- Replaced `?page=N` URL-bound prev/next pagination with incremental
  client-side reveal. New local state `visibleGroupCount` starts at
  `PAGE_SIZE` (10 groups), grows by `PAGE_SIZE` whenever the
  IntersectionObserver-attached sentinel `<TableRow>` scrolls into
  the viewport (rootMargin `256px 0px` so the next batch paints
  before the user sees a loading state).
- Resets `visibleGroupCount` to `PAGE_SIZE` whenever the filtered
  group fingerprint changes (search / scope / entity / sort).
  Effect dependency is `filteredGroupsFingerprint` (jurisdiction list
  joined with `|`) so re-fetching data without changing the filter
  set does NOT scroll the user back to the top.
- Added a fallback `Load more` button rendered ABOVE the sentinel
  for keyboard/touch users who never trigger scroll.
- Removed prev/next footer, `parseAsInteger`, `ChevronLeftIcon`, and
  the `page` nuqs param.

Why client-side instead of cursor-pagination: `listRules` already
returns the entire catalog (~470 rules, ~85KB) in one request. The
mount-time cost lives in painting 470 `<TableRow>` components, not
in network IO. Cursor pagination would multiply requests for
marginal gain and break the in-memory search + jurisdiction-grouping
data flow.

### 2. Progress-bar hover tooltip on `RuleStatusBar`

Replaced the native `title` attribute (mouse-only, browser-styled,
no keyboard / SR affordance) with the canonical Tooltip primitive
(`@duedatehq/ui/components/ui/tooltip`). New popover renders:

```
N of M need review
● A active
● B needs review
● C other  (only when > 0)
```

with the same status-tone color chips the bar segments use, so the
eye carries the legend from segment → tooltip line without
translation work. Trigger is now `tabIndex=0` with a
`focus-visible:ring-2` so keyboard users can land on the bar and
read the breakdown via screen reader (the bar carries an `aria-label`
identical to the headline).

### 3. New "Needs review" column

Sits between the per-entity matrix and the Tier column.

- `RULES_TABLE_COLUMN_COUNT` bumped from `3 + ENTITY_KEYS.length`
  (10) to `4 + ENTITY_KEYS.length` (11). All downstream `colSpan`
  references — gap rows, status section headers, empty rows —
  auto-adjust since they all key off the constant.
- Column header is right-aligned, includes a sort button cycling
  `null → desc → asc → null`. Default order (catalog) preserved.
  When sort is active, the header arrow lights up in
  `text-text-accent`.
- State header row renders `pendingReviewCount` as a
  `CountDotChip` (canonical primitive, accent tone) in this column.
  This was previously cramped inside the Tier column alongside the
  gap chip + progress bar. Splitting it out gives "where is the
  work" its own column-true position.
- Rule rows render a quiet `EmptyCellMark` em-dash. Per-rule
  needs-review state is already encoded by the section header
  ("Needs review" vs "Active") above the rule — painting a 1 here
  would be column-true repetition.
- Search results table mirrors the column (`CountDotChip` lights up
  for individual matching rules with `statusGroupOf === 'needs_review'`).
  Keeps column geometry identical between grouped + flat views so
  the user can search and browse without the table reshape.

## How the three pieces fit together

Reading the catalog top-to-bottom now:

```
Federal · 12 rules · LLC 8 / Part 6 / S-Corp 7 ... [3 needs review] [1 missing] ▓▓▓░░░░░░░
California · 9 rules · LLC 4 / Part 5 ... [—] [—] ▓▓▓▓▓▓▓▓▓▓
```

The new column gives the eye one numerical "work queue" axis to scan
down (sortable). The status bar carries the qualitative "what shape
is this jurisdiction in" texture. The hover-tooltip bridges the two
— hovering the bar reveals the exact same number the new column
shows, so users learn the bar's tooltip semantics by triangulating
against the column they're already reading.

## UX audit drift fixes (besides the 3 mandatory)

None landed in this pass — the rule library had already absorbed
β's 8 R-section fixes and the cross-table drift batch from
2026-05-26. The bar-progress restyle + new column already touch
enough surface area that adding more would mix concerns. Capped at
the three mandatory deliverables.

## What was harder than expected

- The "rule library row" Yuqi referenced was ambiguous at first
  read. Reading carefully: the rules.library.tsx jurisdiction-group
  header row is the row that owns a progress bar. The literal
  per-rule row (`RuleTableRow`) has no progress bar, just the rule
  title + form + entity dots + tier. So the hover + new column
  apply to the GROUP HEADER, not the rule row. The
  `EntityStateCell` already encoded per-entity pending counts via
  the `1/3` warning-tone format — the new column is the
  cross-entity rollup.
- Hoisting `PAGE_SIZE` out of the route body was necessary so the
  initial `useState` seed in the route + the `useEffect` reset +
  the IntersectionObserver increment + the toolbar "Showing N of M"
  copy all see the same value. Trade: a small file-level constant
  vs four scattered literal `10`s.
- Sort across `JurisdictionGroup[]` had to use `toSorted` (oxlint
  blocks `Array#sort` mutation in this codebase).

## Tests

- `pnpm test --run src/routes/rules.library` — 14/14 pass
- `pnpm test --run src/features/rules` — 27/27 pass (3 files)
- Full app suite — 390/390 pass

## Constraints honored

- TSC clean
- Lingui strict-compile passes
- All new strings translated to zh-CN (规则=规则, 复核=needs review,
  加载更多=load more, 排序=sort)
- 10 new msgids added + translated
- Did not touch `NewRuleModal*`, permission copy, dashboard,
  milestone, or migration files
- Did not push to remote
