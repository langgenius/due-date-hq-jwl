# Search strategy — page-level filter + global entity search

**Date**: 2026-05-26
**Author**: Yuqi (design) + Claude (research / scaffolding)
**Status**: Phase 1 shipped, Phase 2 needs engineering

---

## Why this doc exists

A cross-product UX audit found three search-shaped problems:

1. **Two patterns overlap.** The page-level search bars on `/rules/library`, `/rules`, and `/deadlines` and the `cmd+k` palette were both calling themselves "Search," but they did different things. Users couldn't tell which to use when.
2. **The cmd+k palette lies.** Its placeholder reads "Search or navigate…" but only navigates — typing "Wong & Wong" returns "No commands found." Discoverability lie.
3. **Drift in implementation.** Three page-level search bars all hand-rolled their own input chrome (different heights, icon sizes, clear behaviors).

This doc captures the product decision, the Phase 1 hygiene shipped on 2026-05-26, and the Phase 2 spec engineering can pick up.

---

## Product decision

**Two patterns, two verbs, two intents — no overlap.**

| Pattern           | Verb       | Mental model                             | Scope                                                         | Action              | Surface                                   |
| ----------------- | ---------- | ---------------------------------------- | ------------------------------------------------------------- | ------------------- | ----------------------------------------- |
| **Page filter**   | **Filter** | "Narrow the list I'm looking at"         | Current page's data                                           | Stays on page       | In-page toolbar input + `/` hotkey        |
| **Global search** | **Search** | "Find an entity anywhere, take me to it" | Whole product (clients · deadlines · rules · alerts · owners) | Navigates to result | `cmd+k` palette + persistent sidebar pill |

The two intents are different jobs. Conflating them is the source of every search complaint we have.

### Rejected alternatives

