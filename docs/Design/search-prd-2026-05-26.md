# Search PRD — Page filter + Global entity search

**Date**: 2026-05-26
**Owner**: Yuqi (product/design)
**Status**: Phase 1 partial-shipped; Phase 2 needs eng staffing
**Supersedes**: `search-strategy-2026-05-26.md` (folded in)

---

## TL;DR

The product has two distinct search jobs that today are partially built and partially fake. This PRD locks them into two non-overlapping patterns:

- **Page filter** — narrows the visible list on a list page (clients / deadlines / rules / alerts). Verb: **Filter**.
- **Global search** — finds any entity anywhere and navigates to it. Verb: **Search**. Entered via `cmd+k` or a persistent sidebar pill.

Phase 1 (this PRD, partly shipped) cleans up page filters and removes the false "Search" promises in cmd+k. Phase 2 ships real entity search across all 5 entity types with `pg_trgm` indexes + a new RPC.

---

## 1. Goals & non-goals

### Goals

- **G1.** Two non-overlapping search patterns with clear verbs (Filter vs Search) and clear scopes.
- **G2.** A consistent visual primitive for every page filter input (`SearchInput`).
- **G3.** A single global entry point (`cmd+k` + sidebar pill) that actually returns entities, not just routes.
- **G4.** Every search affordance honest about what it delivers — no placeholder lies.
- **G5.** Permissions enforced per-entity at the SQL layer, never in a post-filter.
- **G6.** Sub-200ms perceived latency for global search on a 200-client firm.
- **G7.** Page filters work offline / on slow connections (client-side string match against already-loaded data).

### Non-goals (v1)

- **N1.** Full-text search inside evidence attachments or PDFs.
- **N2.** Cross-firm search (multi-firm users switch firm first).
- **N3.** Saved searches / pinned queries (URL params on filter pages cover this).
- **N4.** Semantic / fuzzy AI search ("clients similar to Wong").
- **N5.** Voice search.
- **N6.** Search inside the dashboard surface itself (Today is curated, not searchable).

---

## 2. Background & current state

### What exists today

| Surface                             | Mechanism                                                          | Verb claimed                                    | Verb delivered                                              | Verdict                     |
| ----------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------- | --------------------------- |
| `/rules/library` toolbar            | `SearchInput` primitive (h-9)                                      | "Search rules"                                  | Client-side filter of loaded rules                          | ❌ verb lies                |
| `/rules` coverage tab               | Local `SearchInput` shadow (h-9, size-3.5 icon, drifted)           | "Search jurisdictions or rules"                 | Client-side filter                                          | ❌ verb lies + chrome drift |
| `/deadlines` toolbar                | Collapsible `ObligationQueueSearchControl` (h-8 custom)            | "Search clients"                                | Client-side filter of deadlines by client name              | ❌ verb lies + chrome drift |
| `/clients`                          | Column-header filter popovers (`TableHeaderFilter` + CommandInput) | (no top-level)                                  | Per-column filtering                                        | ⚠ no top-level search       |
| `/rules/pulse`                      | Filter chips only                                                  | (no top-level)                                  | Filter by status / source / state                           | ⚠ no top-level search       |
| `cmd+k` palette                     | `CommandInput` inside `CommandDialog`                              | "Search or navigate"                            | Route list only — "Wong & Wong" returns "No commands found" | ❌ promises entity search   |
| ClientTitleSwitcher                 | `CommandInput` in popover                                          | "Search clients…"                               | Combobox-style client picker                                | ✅ honest                   |
| ClientCombobox                      | `CommandInput` in popover                                          | "Search clients…"                               | Combobox-style client picker                                | ✅ honest                   |
| timezone-select                     | `CommandInput`                                                     | "Search timezone…"                              | Combobox-style                                              | ✅ honest                   |
| `CreateObligationDialog` typeahead  | `CommandInput`                                                     | "Search deadline categories…" / "Search forms…" | Combobox-style typeahead                                    | ✅ honest                   |
| `TableHeaderFilter` column popovers | `CommandInput`                                                     | "Search clients/states/owners"                  | In-column filter                                            | ✅ honest                   |

### Three root problems

