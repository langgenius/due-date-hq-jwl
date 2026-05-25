# 2026-05-26 — Pulse polish + Search Phase 1 + /deadlines foundation

## Why

Yuqi shipped a long sequence of design-polish feedback batches across one
session. The batch covers four parallel workstreams:

1. `/rules/pulse` drawer + alert card polish (12-item batch + 3 follow-ups)
2. Cross-page scrollbar de-nesting audit (5 sites with nested scroll containers)
3. Search Phase 1 hygiene — establish honest separation between page-level filter
   and global entity search; remove the cmd+k "Search or navigate" lie
4. `/deadlines` redesign foundation — subtitle metrics, Group-by switcher
   plumbing, PathToFilingSummary lucide stage icons, sort chevrons honest,
   pagination always-visible, Snooze button placeholder, header font unify

Phase 2 of search (real entity search via `pg_trgm` + RPC + palette refactor) and
the full `/deadlines` drawer redesign per Yuqi's Figma Make prototype are spawned
as separate parallel tasks; this commit lands the foundation those tasks build
on.

## Shipped — 5 commits, 22 files

### Commit 1 — `docs(search): Phase 1 + 2 PRD + strategy`

- `docs/Design/search-prd-2026-05-26.md` (~700 lines) — full PRD for global
  entity search Phase 2. Covers product decision (Filter vs Search verbs),
  search scope per entity (5 entity types), ranking heuristic, permission
  matrix, API contract (`orpc.search.entities`), Postgres `pg_trgm`
  infrastructure decision, phased implementation plan, telemetry, and open
  questions.
- `docs/Design/search-strategy-2026-05-26.md` — shorter strategy doc that
  the PRD supersedes (folded in). Kept for reference.
- This dev-log entry.

### Commit 2 — `design(pulse): /rules/pulse drawer + alert card polish`

Closes Yuqi's 12-item `/rules/pulse?alert=…` review plus 3 follow-up batches:

- **Today binoculars**: `needs-attention-section.tsx` AlertsEmptyState gets
  `Binoculars` icon + "Monitoring N source. Receiving correctly." copy.
- **PulseStatusBadge**: `SparklesIcon` → `Spotlight` to match the emphasis
  metaphor.
- **Drawer header dot removed** (PulsingDot): tone-helper imports aliased with
  `_` + eslint-disable so they stay reachable if status affordance comes back.
- **PulseAlertCard**:
  - Whole card clickable (`role="button"`, `tabIndex={0}`, Enter/Space →
    onReview, `aria-pressed={active}`)
  - Active card state: left accent border + `bg-state-accent-hover-alt`
  - `line-clamp-2` → `line-clamp-1` on summary (read more in drawer)
  - `PulseStatusBadge` promoted to header row
  - Action column collapsed from 3-button stack to kebab `DropdownMenu` with
    Snooze + Dismiss. Review button gone (article click is primary). Inner
    handlers all `stopPropagation`.
  - Confidence unified: always render numeric `PulseConfidenceBadge` (the
    destructive variant already maps to "low confidence" tone). Dropped the
    qualitative `LowConfidenceBadge` branch from the alerts list.
