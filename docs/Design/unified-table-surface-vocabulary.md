# Unified table-surface vocabulary — Obligations / Rules / Clients

**Date:** 2026-05-22 (plan written) · **Target start:** 2026-05-23 (shipping in the same multi-day push as the Panel V2 plan)
**Author:** Yuqi pairing with Claude
**Status:** Plan. Pairs with `obligation-panel-v2-and-alerts-vocabulary.md`.

---

## Why this doc exists

Yuqi flagged it directly: _"Current client design is far from [Obligations and Rule Library]. Don't be lazy. Please condense the Obligation and Rule Library design styles, unify them and ensure consistency, and then make client view in their style as well."_

Deadlines queue (`/deadlines`) and Rule Library V3 (`/rules/library`) were built within ~10 days of each other and share most patterns — but not all. Clients list (`/clients`) and Client detail (`/clients/:id`) were the FIRST big surfaces built in this app and are visibly an older generation. The work below has two phases:

1. **Condense** the agreed patterns from Obligations + Rules into a single named vocabulary.
2. **Apply** that vocabulary to Clients list + Client detail, with explicit deviations only where a different IA need (detail vs. queue) requires them.

This doc is a spec. The companion code lands tomorrow in `apps/app/src/features/_surface-vocabulary/` (a tiny new module of shared primitives the three surfaces will import from).

---

## Part 1 — The unified vocabulary

Each rule below is enforced. Where Obligations + Rules disagreed, the executive decision is called out in **DECISION:** lines so future-me knows why.

### V1. Page shell

- **Outer container:** `<div className="flex flex-col gap-6 p-4 md:p-6">`. No card wrapper. No max-width on the table-bearing route (full-width up to viewport). Side margins are page padding only.
- **Title position:** always inside `<PageHeader>`. Never duplicated below.
- **Routes that own a detail panel** (queue, client detail) split the content row into `flex-1` left + `xl:w-[480px] xl:shrink-0` right when an obligation is selected. Below `xl` (1280px), the panel mounts as a Sheet, not inline.

### V2. PageHeader

- **One `<PageHeader>` per route.** No nested headers. No "subheader" rows.
- **Title:** route-level noun (`Obligations`, `Rule library`, `Clients`, `<ClientName>`).
- **Description:** optional, single line, `text-text-secondary text-sm`. Used by Rule library (`"Every filing obligation the practice tracks…"`) and Client detail (`"<entity> · <jurisdictions> · <filing dates>"`). Not used by Obligations or Clients list (both have summary strips below that carry the context).
- **Actions cluster:** right-aligned, max 3 visible buttons. The 4th+ collapses into a `…` kebab. Order: secondary outline buttons → primary filled button. Example: `[Audit log] [Import clients] [Create client]`.
- **Breadcrumbs:** only on detail routes (Client detail). Format: `<switcher-popover> / <entity-name>` with prev/next arrows in the `actions` slot. Already implemented on Client detail.

### V3. Summary strip (under PageHeader, above filters)

Three of the four surfaces already render something here; the shapes diverged. This is the most visible inconsistency. Resolution:

- **One canonical component** — `<SurfaceSummaryStrip>` — lives in the new `_surface-vocabulary/` module and renders a single-line horizontal strip with `label · number unit · number unit · …` shape. Visually identical to hanxujiang's `SummaryStrip` (kept as the design reference, not the implementation — V3's `StatsBar` is richer).
- **DECISION: One row, not a tile grid.** Obligations uses scope tabs that double as a stats strip. Rules uses `StatsBar` (one row of counts + entity-filter chips). Clients uses `ClientsActionStrip` (3-tile grid). The 3-tile grid is the odd one out — replace with the one-line strip.
- **Each strip slot is a number + label + optional click-to-filter.** Filtering numbers should drive the column-header filters below (don't introduce a parallel filter state).
- **Empty state of the strip:** renders the label row with `—` placeholders during load. When all counts are zero, renders a single muted line ("All caught up for today") rather than 0-0-0.

| Surface          | Strip contents                                                                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/deadlines`     | `Queue · N due this week · N waiting on client · N blocked · N filed this month` — replaces the current scope-tab row, OR sits ABOVE the scope tabs (TBD by paint test).         |
| `/rules/library` | `Coverage · N active · N needs review · N jurisdictions with gaps` (this is already there from V3 — keep, just rename component to the shared one).                              |
| `/clients`       | `Clients · N at risk · N waiting on client · N with Pulse hits · N missing facts` — replaces `ClientsActionStrip` tile grid.                                                     |
| `/clients/:id`   | Still uses `ClientSummaryStrip` (a different shape, per-obligation) for the in-detail roll-up — that one is the right design for detail mode. Confirm by visual review tomorrow. |

### V4. Filter UI

- **DECISION: Column-header filters only.** Rules' "entity chip row above the table" was a 2026-05-21 experiment and lost ground to Obligations' column-header pattern (already adopted on Clients per task #27). Rules library keeps its grouping toggles (chevrons on jurisdiction headers) because those are _grouping_, not _filtering_. The entity chip row becomes a horizontal filter inside a single column-header popover on Rules.
- **Filter component:** `<TableHeaderMultiFilter>` (already exists, used by Obligations + Clients). Trigger: header cell becomes clickable, opens a Popover + Command (searchable, multi-select).
- **No floating chip row showing applied filters.** Already the agreed direction (task #27). The active-state visual on the column header (e.g. accent dot on the header label) is enough.
- **Saved views:** dropped from Obligations during the merge. Don't reintroduce.

### V5. Search input

- **Single text input** above the table on the LEFT, max-w-md.
- **Hotkey `/` to focus, ESC to clear.** Both already wired on Obligations. Propagate to `/clients` and `/rules/library` if not present.
- **Right-gutter hint:** the small `Press / to focus` kbd label, only when input is empty + not focused.
- **No search on detail routes** (Client detail's work-plan table). Detail tables are pre-filtered.

### V6. Table style

| Property               | Rule                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Wrapper                | No `<Card>`. Naked `<Table>` directly in the page flex column.                                                                          |
| Header background      | `bg-background-subtle`                                                                                                                  |
| Header typography      | `text-xs font-medium uppercase tracking-[0.08em] text-text-tertiary`                                                                    |
| Header cell padding    | `!px-2` (overrides default to tighten)                                                                                                  |
| Header sort affordance | `aria-sort` + a small chevron when active                                                                                               |
| Row height             | `h-9` (compact) by default. Density toggle on `/deadlines` lets users opt into `h-12` (comfortable). The other two surfaces stay `h-9`. |
| Row cell padding       | `!px-2 !py-2 !align-middle`                                                                                                             |
| Row hover              | `hover:bg-state-base-hover`                                                                                                             |
| Row click              | Whole row clickable when an obligation/rule/client opens a detail. Stop propagation on interactive cells (buttons, checkboxes, links).  |
| Borders                | Bottom border between rows only. No outer table border.                                                                                 |
| Long content           | `whitespace-normal` + `break-words` so client names and form codes can wrap rather than horizontal-scroll.                              |

### V7. Status indicator

- **Pill component:** `<ObligationStatusBadge>` (or per-domain equivalent). Uses `BadgeStatusDot` + label. Tokenized colors per `obligation-lifecycle-design-brief.md`'s 6-state palette.
- **Where it lives:** dedicated column. Never inline with the entity name. Exception: Rules library, where status is the GROUP HEADER and rule rows omit a status column entirely (grouping conveys it).
- **Severity / risk badges** (currently `BlockedByChip`, `RejectionChip`): always render BELOW the status pill in the same cell, never beside (vertical stack keeps the cell narrow).

### V8. Bulk action toolbar

- **Floating bottom-anchored** when ≥1 row selected. `fixed bottom-10 left-1/2 -translate-x-1/2 z-40`. Same shape on Obligations and Rules.
- **One primary CTA** (e.g. "Review N obligations →") + secondary actions behind a `…` kebab (assign, status, export, clear).
- **Already specced separately** in the Panel V2 plan — this section just enforces the visual.
- **Surfaces this applies to:** `/deadlines` (already done), `/rules/library` (already done). Not on `/clients` (read-only list).

### V9. Detail panel mount

- **Right-side inline panel** (`xl:w-[480px] xl:shrink-0`) when the route OWNS the panel context. `/deadlines` and `/clients/:id` own. Off-route callers (dashboard, client peek) route through `ObligationDrawerProvider` which navigates to the canonical owner.
- **Centered Dialog modal** only for _reference content_ — Rule library's rule-detail modal stays a modal because the user is reading, not working. Workspaces use right-panel; references use modal.
- **Below `xl` breakpoint:** right-panel collapses to a Sheet (already implemented).

### V10. Stats / counts

- **Tabular numbers everywhere** (`tabular-nums`) for any count or money figure.
- **Loading state:** Skeleton bars at the count positions, not "—".
- **Zero state:** render `0` (not blank). Muted color (`text-text-muted`) when the metric is zero.

### V11. Empty state

- **Component:** `<SharedEmptyState>` (already used by Obligations + Clients).
- **Shape:** centered icon (lucide, `size-12`, `text-text-tertiary`), `text-base font-medium` headline, `text-sm text-text-secondary` description, single primary CTA.
- **No illustration.** No clip-art. The icon is enough.

### V12. Loading state

- **Skeleton rows** matching the table's row height (5 by default, 3 on narrow detail tables). `<Skeleton className="h-9 w-full" />` per row.
- **Stats strip / summary strip** uses skeleton numerals (`h-4 w-16`) not spinners.
- **Page-level spinner:** never. We always render something — header + summary + skeleton table.

### V13. Cross-surface peek

- **Eye icon** in the cell representing the FOREIGN entity (a client cell on an obligations row, an obligation cell on a client row).
- Hover-revealed (`opacity-0 group-hover:opacity-100`). `⌘-click` also opens the peek for power users.
- Routes to `<EntityDrawer>` (read-only) not the full page.
- **Already wired on Obligations queue + Clients list.** Just enforce the same icon size + transition timing across both.

### V14. Tabs vs sections

- **DECISION: Sections-not-tabs in detail surfaces.** Obligations panel V2 (specced separately) drops tabs. Client detail currently uses Tabs (Work / Activity). Convert to vertical sections with collapsible headers — each section keeps its own collapsed state in URL (`?activity=open`).
- **Tabs are still allowed in:** rule detail modal (each tab is a distinct dataset), and the obligation creation dialog (entity setup steps).

### V15. Footer / row chrome

- **Routes don't have footers.** No "save" bar at the bottom. Changes commit per-row.
- **Panel footers** light: `Copy link · Close`. No gradients.

---

## Part 2 — Diffs against current `/clients` (list)

What the audit found vs. what V1–V15 mandates:

| Rule             | Current `/clients` (via `ClientFactsWorkspace`)                               | Action                                                                                                                                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1 page shell    | ✅ matches (`flex flex-col gap-6 p-4 md:p-6`)                                 | none                                                                                                                                                                                                                                     |
| V2 PageHeader    | ✅ title + actions cluster                                                    | none                                                                                                                                                                                                                                     |
| V3 summary strip | ❌ tile grid (`ClientsActionStrip` — 3 tiles) + separate "Needs facts" banner | Replace with `<SurfaceSummaryStrip>` one-liner: `Clients · N at risk · N waiting on client · N Pulse hits · N missing facts`. Drop tiles. Keep the banner ONLY for blocking issues (e.g. "Pulse alert needs review") not roll-up counts. |
| V4 filters       | ✅ column-header filters (already migrated, task #26/27)                      | none                                                                                                                                                                                                                                     |
| V5 search        | ❌ no `/` hotkey, search placement unknown                                    | Audit, add hotkey + kbd hint to match Obligations                                                                                                                                                                                        |
| V6 table         | ✅ mostly — confirm header background + row height match                      | Spot-check `h-9` vs current.                                                                                                                                                                                                             |
| V7 status        | ✅ inline `<ObligationStatusBadge>` per row                                   | none                                                                                                                                                                                                                                     |
| V8 bulk toolbar  | N/A (read-only list)                                                          | none                                                                                                                                                                                                                                     |
| V9 detail panel  | ✅ routes to detail page, panel mounts there                                  | none                                                                                                                                                                                                                                     |
| V10 tabular nums | unknown — confirm count cells use `tabular-nums`                              | Sweep, add class                                                                                                                                                                                                                         |
| V11 empty state  | ✅ `<EmptyState>` already wired                                               | none                                                                                                                                                                                                                                     |
| V12 loading      | ✅ `ClientTableSkeleton` already wired                                        | confirm row count + height match                                                                                                                                                                                                         |
| V13 peek         | ✅ Eye icon on row                                                            | confirm icon size + transition match Obligations                                                                                                                                                                                         |
| V14 tabs         | N/A (list, not detail)                                                        | none                                                                                                                                                                                                                                     |
| V15 footer       | N/A                                                                           | none                                                                                                                                                                                                                                     |

**Real changes:** drop the tile grid + the always-on Needs-facts banner. Replace with one summary strip. Add `/` search hotkey. Visual sweep for `tabular-nums` + peek icon timing.

---

## Part 3 — Diffs against current `/clients/:id` (detail)

This is where the bigger gap lives.

| Rule             | Current `ClientFactsWorkspace`                                                                                                                                       | Action                                                                                                                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1 page shell    | ✅ when panel closed; with panel `xl:flex-row` 2-col already wired                                                                                                   | none                                                                                                                                                                                                                                                |
| V2 PageHeader    | ✅ breadcrumb switcher + cycle arrows + actions                                                                                                                      | none                                                                                                                                                                                                                                                |
| V3 summary strip | partial — uses `ClientSummaryStrip` which is per-obligation roll-up; that's the RIGHT pattern for detail                                                             | confirm visual style matches the strip component used elsewhere                                                                                                                                                                                     |
| V4 filters       | ✅ column-header filters on the work-plan table                                                                                                                      | none                                                                                                                                                                                                                                                |
| V5 search        | N/A in detail (table is pre-filtered to one client)                                                                                                                  | none                                                                                                                                                                                                                                                |
| V6 table         | partially matching — uses `<Card>`? Or naked? Audit said cells used `bg-background-subtle` headers + `hover:bg-state-base-hover` rows so probably already conforming | confirm no Card wrapper, confirm row heights                                                                                                                                                                                                        |
| V7 status        | ✅ inline `<ObligationStatusBadge>`                                                                                                                                  | none                                                                                                                                                                                                                                                |
| V8 bulk toolbar  | N/A (no bulk on per-client view)                                                                                                                                     | none                                                                                                                                                                                                                                                |
| V9 detail panel  | ✅ right-side inline panel for the selected obligation                                                                                                               | none                                                                                                                                                                                                                                                |
| V10 tabular nums | unknown                                                                                                                                                              | sweep                                                                                                                                                                                                                                               |
| V11 empty state  | ✅ wired                                                                                                                                                             | none                                                                                                                                                                                                                                                |
| V12 loading      | ✅ wired                                                                                                                                                             | none                                                                                                                                                                                                                                                |
| V13 peek         | ✅ Eye on row to peek the obligation cross-surface                                                                                                                   | confirm                                                                                                                                                                                                                                             |
| **V14 tabs**     | ❌ **uses Tabs (`Work` / `Activity`)** + **Collapsibles** inside Work                                                                                                | Convert to vertical sections. Each former tab becomes an `<h2>` section divider with a collapsible header (URL-bound state). Work-tab sub-sections (WorkPlan → CompliancePosture → CONFIGURE → DISCOVER) stay as their own sub-sections under Work. |
| V15 footer       | ✅ no footer                                                                                                                                                         | none                                                                                                                                                                                                                                                |

**Real changes:** drop Tabs in favor of vertical sections (V14). Everything else is a visual sweep.

---

## Part 4 — New shared module: `apps/app/src/features/_surface-vocabulary/`

Tiny module with the primitives the three surfaces import from. Files:

- `SurfaceSummaryStrip.tsx` — the one-liner stats strip (V3)
- `SurfaceFilterChip.tsx` — currently `TableHeaderMultiFilter` lives elsewhere; consider re-exporting from here so the import path advertises "this is the canonical one"
- `index.ts` — re-exports
- `__tests__/` — visual smoke tests rendering each variant with mock data

Keeping it under an underscore-prefixed folder makes "this is a shared vocabulary module, not a feature" obvious in the file tree.

---

## Part 5 — Build sequence (chronological)

Estimated ~5 hrs spread across the day after the Panel V2 + Alerts day.

### Step 1 — Build `<SurfaceSummaryStrip>` (~45 min)

- New file in `_surface-vocabulary/`
- Props: `label: string`, `items: { value: number; label: string; tone?: 'default'|'warning'|'muted'; onClick?: () => void; href?: string }[]`, `loading: boolean`, `detailHref?: string`, `detailLabel?: string`
- Visual match to hanxujiang's `SummaryStrip` (which has been deleted but the design intent stands)
- Unit test with mock items

### Step 2 — Apply to `/rules/library` (~30 min)

- Replace V3's bespoke `StatsBar` component with `<SurfaceSummaryStrip>`
- Move the entity-filter chip row into a column-header popover (V4)
- Visual diff check at 1024px and 1440px

### Step 3 — Apply to `/clients` list (~1 hr)

- Replace `ClientsActionStrip` 3-tile grid with `<SurfaceSummaryStrip>` (V3)
- Move "Needs facts" banner from always-on to only-when-blocking (when `needsFactsCount > 0` AND user hasn't dismissed)
- Add `/` search hotkey + kbd hint (V5)
- Visual sweep for `tabular-nums` on count cells (V10)
- Confirm peek-icon timing matches Obligations (V13)

### Step 4 — Apply to `/deadlines` (~45 min)

**Decision (2026-05-22): deferred to a follow-up.**

Reason: the scope tabs already encode per-status counts. Stacking a
strip with the SAME counts (waiting / blocked / in_review) above them
is design noise — the user reads the same data twice. The plan's
"stacked" recommendation only works when the strip carries
**different** metrics (e.g. "due this week", "filed this month",
"overdue"). Those aren't in `statusFacetCounts` today; they need a new
server-side aggregate.

When picked back up, the strip should show date-range metrics
(orthogonal to status) and leave the scope tabs as the status-slice
filter. Until then, scope tabs remain the single source of count
truth on this surface.

- Decide: replace scope tabs with summary strip, OR keep both stacked
  - Recommendation: **stacked**. Strip carries the "what's the state of the queue" read; scope tabs carry the active-filter scope. They're different jobs.
- Implement whichever
- Visual diff at common widths

### Step 5 — Convert Client detail Tabs → Sections (~1.5 hrs)

- This is the meatiest piece
- `ClientFactsWorkspace.tsx` — replace `<Tabs value=...>` with sequential `<section>` blocks
- URL state: `?work=open&activity=open` (default both open on first visit, persist per-client thereafter via localStorage)
- Each section header: `<h2 className="text-base font-medium">` + chevron toggle + collapse state
- Keep the inner WorkPlan → CompliancePosture → CONFIGURE → DISCOVER sub-section structure inside the Work section
- Activity stays lazy-loaded behind "Show activity" link (already specced in the Panel V2 doc)

### Step 6 — Cleanup + dev-log (~30 min)

- Delete `ClientsActionStrip` if no other importers
- Run typecheck
- Lingui extract
- New dev-log: `docs/dev-log/2026-05-24-unified-surface-vocabulary.md`
- Update this doc with "Shipped" status header

---

## Part 6 — Open questions / risks

1. **Summary strip vs. scope tabs on `/deadlines`** — stacked or replace? Defer to paint-test tomorrow.
2. **Where does the Needs-facts banner go on `/clients`?** If we drop the always-on tile, but the banner is only conditional, the user might miss "5 clients are missing facts" until they happen to hit a row. Counterargument: the summary strip already shows `N missing facts` as a clickable filter. That's the discoverability path.
3. **Client detail Tabs → Sections might break deep-linking.** Audit which `?tab=` URLs exist (in dev-logs, comments, etc.) and add a normalize-and-redirect helper similar to `normalizeRulesLibrarySearch`.
4. **`_surface-vocabulary/` folder name** — underscore-prefixed says "shared, not feature-owned." Alternative: `features/shared/surface/`. Decision: `_surface-vocabulary` because it's unmistakable in the file tree. Open to renaming.

---

## Part 7 — Out of scope (deferred)

- Migrating the Rule library detail modal to a right-side panel (V9 allows reference content to stay modal — keep it)
- Re-themeing colors / warm-retro palette (separate design pass)
- Replacing the `Tabs` component itself in shared UI (`@duedatehq/ui`) — only converting USAGES on `/clients/:id`
- Audit log surface alignment — touched separately in `audit-log-surface-requirements.md`
- Mobile-first responsive sweep — desktop-first for now

---

## Companion docs

- `docs/Design/obligation-panel-v2-and-alerts-vocabulary.md` — the right-panel redesign + Alert vocab
- `docs/Design/pulse-vocabulary.md` — engine-name vocabulary (will be updated for engine-vs-surface split)
- `docs/Design/obligation-drawer-ux-audit-2026-05-21.md` — original drawer audit
- `docs/Design/client-page-information-architecture.md` — earlier Client detail IA decisions (this doc supersedes the Tabs guidance there)
- `docs/Design/obligation-lifecycle-design-brief.md` — the 6-state status palette V7 references