1. **Verb conflation.** Five surfaces all call themselves "search" but do three different things (filter list, jump entity, typeahead combobox). Users can't predict outcome.
2. **The cmd+k lie.** Discoverability promise unfulfilled. Every "No commands found" erodes trust.
3. **Implementation drift.** Three page-level "search" inputs all hand-rolled their own chrome.

### Stage check

| Signal                       | Value                               | Implication                                                     |
| ---------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| Single-firm client count     | 50–200 typical                      | `pg_trgm` is plenty; no need for Meilisearch/Algolia            |
| Single-CPA deadline count    | hundreds to ~5k                     | Client-side filtering still works for page filter               |
| Cross-entity query frequency | unmeasured, anecdotally rare        | Global search wins the rare case; filters win the frequent case |
| User stage                   | mostly learning IA, not power users | Discoverable affordances > muscle memory shortcuts              |
| Engineering staff            | small                               | Pick simple infra; avoid services to operate                    |
| AI / chat roadmap            | TBD 6–12 months                     | Don't lock in, but leave palette as the future entry point      |

---

## 3. Users & journeys

### Personas

- **CPA preparer**: managing 30–80 clients, working a queue daily. Knows their clients by name.
- **Manager / owner**: oversees the firm, approves Pulse changes, audits. Less frequent searches but broader scope.
- **Migration user**: just imported clients, hasn't learned the IA. Tries to find things by typing.

### Top journeys

| #   | Journey                                                     | Today                                                                            | After PRD                                                            |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| J1  | "Where's Wong & Wong's 1065?"                               | Navigate to /clients, search, click, navigate to Work tab, find 1065. ~5 clicks. | `cmd+k` "Wong 1065" → Enter. 3 keystrokes.                           |
| J2  | "Narrow this rule library to NY only"                       | Use the state filter chip.                                                       | Same — page filter pattern. Unchanged but with honest "Filter" verb. |
| J3  | "Find all alerts about CA wildfire"                         | Filter Pulse by source / state.                                                  | Same on the page (Filter). OR `cmd+k` "wildfire" → Alerts group.     |
| J4  | "Who owns this client?"                                     | Open client detail.                                                              | Same. Owner not searchable from cmd+k unless owner name is queried.  |
| J5  | "I just heard 'Bay Yoga' from a client call — who is that?" | Manual scroll / browser cmd+F.                                                   | `cmd+k` "Bay Yoga" → Northgate Yoga Studio matches.                  |
| J6  | "Switch to a different client I'm currently viewing"        | Click client name → ClientTitleSwitcher.                                         | Unchanged (combobox pattern).                                        |
| J7  | "Where's the audit log for Wong's last filing?"             | Navigate to /audit, filter by client.                                            | Same — `/audit` filter is a Phase 1 add.                             |

---

## 4. The two patterns — full UX spec

### 4.1 Page filter (Pattern 1)

**Definition**: Narrows the list visible on the current page. Stays on page. No navigation.

**Mental model**: "Make this list shorter so I find what I want faster."

**Visual** — uses canonical `SearchInput` primitive:

- Height: `h-9` (36px)
- SearchIcon: lucide `Search`, `size-4`, at `left-2.5`, color `text-text-tertiary`
- Input padding: `pl-9` left, `pr-9` right (room for clear button / kbd hint)
- Placeholder color: `text-text-secondary`
- Background: `bg-background-default`
- Border / focus ring: inherits from `<Input>` primitive

**Right-side affordance** (mutually exclusive):

| State                      | Element             | Action                                     |
| -------------------------- | ------------------- | ------------------------------------------ |
| Empty AND `hotkey="/"` set | `<kbd>/</kbd>` chip | Press `/` to focus this input              |
| Has value                  | `<X>` button        | Click clears value, returns focus to input |

**Placeholder copy** — always uses verb "Filter":

| Page                | Placeholder                                                             |
| ------------------- | ----------------------------------------------------------------------- |
| `/rules/library`    | "Filter rules…"                                                         |
| `/rules` (coverage) | "Filter jurisdictions or rules…"                                        |
| `/deadlines`        | "Filter clients" (the page is deadlines, but it filters by client name) |
| `/clients`          | "Filter clients" (Phase 1 todo)                                         |
| `/rules/pulse`      | "Filter alerts" (Phase 1 todo)                                          |
| `/audit`            | "Filter events" (Phase 1 nice-to-have)                                  |