- **AffectedClientsTable** state chip rebuilt: SVG state badge + 2-letter code +
  full state name in a single framed pill (per Yuqi's second-image reference).
  Added `getJurisdictionName(code)` helper to `state-badge.tsx`. Client cell
  switched to `whitespace-normal` + `min-w-0` so long client names wrap instead
  of forcing horizontal scroll.
- **FactGrid 3-cols**: PulseStructuredFields FactGrid is unconditionally
  `grid-cols-3` (was responsive 1→2→3 cascade that collapsed to 1 col at
  drawer panel widths ~500px).
- **AlertsListPage**: panel mode adds `border-l` instead of `rounded-lg border`
  card frame; panel widths bumped (440/480/520 → 520/600/680). Left column
  drops `pr-1` gutter and gains `scrollbar-gutter: stable`.

### Commit 3 — `chore(ui): cross-page scrollbar de-nesting`

Audited 17 `overflow-y-auto` / `max-h-*` sites; flagged and removed 5 nested
scroll containers per Yuqi's "scrollbars are inside the page" feedback:

1. `PulseStructuredFields.tsx` — source excerpt `<pre>` lost `max-h-40
overflow-auto`. Drawer body scroll handles overflow now.
2. `Step2Mapping.tsx` — bad-rows table lost `max-h-[280px] overflow-y-auto`.
   Wizard body scroll owns the scroll.
3. `Step4Preview.tsx` — errors list lost `max-h-[320px] overflow-y-auto pr-1`.
4. `generation-preview-tab.tsx` — rollover preview rows lost `max-h-[420px]
overflow-y-auto`.
5. `obligations.tsx` (queue column) — dropped `xl:pr-1` gutter when detail
   panel open. Added `xl:[scrollbar-gutter:stable]` so layout doesn't shift.

Principle established: at most one scroll container per visual region. The
app-shell `<main>` is the canonical page scroll; drawers/dialogs/popovers may
own internal scroll for sticky-header patterns. Everything else flows.

### Commit 4 — `design(search): Phase 1 hygiene — primitive + Filter X + cmd+k honesty`

Cross-product UX audit found verb conflation ("search" used by page filters,
global palette, and column-filter typeaheads to mean three different things)
plus the cmd+k palette promising "Search or navigate…" while only delivering
navigation. Fixed without backend work:

- **`SearchInput` primitive** (`components/primitives/search-input.tsx`) gets
  optional `hotkey` + `hotkeyMeta` props. When `hotkey="/"`, the primitive
  mounts a sub-component that wires `useAppHotkey` to focus the input and
  renders a kbd hint chip on the right when empty.
- Exported `ShortcutCategory` / `ShortcutScope` / `AppHotkeyMeta` types from
  the keyboard-shell index for consumer use.
- Page-level placeholders renamed verb "Search X" → "Filter X" (filter
  narrows current list; doesn't search globally):
  - `/rules/library` → "Filter rules…" + `hotkey="/"`
  - `/rules` coverage tab → "Filter jurisdictions or rules…" + `hotkey="/"`
  - `/deadlines` → "Filter clients" + collapsed-icon aria-label
- **Coverage tab** local `SearchInput` shadow (drifted: size-3.5 icon, pl-8,
  `type="search"`) killed. Now wraps the primitive.
- **Deadlines `ObligationQueueSearchControl`** expanded state uses the
  primitive. Collapsed-icon pattern preserved (Yuqi #2 intentional toolbar
  density). Bespoke clear button + Escape handler dropped.
- **CommandPalette** placeholder "Search or navigate…" → "Navigate…"
  Description "Search or navigate." → "Navigate." Removes the
  discoverability lie. Phase 2 will restore "Search clients, deadlines,
  rules…" when the entity-search RPC lands.

### Commit 5 — `design(deadlines): redesign foundation + lucide stage icons + drawer body padding`

Foundation for the broader `/deadlines` redesign that's being implemented in a
parallel chip task. This commit ships the scaffolding so the chip's work
applies cleanly on top.

- **PageHeader subtitle**: derives `lateCount` + `dueThisWeekCount` from
  loaded rows. Renders "N late · M due this week" — destructive tone for
  late, secondary for this week. Empty state hides.
- **Group-by Select**: new `?group=due|client|status` URL param (default
  `due`). Select trigger in toolbar between row count and Columns dropdown.
  The actual section-header rendering when group !== 'due' is the spawned
  chip's job; this commit lands the URL state + UI control.
- **Footer count**: "N deadlines · M clients" (distinct `clientId` count
  added to footer).
- **PathToFilingSummary stage icons**: replaced generic check / dot / ring
  with stage-identity lucide icons (`CircleDashed` for pending, `Clock` for
  Waiting, `Lock` for Blocked, `Eye` for In review, `FileCheck2` for Filed,
  `CheckCircle2Icon` for Completed). State (done/active/skipped/upcoming)
  encoded via tone (bg + text + ring color). Filed-active vs
  Completed-upcoming now visually distinct by both icon identity AND tone.
- **Drawer body padding restructure**: dropped the `pt-4` on the drawer body
  - the `-mt-4` chrome-cancelling-chrome on the sticky strip. Strip now
    sits flush at body top, picks up a `border-b` separator, and the area
    below has its own real `pt-4`.
- **Title gets row count**: "Deadlines · N" — matches `/clients` and
  `/rules/library` patterns.
- **Larger client name** in queue cell (`text-sm` → `text-base` +
  `leading-tight`).
- **Ghost Columns button** (was `variant="outline"` — too loud next to the
  row count).
- **Internal Due header font unified**: `tableHeaderFilterTrigger` (used by
  the Client column header) dropped explicit `tracking-wider` so it inherits
  the canonical `tracking-[0.08em]` from the parent `<th>`. Letter-spacing
  now matches the `ObligationQueueSortableHeader` columns.
- **Pagination always visible**: dropped the `totalLoadedPages > 1 ||
hasNextPage` condition. Now renders at all times when rows > 0, with
  arrows disabled at first/last page.
- **Bulk action bar** gets Snooze button — disabled with "Coming soon"
  tooltip until bulk-snooze RPC lands.
- **Sort chevron honest**: unsorted columns now render a faint
  `ChevronsUpDown` at `text-text-tertiary/40` (hover → tertiary) so the
  "this column is sortable" affordance is permanently visible. Sorted
  columns still render directional `ChevronUp` / `ChevronDown` in accent.

## Out of scope for this batch

These workstreams are queued as parallel chip tasks (separate sessions):

- **Search Phase 2 aggressive**: pg_trgm migration, `orpc.search.entities`
  RPC, CommandPalette refactor with entity result groups, sidebar header
  search pill. Touches backend + new migration.
- **Deadlines page UI/UX refinements (merged)**: covers (a) Drawer rework
  (4 items: ActiveStageDetailCard/Materials dedup, checklist row frame +
  lucide state icons, drawer prev/next deadline navigation, queue footer
  outside frame), (b) Group-by section header rendering with aggregates,
  (c) full Figma Make prototype port (4-stage stepper collapsed to
  progress bar, dynamic sub-steps with real mutations, People + Activity
  log sections, materials per-item actions + grouping + persistence,
  extension hydration + validation, Evidence tab content, toast system,
  global keyboard nav).

## Verification

- `pnpm exec vp check` — clean (lint + types green) after every commit.
- 22 files modified; +~1062 / -~334.
- All Lingui strings use `Trans` / `t\`…\`` macros.
- No new tests added — these are pure UX refinements on existing surfaces.

## Follow-ups (not in this batch)

- `/clients` and `/rules/pulse` still lack page-level filter inputs (listed
  in PRD §12.1 as pending Phase 1 mechanical work).
- `/` hotkey wiring on additional Pattern-1 surfaces beyond the current
  `/rules/library`, `/rules`, `/deadlines`.
- `Last updated` in footer / drawer wired to a real `activityLog`
  (currently the hardcoded timestamp is left in place pending the broader
  drawer refactor).