- **"Only page filter, no global search."** Would force users to navigate-then-filter for every cross-entity lookup. Closes the door on AI / conversational query. Reads dated.
- **"Only global search, no page filter."** Would lose precision (typing on `/clients` returning deadlines is wrong). Loses composability with existing column filters.
- **Status quo (today's broken both).** Two surfaces both lying about what they do.

---

## Phase 1 (shipped 2026-05-26)

Hygiene + honesty for the page-level pattern. No new backend.

### Done

1. **`SearchInput` primitive unified** — all page-level searches share one chrome: `h-9`, `SearchIcon` at `left-2.5`, inline `X` clear, Escape-to-clear, placeholder `text-secondary`. Optional `hotkey` prop wires a focus shortcut + renders a kbd hint chip.
2. **Placeholders renamed `Search X` → `Filter X`** on:
   - `/rules/library` → "Filter rules…"
   - `/rules` coverage → "Filter jurisdictions or rules…"
   - `/deadlines` → "Filter deadlines" (was "Filter clients" — narrowed view of the input's reach; updated in step-8 audit so collapsed magnifier aria-label, placeholder, and expanded aria-label all match)
3. **`/` hotkey via the primitive** — opt-in `hotkey="/"` prop. Wired on rule library, coverage, **clients (step-8)**, and **audit log (step-8)**. Deadlines retains route-level wiring (its collapsible-icon pattern needs custom focus logic before the input mounts).
4. **cmd+k placeholder honest** — "Search or navigate…" → "Navigate…" Description "Search or navigate." → "Navigate." No more discoverability lie.
5. **Coverage tab local `SearchInput` killed** — was shadowing the primitive name with drifted chrome (size-3.5 icon, pl-8, `type="search"` causing double clear buttons). Now wraps the primitive.
6. **Deadlines `ObligationQueueSearchControl` modernized** — collapsible-icon pattern preserved (Yuqi's intentional toolbar-density call), but the expanded input now uses the primitive.
7. **`/clients` migrated to canonical SearchInput** (2026-05-26 step-8 audit, F-X02 + F-X03) — the directory's hand-rolled `<Input type="search" h-8>` block + raw `addEventListener` `/` hotkey are gone. The shortcut now registers in the keyboard-help dialog under a new `clients` ShortcutCategory.
8. **`/audit` SearchInput shipped** (2026-05-26 step-8 audit, F-X06) — the long-dormant `q` URL parser is now driven by a real input. Filter runs client-side over the loaded event window (actor label, actor id, entity id, entity type, action, reason) until the backend supports a `q` field on `audit.list`.
9. **"Reset" → "Clear filters"** across `/clients`, `/audit`, and the coverage-tab ActiveFilterChip (the latter also gained Lingui localization).
10. **`/deadlines` `/` hotkey help-label normalized** — was "Focus search", now "Filter deadlines" to match the verb-discipline established in /rules/library + coverage tab.

### Still pending in Phase 1

| Item                                                  | Surface                                                                           | Effort          | Owner |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- | --------------- | ----- |
| URL-sync alerts filters via nuqs                      | `/rules/pulse` — five `useState` filters → `useQueryStates` so share-links work   | 4-5 hr frontend | TBD   |
| Add page filter to `/rules/pulse` (Alerts)            | New SearchInput above the alert list, filters by title / source / affected client | 2-3 hr frontend | TBD   |
| Notifications inbox find affordance                   | `/notifications` — read/unread tabs + cursor pagination + optional search         | 1-2 day         | TBD   |
| Add kbd hint chip on `/deadlines` collapsed magnifier | Surface the `/` discoverability on the densest list page                          | 1 hr design     | TBD   |
| Multi-entity URL param on `/rules/library`            | `entity` parser → `parseAsArrayOf(parseAsStringLiteral(...))`                     | 2 hr frontend   | TBD   |

These are mechanical (where backend isn't involved) — copy the SearchInput primitive pattern from `/rules/library`, wire it to the existing filter state machinery on each page. The Alerts surface needs nuqs migration first so the new search has a place to land in the URL.

---

## Phase 2 — Global entity search

Real entity search inside the cmd+k palette + a persistent sidebar pill.

**Status: needs engineering to scope and staff.** Below is the design spec to make that scoping fast.

### User stories

1. As a CPA on any page, I press `cmd+k`, type "Wong", and see Wong & Wong (client) + Wong's 1065 (deadline) + the 2 CA wildfire alerts affecting Wong — grouped. Selecting any result navigates me there.
2. As a CPA on Today, I notice the sidebar header has a persistent "Search clients, deadlines, rules…" pill. I click it (or press `cmd+k`) — same palette opens.
3. As a manager, my search results respect permissions: an owner-only audit row doesn't appear for a preparer's search.
4. As a CPA, when I find Wong via cmd+k and then go back, my recent searches are remembered so I can re-find him in one step.

### Result surface

```
┌─ ⌘K palette ─────────────────────────┐
│ 🔍 Search clients, deadlines, ...   │
├───────────────────────────────────────┤
│ CLIENTS                              │
│ ▸ Wong & Wong LLC      [partnership] │
│ ▸ Wong Family Trust    [individual]  │
│                                      │
│ DEADLINES                            │
│ ▸ Wong & Wong 1065      Due Mar 15  │
│ ▸ Wong Family 1040      Due Apr 15  │
│                                      │
│ ALERTS                               │
│ ▸ CA wildfire relief    affects Wong │
│                                      │
│ NAVIGATE                             │
│ ▸ Today                          ⌘1 │
│ ▸ Deadlines                      ⌘2 │
│ ▸ Settings                       ⌘, │
└───────────────────────────────────────┘
```

- Top groups: real entities (queried).
- Bottom group: existing nav/action entries (the palette today).
- Each result row: icon · primary label · contextual metadata · keyboard shortcut hint.
- Selecting navigates to the entity's detail page or drawer.

### Sidebar pill

A persistent pill in the sidebar header, sized like an Input but acting as a button. Renders kbd hint `⌘K` on the right. Click or `cmd+k` opens the palette. Collapses to the SearchIcon alone in sidebar `data-collapsed` mode (matches the existing collapse rhythm).

```
┌─ Sidebar ─────────┐
│ ╔═══════════════╗ │
│ ║ 🔍 Search...⌘K║ │  ← persistent pill (new)
│ ╚═══════════════╝ │
│                   │
│ ◉ Today           │
│ ⊕ Deadlines    12 │
│ ⚡ Alerts        2 │
│ ⊞ Rule library    │
│ …                 │
└───────────────────┘
```

### API contract

New RPC: `orpc.search.entities`

```ts
input: {
  query: string             // trimmed; empty returns []
  limit?: number            // default 8 per group, 40 total
  groups?: SearchGroupKey[] // default all; allow caller to scope
}

output: {
  groups: Array<{
    key: 'clients' | 'deadlines' | 'rules' | 'alerts' | 'owners'
    label: string           // localized; "Clients" etc
    results: Array<{
      id: string            // entity id
      label: string         // primary display string
      sublabel?: string     // metadata line
      icon?: string         // icon key (server-side neutral)
      href: string          // target navigation path
      score: number         // 0-1, ranking
      contextChips?: Array<{ tone: 'neutral' | 'warning' | 'critical'; label: string }>
    }>
    hasMore: boolean        // true if results truncated to limit
  }>
  queryMs: number           // server-side timing for telemetry
}
```

### Backend infrastructure decision

**Recommendation: Postgres `pg_trgm` (trigram similarity) + a thin ranking layer.**

Trade-off vs alternatives:

| Option                           | Setup        | Quality                                                  | Maintenance                 | Cost          |
| -------------------------------- | ------------ | -------------------------------------------------------- | --------------------------- | ------------- |
| Postgres `pg_trgm` + GIN indexes | 1-2 days     | Good for our scale (200 clients × 5K deadlines per firm) | Free, in-DB                 | $0            |
| Postgres FTS (`tsvector`)        | 2-3 days     | Better for natural-language phrases                      | Free, in-DB                 | $0            |
| Meilisearch                      | 1 week + ops | Excellent                                                | Separate service to monitor | self-host     |
| Algolia                          | 2 days       | Excellent                                                | Vendor-managed              | $$$ + lock-in |

Start with `pg_trgm` — single firm has at most ~10K searchable rows, trigram similarity is fast at this scale, no new infrastructure to operate. Revisit if we onboard >2K-client enterprise firms.

### Indexed fields per entity

| Entity   | Primary                            | Secondary (weighted lower)               |
| -------- | ---------------------------------- | ---------------------------------------- |
| Client   | `name`, `display_name`             | `entity_type`, `state`, owner first name |
| Deadline | client name, form name, `tax_type` | jurisdiction, year, status               |
| Rule     | jurisdiction + form + entity name  | rule kind, status                        |
| Alert    | title                              | source name, affected client names       |
| Owner    | `first_name + last_name`, `email`  | role                                     |

### Ranking heuristic (v1, no ML)

```
score = (
  trigram_similarity(query, primary_field) * 1.0
+ trigram_similarity(query, secondary_field) * 0.5
+ recency_boost                                * 0.2    // entities touched in last 7d
+ owner_affinity_boost                         * 0.15   // current user owns / assigned
+ exact_prefix_match                           * 0.3    // primary starts with query
)
```

Tune weights per group via A/B once we have search logs.

### Permissions

Each entity type has its own permission filter:

- **Clients**: only the user's firm; preparers only see clients they own or are assigned to
- **Deadlines**: piggybacks on client permissions + the user's role
- **Rules**: visible to all firm members
- **Alerts**: visible to user if their role has `pulse.view` (today: owners + managers)
- **Owners**: visible to all firm members

Apply at the SQL level, not in a post-filter — never load forbidden rows into memory.

### Frontend architecture

1. **CommandPalette refactor**:
   - Add a `useQuery` against `orpc.search.entities` debounced 200ms after each keystroke
   - When the user is typing, render the entity groups above the existing nav/action groups
   - When the input is empty, hide entity groups and show only nav/actions (palette's current behavior)
   - Each entity item's `onSelect` navigates to its `href` via the router
2. **Sidebar pill**:
   - New component in `app-shell-nav.tsx` placed above the nav rail
   - Renders as a button styled like SearchInput; opens the palette on click
   - Respects `data-collapsed` mode (icon-only)
3. **Recents**:
   - localStorage-backed `recentSearches: string[]` (max 5)
   - Show below the input when palette opens with empty query
4. **Telemetry**:
   - Log `{query, queryMs, resultsCount, selectedGroup, selectedRank}` per search
   - Build a weekly dashboard of "most-searched, lowest-resolved" to tune ranking

### Phasing (within Phase 2)

| Step                                                                         | Effort                                  | Dependency            |
| ---------------------------------------------------------------------------- | --------------------------------------- | --------------------- |
| Backend: `pg_trgm` indexes + `orpc.search.entities` RPC for **clients only** | 1 week                                  | —                     |
| Frontend: CommandPalette wires to the RPC, shows clients group only          | 3 days                                  | RPC live              |
| Backend: add deadlines + rules + alerts + owners to the RPC                  | 1 week                                  | clients flow proven   |
| Frontend: sidebar pill                                                       | 2 days                                  | palette refactor done |
| Recents + telemetry                                                          | 3 days                                  | flow shipped          |
| **Total**                                                                    | **~4 weeks for 1 backend + 1 frontend** | —                     |

---

## Triggers for revisiting

When to step beyond this design:

- **Single-firm size >2K clients**: pg_trgm starts to struggle. Move to Postgres FTS or Meilisearch.
- **Cross-firm enterprise customers**: multi-tenant ranking gets harder; consider Algolia.
- **AI / conversational query lands**: the palette becomes the natural entry. Add a "Ask…" group with chat affordance.
- **Search latency complaints**: add result caching + speculative prefetch.

---

## What this strategy explicitly does NOT promise

- **Saved searches** — out of scope until user demand. Use URL params on filter pages instead.
- **Fuzzy semantic search** ("find clients similar to Wong") — that's AI scope, not this.
- **Cross-firm search** — single-firm only. Multi-firm users (rare) switch firms first.
- **Full-text search inside documents / evidence files** — separate problem, separate budget.

---

## Open questions for the team

1. **Backend choice locked at `pg_trgm`?** Engineering, please confirm before we start indexing.
2. **Sidebar pill always visible vs. only at xl+?** Affects sidebar collapse design.
3. **Result-click default: drawer vs. detail page?** For clients/deadlines we have both — preference for power users?
4. **Recents — localStorage or persisted server-side?** Persisted means cross-device, costs a tiny table.