**Behavior**:

- **Typing** debounces 150ms before re-running the filter function. Filter happens client-side over already-loaded rows.
- **Escape** clears the value while input is focused. Does NOT blur.
- **Click clear-X** clears the value and returns focus to the input.
- **Hotkey `/`** focuses the input from anywhere on the page (respects editable-target filter — does not fire when user is typing in another input).
- **URL sync** — the filter value writes to `?q=` in the URL via nuqs / `useQueryState` so deep links work. (Already true on `/rules/library`; pending on `/clients` and `/rules/pulse`.)
- **Composes with other filters** — search value AND-combines with existing filter chips (status, owner, state, etc).

**Hotkey wiring**:

- Single-character `/` opens / focuses the page filter.
- Registers via `hotkey` prop on `SearchInput`; appears in the global shortcut help dialog under the route's category.
- On `/deadlines`, the input is collapsible-icon by default — `/` opens the collapse before focusing.

**Empty states**:

- **Filter returns 0 rows**: render a contextual empty state with "Clear filter" action. Copy: "No <entities> match <query>. <button>Clear filter</button>"
- **Page itself has 0 rows** (pre-filter): hide the filter input. Show the page's onboarding/empty CTA instead.

### 4.2 Global search (Pattern 2)

**Definition**: Finds entities across the product. Selecting a result navigates to it.

**Mental model**: "Type any client / deadline / rule / alert / owner name — take me there."

**Entry points** — three:

| Entry                               | When                        | Notes                                                                                                                                                                                         |
| ----------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cmd+k` keyboard shortcut           | Always                      | Opens the palette in a centered Dialog. Existing shortcut; no change.                                                                                                                         |
| Sidebar header pill                 | Always (visible)            | A persistent button styled like a SearchInput. Renders `⌘K` kbd hint on the right. Click opens the palette. Collapses to icon-only in `data-collapsed=true` sidebar mode. **NEW in Phase 2.** |
| Programmatic `openCommandPalette()` | From any "Find…" affordance | E.g., the dashboard "Jump to client" button can pre-seed a query.                                                                                                                             |

**Visual** (palette):

- Centered Dialog, max-width 640px
- Header input: `CommandInput`, same height (h-9) but with `Search` icon, no clear button (Esc closes)
- Body: scrollable result list, grouped by entity type
- Footer: `Enter execute · Esc close · ⌘K toggle` hint strip (already exists)

**Result groups** (in order):

1. **Clients** (top — most-searched entity per stage)
2. **Deadlines**
3. **Alerts**
4. **Rules**
5. **Owners** (people)
6. **Navigate** (existing route entries — at the bottom)
7. **Actions** (existing — e.g., "Create new client") — bottom

Each group:

- Header: group name + count
- Up to 5 results per group (configurable via input limit)
- "Show all N" link at the bottom of any group with `hasMore: true` — opens the corresponding list page pre-filtered with the query

**Result row** structure:

```
<icon> <primary label>          <kbd hint or context chip>
       <sublabel — context line>
```

- Icon: entity-type icon (client = User, deadline = Calendar, rule = ScrollText, alert = Spotlight, owner = UserCircle)
- Primary label: bolded, highlighted matching characters
- Sublabel: contextual metadata (e.g., for a deadline: "Wong & Wong · 1065 · Due Mar 15")
- Right-side: keyboard navigation hint for first result; context chip for the rest (e.g., "Late" / "Today" tone)

**Behavior**:

- **Open palette** → cursor in input, palette empty state shows recents (up to 5) + nav entries
- **Type ≥1 char** → debounce 200ms → fire `orpc.search.entities({ query })` → render grouped results
- **Arrow keys / ⌘↑↓** navigate result list (existing `CommandInput` behavior)
- **Enter** triggers the focused result's `onSelect` (= navigate to its `href`)
- **Esc** closes palette
- **⌘K again** closes palette
- **`Show all N`** click navigates to the list page with `?q=<query>` pre-set

**Recents**:

- Stored in localStorage as `recentSearches: { query, selectedHref, timestamp }[]` (max 10)
- Visible when palette opens with empty query (replaces nav entries when present)
- "Clear recents" link at the bottom

**Navigation behavior on result click**:

| Result type    | Action                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| Client         | Navigate to `/clients/{id}`                                                                           |
| Deadline       | Open the deadline drawer overlaid on whatever route the user is on (`useObligationDrawer().open(id)`) |
| Rule           | Open rule detail dialog (or navigate to `/rules/library?rule={id}`)                                   |
| Alert          | Navigate to `/rules/pulse?alert={id}`                                                                 |
| Owner          | Navigate to that owner's profile (TBD — may be deferred if no profile page exists)                    |
| Navigate entry | Existing behavior (route navigation)                                                                  |

**Mobile / narrow viewport**:

- Sidebar pill collapses to a search icon button (matches sidebar collapse design).
- `cmd+k` Dialog fits the viewport with reduced margins on small screens.

---

## 5. Search scope per entity (Phase 2)

### 5.1 Clients

| Field                       | Weight           | Index         | Notes                                          |
| --------------------------- | ---------------- | ------------- | ---------------------------------------------- |
| `client.name`               | 1.0              | `pg_trgm` GIN | Primary display name                           |
| `client.legalEntity`        | 0.6              | `pg_trgm` GIN | "LLC", "Inc" suffix variations                 |
| `client.primaryContactName` | 0.5              | `pg_trgm` GIN | Contact person, often used in casual reference |
| `client.assigneeName`       | 0.3              | `pg_trgm` GIN | Assigned team member                           |
| `client.state`              | exact match only | btree         | "CA", "NY", "TX" — typed shortcut              |

**Result sublabel**: `{entityType} · {state}` (e.g., "Partnership · CA")

**Permission**:

- Owners + Managers see all firm clients.
- Preparers see only clients they own (`assigneeId = user.id`) OR are explicitly delegated.
- Soft-deleted clients (`deletedAt IS NOT NULL`) excluded.

### 5.2 Deadlines (obligation instances)

| Field                     | Weight | Index         | Notes                                                     |
| ------------------------- | ------ | ------------- | --------------------------------------------------------- |
| Joined `client.name`      | 1.0    | (via join)    | Most common search angle                                  |
| `obligation.formName`     | 0.7    | `pg_trgm` GIN | "1065", "1040", "W-2"                                     |
| `obligation.taxType`      | 0.6    | btree         | Exact enum match — boosts when query is an exact tax code |
| `obligation.jurisdiction` | 0.4    | btree         | State code                                                |
| `obligation.statusNotes`  | 0.2    | `pg_trgm` GIN | Free-form CPA notes                                       |

**Result sublabel**: `{clientName} · {formName} · Due {dueDate}` with tone:

- `text-text-destructive` if `dueDate < today`
- `text-text-warning` if `dueDate === today`
- `text-text-secondary` otherwise

**Permission**:

- Inherits client permission. If user can't see the client, they can't see its deadlines.

### 5.3 Rules

| Field               | Weight | Index         | Notes                          |
| ------------------- | ------ | ------------- | ------------------------------ |
| `rule.title`        | 1.0    | `pg_trgm` GIN | "California Franchise Tax" etc |
| `rule.jurisdiction` | 0.6    | btree         | "CA", "NY", "FED"              |
| `rule.formName`     | 0.5    | `pg_trgm` GIN |                                |
| `rule.entityType`   | 0.3    | btree         | "partnership", "individual"    |

**Result sublabel**: `{jurisdiction} · {formName} · {entityType}`

**Permission**: Visible to all firm members (rules are shared firm-wide).

### 5.4 Alerts (Pulse)

| Field                        | Weight | Index         | Notes                                           |
| ---------------------------- | ------ | ------------- | ----------------------------------------------- |
| `pulse.title`                | 1.0    | `pg_trgm` GIN | "IRS extends CA wildfire-zone filing deadlines" |
| `pulse.summary`              | 0.5    | `pg_trgm` GIN | AI-generated summary text                       |
| `pulse.source`               | 0.4    | btree         | "IRS", "CA FTB"                                 |
| `pulse.jurisdiction`         | 0.4    | btree         |                                                 |
| Joined affected client names | 0.6    | (via join)    | "Show me alerts about Wong"                     |

**Result sublabel**: `{source} · {N} clients may be affected · {status}`

**Permission**:

- Owners + Managers see all alerts.
- Preparers can see alerts they need to action (per `pulse.view` permission gate).
- Dismissed/reverted alerts excluded by default (Phase 2.5: add "Include closed" toggle).

### 5.5 Owners / team members

| Field                               | Weight | Index         | Notes                          |
| ----------------------------------- | ------ | ------------- | ------------------------------ |
| `member.firstName + ' ' + lastName` | 1.0    | `pg_trgm` GIN |                                |
| `member.email`                      | 0.5    | `pg_trgm` GIN |                                |
| `member.role`                       | 0.2    | btree         | "owner", "manager", "preparer" |

**Result sublabel**: `{role} · {N} clients` (count their active clients)

**Permission**: Visible to all firm members.

### 5.6 Out-of-scope entities

- **Audit log events** — too high-volume, not "find an entity" — separate page-level filter only.
- **Evidence / attachments** — file content search is Phase 3+.
- **Notifications** — not entities, ephemeral.
- **Migration import batches** — admin tool, not searchable.

---

## 6. Ranking model

### 6.1 Score formula (v1)

For each result row:

```
score =
  + trigram_similarity(query, primary_field)    * field_weight_primary    // 0–1
  + max(trigram_similarity(query, secondary))   * 0.5                     // best secondary match
  + exact_prefix_bonus                          * 0.3                     // primary starts with query
  + recency_bonus                               * 0.2                     // entity touched in last 7d
  + owner_affinity_bonus                        * 0.15                    // current user owns/assigned
  + (group_priority_index)                      * 0.05                    // small group-order tiebreaker
```

Where:

- `trigram_similarity` is Postgres `pg_trgm`'s `similarity(field, query)`.
- `recency_bonus` = 1.0 if `updatedAt > now - 7d`, else 0.
- `owner_affinity_bonus` = 1.0 if `entity.ownerId = currentUser.id`, else 0.
- `group_priority_index` reflects the canonical group order (clients = highest, owners = lowest) so ties favor the more-common search target.

**Threshold**: results with `score < 0.15` are dropped to avoid noise. The threshold is tuned in v2 from telemetry.

**Group ranking**: each group is sorted by its own scores, independent of other groups. We do NOT inter-mix groups in the result list — UX is "see all matching clients first, then all matching deadlines" rather than "best overall match top."

### 6.2 Result limits

| Group     | Max per query | Show-all link |
| --------- | ------------- | ------------- |
| Clients   | 5             | Yes if more   |
| Deadlines | 5             | Yes if more   |
| Alerts    | 5             | Yes if more   |
| Rules     | 3             | Yes if more   |
| Owners    | 3             | Yes if more   |
| **Total** | 21            | —             |

The 21-max keeps the palette scrollable but not overwhelming.

### 6.3 Ranking iteration plan

- **v1** ships the heuristic above. No ML.
- **v1.5** (after 4 weeks of telemetry) tunes weights from search logs — specifically the `selectedRank` distribution. If users always pick rank 2 over rank 1, we down-weight whatever surfaces 1.
- **v2** (when needed) introduces query-class detection: if query looks like a state code ("CA"), boost state matches; if it looks like a year ("2024"), boost recent-year deadlines. Rule-based, not ML.
- **v3** (further out) considers ML reranking if scale demands. Not on the roadmap.

---

## 7. Permissions

### 7.1 Permission boundaries

Search NEVER leaks data the user couldn't otherwise see in the product. Enforced at SQL `WHERE` clauses, not as a post-filter on results.

| Entity    | Owner/Manager      | Preparer                            | Notes                                                         |
| --------- | ------------------ | ----------------------------------- | ------------------------------------------------------------- |
| Clients   | All firm clients   | Only own assignment                 | `WHERE assigneeId = :userId OR :role IN ('owner', 'manager')` |
| Deadlines | All firm deadlines | Only own clients' deadlines         | Inherits client filter                                        |
| Rules     | All                | All                                 | No filter                                                     |
| Alerts    | All firm alerts    | Filtered by `pulse.view` permission | Already enforced in existing pulse queries — reuse            |
| Owners    | All firm members   | All firm members                    | No filter                                                     |

### 7.2 Cross-firm safety

`firmId` injected into every query via the scoped repo (existing pattern). Never accept `firmId` from user input. The RPC handler reads `firmId` from the better-auth session's `activeOrganizationId`.

### 7.3 Result hidden vs result missing

If a permission filter excludes a result the user typed exactly — e.g., a preparer searches for a client they don't own — the result is silently absent. We do NOT show "1 hidden result." Reasoning: telling a user something exists they can't see is itself an information leak.

---

## 8. Performance & data

### 8.1 Latency targets

| Metric                                     | Target      | Stretch     |
| ------------------------------------------ | ----------- | ----------- |
| End-to-end keystroke → first result render | ≤ 250ms p95 | ≤ 150ms p95 |
| Server query time                          | ≤ 80ms p95  | ≤ 40ms p95  |
| Debounce                                   | 200ms       | —           |
| Palette open to first paint                | ≤ 50ms      | —           |

### 8.2 Indexes (Phase 2 migration)

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX clients_name_trgm_idx
  ON clients USING gin (name gin_trgm_ops);
CREATE INDEX clients_legal_entity_trgm_idx
  ON clients USING gin (legal_entity gin_trgm_ops);
CREATE INDEX clients_contact_trgm_idx
  ON clients USING gin (primary_contact_name gin_trgm_ops);

CREATE INDEX obligations_form_name_trgm_idx
  ON obligations USING gin (form_name gin_trgm_ops);

CREATE INDEX rules_title_trgm_idx
  ON rules USING gin (title gin_trgm_ops);

CREATE INDEX pulse_title_trgm_idx
  ON pulse_alerts USING gin (title gin_trgm_ops);
CREATE INDEX pulse_summary_trgm_idx
  ON pulse_alerts USING gin (summary gin_trgm_ops);

CREATE INDEX members_name_trgm_idx
  ON firm_members USING gin ((first_name || ' ' || last_name) gin_trgm_ops);
```

Compound queries (e.g., "search clients in CA") use the existing btree indexes for `firmId`, `state`, `deletedAt`.

### 8.3 Query shape

Per group, one SELECT per entity type with the WHERE on `similarity(field, $query) > 0.15`. Avoid `JOIN`s when possible; for deadlines, the client name join is necessary but bounded by the deadline's own firm scope.

### 8.4 Caching

- **TanStack Query** caches result by `query` string for 30 seconds (cancels in-flight requests on new keystrokes).
- **No server-side cache** in v1; the queries are fast enough at our scale. Revisit if p95 exceeds 80ms.

### 8.5 Scale limits

| Firm size                        | Expected p95 | Action                                                    |
| -------------------------------- | ------------ | --------------------------------------------------------- |
| <500 clients × 10k deadlines     | 30–50ms      | Default config                                            |
| 500–2000 clients × 50k deadlines | 60–120ms     | Add result limit per group, increase similarity threshold |
| >2000 clients                    | >150ms       | Migrate to Postgres FTS or Meilisearch — out of Phase 2   |

---

## 9. Empty states & edge cases

| State                                                    | Page filter                                                               | Global search                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Empty query (input focused but nothing typed)            | Show all rows                                                             | Show recent searches + navigate entries                      |
| 0 results match                                          | "No clients match 'wong'. Clear filter"                                   | "No matches. Try a shorter query."                           |
| Network error                                            | Toast: "Couldn't filter — retry"; keep last results visible               | Inline error inside palette: "Couldn't reach search. Retry." |
| User typed slow / very long query                        | Hard cap query length to 100 chars                                        | Same                                                         |
| User pasted query                                        | Treat same as typed, no special handling                                  | Same                                                         |
| Query starts with a sigil (`@`, `#`, `/`)                | Treat as plain text                                                       | Future: `@` for owner, `#` for status — not in v1            |
| Search result entity got deleted between query and click | On click, show toast "This <entity> no longer exists" and refresh results | Same                                                         |
| User searches in a different language than UI locale     | Trigram match still works on raw strings; UI displays in user's locale    | Same                                                         |

---

## 10. Accessibility & i18n

### 10.1 Accessibility

- **Keyboard-only operable**: every result row reachable via Tab + Arrow; Enter selects.
- **Screen reader**: `aria-label` on input ("Filter clients" / "Search clients, deadlines, rules"); `aria-live="polite"` region announces result count after debounce ("12 results found").
- **Focus management**: opening cmd+k traps focus inside the Dialog (existing `CommandDialog` behavior); closing returns focus to the previously focused element.
- **Color is not the only signal**: result severity (overdue deadline = red) accompanied by text ("Due Mar 15 · 3 days late") or icon.

### 10.2 i18n

- All placeholders, group labels, sublabels go through `Trans` / `t`…`.
- Trigram similarity is locale-agnostic (works on raw string bytes). No locale-specific stemming in v1.
- For Chinese / Japanese client names, trigram on a single CJK character is 1 trigram — works but lower precision. Acceptable v1; revisit if our user base extends to non-Latin script firms.

---

## 11. Telemetry

### 11.1 Page filter telemetry

Per filter use:

- `route` (e.g., `/rules/library`)
- `queryLength`
- `resultsCount`
- `clearedHow` (`escape` | `x-button` | `route-change`)

Sampled at 10%.

### 11.2 Global search telemetry

Per search:

- `query` (hashed if PII concern — we'll send first 3 chars for length distribution + the query length only, NOT the full query)
- `queryMs` (server time)
- `totalResults` per group
- `selectedGroup` (or null if user closed without selecting)
- `selectedRank` (1-indexed within group)
- `selectedEntityType`
- `openedFrom` (`hotkey` | `sidebar-pill` | `programmatic`)

Used for v1.5 ranking tuning. Dashboard query: "Top 50 queries with selectedRank > 3" = the queries where our ranking failed.

### 11.3 No-PII guarantee

We do NOT log:

- The full query text (could contain client names = PII)
- Full result list
- User's identity beyond firm + role

We DO log:

- Query length, character classes (alpha/digit/symbol)
- Result counts per group
- Selected rank + group

---

## 12. Implementation plan

### 12.1 Phase 1 — page filter hygiene + cmd+k honesty (shipped + partial)

**Status: partially shipped 2026-05-26.**

✅ Done:

- `SearchInput` primitive unified (h-9, clear button, Escape, optional `hotkey` + `hotkeyMeta` props with kbd hint chip)
- `/rules/library`, `/rules`, `/deadlines` placeholders renamed to "Filter X"
- `/` hotkey wired via primitive on rule library + coverage; deadlines keeps its route-level wiring
- cmd+k palette placeholder "Search or navigate" → "Navigate" (lie removed)
- Coverage tab local shadow `SearchInput` killed; uses the primitive
- Deadlines `ObligationQueueSearchControl` expanded state uses the primitive

⏳ Still pending (≈ 4–6 hr frontend work):

- Add page filter to `/clients` — toolbar `SearchInput` filtering the existing client list by name
- Add page filter to `/rules/pulse` — toolbar `SearchInput` filtering alerts by title / source / affected client
- Add page filter to `/audit` — toolbar `SearchInput` filtering events by entity/actor

### 12.2 Phase 2 — global entity search

**Effort estimate: 1 backend + 1 frontend × 4 weeks. Or aggressive: 2 weeks if 1 dedicated full-stack.**

Subphases (parallelizable):

**Phase 2a — backend foundation (week 1)**

- Add `pg_trgm` extension migration
- Add GIN indexes (per §8.2)
- New ORPC procedure `search.entities`
- Clients-only search (other entities stubbed)
- Permission filtering tests

**Phase 2b — frontend palette refactor (week 1, parallel to 2a)**

- `CommandPalette` accepts a debounced `useQuery` against `search.entities`
- Result grouping UI with entity-specific row renderers
- Navigation handlers per result type
- Recents in localStorage
- Empty state + error state

**Phase 2c — other entities (week 2)**

- Backend: extend `search.entities` to support deadlines, rules, alerts, owners
- Frontend: turn on each group as backend lands

**Phase 2d — sidebar pill + polish (week 2)**

- Persistent "Search…" pill in sidebar header
- Responsive collapse to icon-only
- Help dialog entry for `cmd+k`
- Telemetry wiring

**Phase 2e — ranking tuning (week 3–4, post-launch)**

- Collect telemetry
- Tune similarity threshold + group weights
- Adjust per-firm based on data

### 12.3 Phase 3 — future (not in this PRD scope)

- AI assistant integration (palette becomes "Ask…" + "Search…")
- Cross-firm enterprise search
- Semantic / vector-embedding search
- Evidence file content search
- Saved searches / sharable queries

---

## 13. Risks & mitigations

| Risk                                           | Likelihood                          | Impact              | Mitigation                                                                         |
| ---------------------------------------------- | ----------------------------------- | ------------------- | ---------------------------------------------------------------------------------- |
| Ranking returns wrong result before right one  | High                                | High — erodes trust | v1 telemetry feeds v1.5 tuning fast                                                |
| Permission leak via global search              | Low (SQL-level filters)             | Critical            | Test coverage for every entity × every role combination                            |
| `pg_trgm` performance degrades at scale        | Medium at >2000 clients             | Medium              | Migration path to FTS / Meilisearch documented                                     |
| Users confused by Filter vs Search verbs       | Medium                              | Medium              | Honest placeholders + consistent kbd hints + onboarding tooltip in v1.5            |
| cmd+k discoverability without the sidebar pill | High in v1                          | Medium              | Sidebar pill is Phase 2d — discoverability is fixed before Phase 2 declares "done" |
| Recents leak PII                               | Low (localStorage, per-user device) | Medium              | Recents purged on logout; never sent to server                                     |
| Mobile / narrow viewport breaks layout         | Medium                              | Low                 | Sidebar pill collapses to icon at <md; Dialog already responsive                   |

---

## 14. Open questions

For team to confirm before Phase 2 starts:

1. **Backend infra locked at `pg_trgm`?** Or do we want FTS to anticipate scale?
2. **Sidebar pill always visible vs collapsed-mode-only?** Affects sidebar redesign work.
3. **Owner search** — does the product have an owner-profile page to navigate to? If not, dropping owners from v1 result groups is fine.
4. **Recents persistence** — localStorage (per-device) or server-side (cross-device)?
5. **Cross-tab open behavior** — if user clicks a result in cmd+k, do we navigate in the same tab (default) or offer a `⌘+click` to open new tab? (We have to handle this explicitly; the palette currently always same-tab.)
6. **Pulse alert dismissal state** — does global search include dismissed alerts by default? Recommend: no, with an opt-in toggle.
7. **AI assistant integration deadline** — if we know it's <6 months, design `cmd+k` with an "Ask" group placeholder from day 1 vs add later.

---

## 15. Success criteria

Phase 1 ships when:

- All page filter consumers use the unified `SearchInput` primitive
- No placeholder anywhere uses the word "Search" unless it actually searches across entities
- `/` hotkey works on every list page that has a filter
- `/clients`, `/rules/pulse`, `/audit` have page-level filters

Phase 2 ships when:

- `cmd+k` returns real entity results for clients, deadlines, alerts, rules, owners
- Sidebar header has a persistent search pill
- p95 server query time ≤ 80ms on a 200-client firm fixture
- Permission tests pass for every entity × every role
- Telemetry hooks live and feeding a search-quality dashboard

Long-term success measured by:

- Time-to-find (telemetry): median selected-rank ≤ 2
- Reduction in "where do I find X?" support tickets
- cmd+k engagement rate (palette opens per user-week)

---

## 16. Appendix: what this PRD does NOT change

- Existing `ClientCombobox`, `ClientTitleSwitcher`, `timezone-select`, `CreateObligationDialog` typeaheads — all use `CommandInput` correctly and are NOT in scope of this PRD's renames.
- Existing `TableHeaderFilter` column-header popovers — they're column filters, not page filters. Verb "Search clients/states/owners" inside a column-filter popover is honest (it searches that column's value set).
- The keyboard-shortcut help dialog (`?`) — search shortcuts get added but the dialog's structure doesn't change.
- Existing route summary / sitemap — no change.
