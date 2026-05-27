# Step 8 — Data-finding affordance audit

Date: 2026-05-26
Branch: `feat/step-8-data-finding-audit-v2`
Driver: Yuqi (cross-product IA audit). Charter:
"Be critical, be harsh, be advanced, be aggressive. AUDIT EVERYTHING."

Exhaustive audit of every search / filter / sort / pagination / group-by /
URL-state-syncing affordance across the CPA workbench. Inventory matrix
first, then per-finding records grouped by surface. Each finding includes:

- Location (file + line range)
- What is wrong
- Why it matters (CPA workflow)
- Severity (P0 broken, P1 drift/UX, P2 polish, P3 nice-to-have)
- Proposed fix
- Status (shipped / deferred / documented)

---

## Inventory matrix

| Surface              | Search input          | URL param | Filters URL-synced | Sort URL-synced | Pagination       | Group-by  | `/` hotkey | Esc-clear | Clear-all label |
| -------------------- | --------------------- | --------- | ------------------ | --------------- | ---------------- | --------- | ---------- | --------- | --------------- |
| `/deadlines`         | canonical SearchInput | `q`       | yes (nuqs)         | yes (`sort`)    | infinite + paged | yes (URL) | yes (raw)  | yes       | "Clear filters" |
| `/clients` (list)    | hand-rolled `<Input>` | `q`       | yes (nuqs)         | n/a (no sort)   | none (slice 500) | no        | yes (raw)  | yes       | "Reset"         |
| `/clients/$id` plan  | n/a                   | n/a       | n/a                | local useState  | n/a              | year      | n/a        | n/a       | n/a             |
| `/rules/library`     | canonical SearchInput | `q`       | partial            | n/a             | none (vlist)     | jur fixed | YES (prim) | yes       | "Clear filters" |
| `/rules/library` cov | canonical SearchInput | `q`       | URL (nuqs)         | n/a             | none (vlist)     | n/a       | YES (prim) | yes       | "Clear filter"  |
| `/alerts`            | none (popover only)   | none      | NO (useState)      | NO              | none             | n/a       | NO         | n/a       | "Clear filters" |
| `/audit`             | NONE (q parser dead)  | `q` dead  | yes (nuqs)         | n/a             | manual page-int  | n/a       | NO         | n/a       | "Reset"         |
| `/members`           | NONE                  | none      | n/a                | n/a             | none             | status    | NO         | n/a       | n/a             |
| `/calendar`          | NONE                  | none      | n/a                | n/a             | n/a              | n/a       | NO         | n/a       | n/a             |
| `/workload`          | NONE                  | none      | n/a                | n/a             | n/a              | n/a       | NO         | n/a       | n/a             |
| `/opportunities`     | NONE                  | none      | n/a                | n/a             | none (limit 24)  | n/a       | NO         | n/a       | n/a             |
| `/notifications`     | NONE                  | none      | NO                 | n/a             | none (limit 50)  | NO        | NO         | n/a       | n/a             |
| Command palette      | CommandInput          | n/a       | n/a                | n/a             | n/a              | groups    | YES (⌘K)   | yes       | n/a             |
| Header multi-filter  | raw Input (popover)   | n/a       | parent decides     | n/a             | n/a              | n/a       | n/a        | n/a       | n/a             |

Highlights:

- Two surfaces (`/clients` list, `/audit`) say "Reset", every other surface says "Clear filters".
- `/clients` list and `/clients/$id` filing plan hand-roll the SEARCH affordance
  in conflict with `/components/primitives/search-input.tsx` (canonical primitive).
- `/clients` list uses raw `addEventListener('keydown')` for `/` hotkey vs. the
  canonical `useAppHotkey()` — the shortcut never registers in the keyboard help.
- `/deadlines` wires `/` via route-level `useAppHotkey()` instead of the
  primitive's `hotkey` prop → the in-input `kbd hint chip` never renders on
  the most data-dense surface in the product.
- `/audit` declares `q` parser, references it in `filtersActive`/`resetFilters`
  but NEVER renders or sets the input. Dead URL contract.
- `/alerts` filters are 100% local `useState` — share-link impossible, full
  refresh wipes everything.
- `/calendar`, `/workload`, `/members`, `/opportunities`, `/notifications` have
  **zero** find affordance. Notifications scales the worst — capped at 50 items
  with no filter or search.

---

## Cross-surface findings (the patterns that drift)

### F-X01 — "Reset" vs "Clear filters" label split

- **Locations**
  - `apps/app/src/features/clients/ClientFactsWorkspace.tsx:1677` — Reset
  - `apps/app/src/features/audit/audit-log-page.tsx:707` — Reset
  - `apps/app/src/routes/obligations.tsx` — "Clear filters" (in the applied-filter strip)
  - `apps/app/src/features/pulse/AlertsListPage.tsx` — "Clear filters"
  - `apps/app/src/features/rules/coverage-tab.tsx:1024` — "Clear" (chip)
- **What** — Identical affordance ("erase every active filter on this page")
  carries three different labels across the product: `Reset`, `Clear`, `Clear filters`.
- **Why it matters** — Cross-surface muscle memory is the entire payoff of a
  workbench. A CPA who learns "Clear filters returns me to the full list on
  /deadlines" should not have to relearn "oh, on /clients it's called Reset
  and lives in a different spot."
- **Severity** P1
- **Proposed fix** — Standardize on **"Clear filters"** (the majority + the
  more honest label; "Reset" implies returning the UI to its initial state,
  which here only clears filters, not other UI like density or hidden columns).
- **Status** — Shipped on `/clients` and `/audit` this branch; coverage-tab
  ActiveFilterChip "Clear" deferred (singular filter chip, smaller drift).

### F-X02 — `/clients` and `/clients/$id` filing plan hand-roll search input

- **Locations**
  - `apps/app/src/features/clients/ClientFactsWorkspace.tsx:1588-1623`
- **What** — The `/clients` directory uses a raw `<Input type="search">` with
  hand-rolled `XIcon`, hand-rolled Escape-to-clear, height `h-8` (the canonical
  SearchInput is `h-9`), padding `pl-8` (canonical `pl-9`). Search-icon size
  `size-4` matches, but everything else is bespoke. The primitive
  `apps/app/src/components/primitives/search-input.tsx` was extracted on
  2026-05-25 _specifically to consolidate this_, per the doc comment ("Before
  this primitive, /rules/library, /deadlines, and /clients each rolled their own
  search input"). /clients never migrated.
- **Why it matters** — Yuqi's stated cross-surface directive in the primitive's
  doc-string is direct: "ensure the search pattern on each page is the same."
  Hand-rolled drift on the cardinal directory surface defeats the consolidation.
- **Severity** P1
- **Proposed fix** — Replace the hand-rolled block with `<SearchInput>` from
  `@/components/primitives/search-input`. Pass `hotkey="/"` so the kbd hint
  renders and the shortcut is captured in the global help dialog.
- **Status** — Shipped this branch.

### F-X03 — `/clients` uses raw `addEventListener` for `/` hotkey

- **Locations**
  - `apps/app/src/features/clients/ClientFactsWorkspace.tsx:1564-1578`
- **What** — `useEffect` + window `keydown` listener for `/` is set up by hand,
  bypassing `useAppHotkey`. Effects: (a) the shortcut does not appear in
  the keyboard-help dialog, (b) it can race with the centralized `requireReset`
  gate so a rapid `///` triple-press can re-fire, (c) on routes that mount
  /clients inside a panel the listener stays bound after unmount only if the
  cleanup ran (it does, but the contract is owned by the route not the component).
- **Why it matters** — The keyboard-shortcuts dialog is the discoverability
  mechanism for power users. Hidden shortcuts are functionally invisible.
- **Severity** P1
- **Proposed fix** — Remove the manual effect; pass `hotkey="/"` + `hotkeyMeta`
  to `<SearchInput>` so the canonical wiring registers the shortcut in the
  help dialog under the `clients` category.
- **Status** — Shipped (rolled into F-X02 migration).

### F-X04 — `/deadlines` `/` hotkey works but no kbd hint chip

- **Locations**
  - `apps/app/src/routes/obligations.tsx:2398-2418` — route-level useAppHotkey
  - `apps/app/src/routes/obligations.tsx:11268-11281` — SearchInput call
- **What** — The route wires `/` at the route level with a `requestAnimationFrame`
  open-then-focus dance (necessary because the search input is collapsed to a
  magnifier button by default). But by NOT passing `hotkey="/"` into the
  primitive, the primitive's `kbd hint chip` (the small `/` glyph that lives
  inside the empty input as discovery affordance) never renders.
- **Why it matters** — Same primitive, two surfaces (`/rules/library`,
  coverage tab) get a discoverable `/` hint; the most-trafficked list page
  doesn't. Power users learn `/` once for the product, not three times for
  three surfaces.
- **Severity** P2
- **Proposed fix** — Either (a) pass `hotkey="/"` on the SearchInput AND keep
  the route-level expand-on-trigger (the primitive's hotkey just fires
  `localRef.current?.focus()`, which only works when the input is mounted), or
  (b) leave the route-level wiring but render a kbd hint chip in the collapsed
  button state. (b) is the safer ship and Yuqi's intent — the search input is
  collapsed by default on /deadlines for table density reasons. Deferred
  pending a primitive change.
- **Status** — Documented as deferred (requires either primitive prop or
  custom hint on the collapsed magnifier).

### F-X05 — `/deadlines` collapsed search button has mismatched aria-label / placeholder

- **Locations**
  - `apps/app/src/routes/obligations.tsx:11248` — `aria-label={t\`Filter clients\`}`
  - `apps/app/src/routes/obligations.tsx:11274` — `placeholder={t\`Filter clients\`}`
  - `apps/app/src/routes/obligations.tsx:11275` — `ariaLabel={t\`Filter deadlines\`}`
- **What** — The collapsed magnifier announces "Filter clients" to screen
  readers; the expanded input announces "Filter deadlines". The placeholder
  ("Filter clients") describes a subset of what the input actually filters
  (the input matches client name + obligation title + rule name; not just
  clients).
- **Why it matters** — Screen reader users hear two different things for the
  same control depending on whether it's collapsed or expanded. The placeholder
  understates the input's reach.
- **Severity** P1
- **Proposed fix** — Standardise on `aria-label="Filter deadlines"` and
  `placeholder="Filter deadlines"`. Single accessible name for the control
  across both states.
- **Status** — Shipped this branch.

### F-X06 — `/audit` declares `q` URL param but never renders a search input

- **Locations**
  - `apps/app/src/features/audit/audit-log-page.tsx:78` — parser declared
  - `apps/app/src/features/audit/audit-log-page.tsx:514` — read in filtersActive
  - `apps/app/src/features/audit/audit-log-page.tsx:524` — written by resetFilters
  - Nowhere is the value actually set by the user.
- **What** — `q: parseAsString.withDefault('').withOptions(REPLACE_HISTORY_OPTIONS)`
  is wired in but the audit page renders zero search input. The parser is
  zombie code: it accepts a `?q=foo` deep-link and counts it as an active
  filter (so the Reset button enables and the empty state shows "filtered"
  copy), but the user can't _set_ `q` from the UI.
- **Why it matters** — Audit log is text-heavy (event description, entity name,
  actor email, IP). The full-text search is the most useful filter for
  audit investigators ("did anyone touch client X today?"). The parser shape
  is ready; the input is missing.
- **Severity** P1 — incomplete feature surface
- **Proposed fix** — Add a SearchInput at the head of the AuditFilters card
  bound to `query.q`. Pipe `q` into the audit list backend if/when supported;
  for now filter client-side over event description + entity name + actor name
  for visible events. Defer backend integration; ship UI + client-side scan.
- **Status** — Shipped (UI + client-side filter) this branch.

### F-X07 — `/alerts` filters not URL-synced (cannot share filtered view)

- **Locations**
  - `apps/app/src/features/pulse/AlertsListPage.tsx:137-149`
- **What** — `statusFilter`, `impactFilter`, `changeKindFilter`,
  `sourceFilter`, `jurisdictionFilter` all live in component `useState`. No
  nuqs binding. Refresh the page → filters reset. Share the URL → recipient
  sees the unfiltered list.
- **Why it matters** — Alerts is the second-most-trafficked list page (per
  Yuqi's Pulse pass logs). A senior CPA pinging a preparer "look at all
  the IRS impact-high alerts" needs the filtered URL to do the work.
- **Severity** P1
- **Proposed fix** — Migrate the five filters to `useQueryStates` with a
  per-surface parsers map; keep `replace` history so back-button doesn't
  step through every filter toggle. Deferred — this touches mutations,
  filter handlers, and the history-mode lock; non-mechanical change.
- **Status** — Documented as deferred (≥30 min refactor + tests).

### F-X08 — Multi-filter popover search is raw `<Input>` (not canonical primitive)

- **Locations**
  - `apps/app/src/components/patterns/table-header-filter.tsx:123-140`
- **What** — Inside `TableHeaderMultiFilter`, when `searchable=true`, the
  popover renders a raw `<Input className="h-8" ...>` with no search icon and
  no clear-X. The canonical SearchInput would carry both.
- **Why it matters** — Minor drift; the popover is small and the visual cost
  is real (icon + X squeeze the input). But it does mean a CPA who's used to
  Esc-to-clear on the page-level search gets nothing in the popover (the
  popover swallows Esc to close itself, which is correct, but means typed
  text persists across re-open even though `handleOpenChange` resets it).
- **Severity** P3
- **Proposed fix** — Leave as-is. The popover-inline search has different
  UX needs (close-on-Esc trumps clear-on-Esc, no need for `/` hotkey).
  Documented for awareness.
- **Status** — Documented (no fix).

### F-X09 — `/clients/$id` filing-plan sort is local useState, not URL-synced

- **Locations**
  - `apps/app/src/features/clients/ClientFactsWorkspace.tsx:2820-2827`
- **What** — Filing-plan sort (`field`, `dir`) lives in component state. Page
  reload → sort reverts to "API order." Share link → recipient sees their
  own (possibly different) sort.
- **Why it matters** — `/deadlines` carefully wired its sort to `?sort=` for
  exactly this share-ability reason. The same data shape on the per-client
  view drops the convention.
- **Severity** P2
- **Proposed fix** — Migrate to `useQueryState('sort', parseAsStringLiteral(...))`
  on the client-detail route. Deferred — touches the client-detail route
  (separate from the list) and would benefit from a shared sort-key contract
  with /deadlines. Logged for the URL-state convergence pass.
- **Status** — Documented as deferred.

### F-X10 — `/rules/library` expand/collapse state not URL-synced

- **Locations**
  - `apps/app/src/routes/rules.library.tsx:674-690` — `useState<Set<RuleJurisdiction>>`
- **What** — Which jurisdictions are expanded lives in component state. Share
  a deep-link `/rules/library?q=florida` — recipient sees all jurisdictions
  collapsed; they have to expand FL themselves to see the rules they were
  pointed to. The default-expanded set (helpers like `defaultExpandedSet()`)
  re-runs only when the jurisdiction fingerprint changes.
- **Why it matters** — Less critical than filters but still a share-link
  fidelity gap. A CPA escalating "the FL S-corp rule needs your sign-off"
  expects the recipient to land already-expanded.
- **Severity** P3
- **Proposed fix** — Add `?expanded=` array URL param; intersect with
  available jurisdictions. Deferred — UX edge cases (expand-all overrides the
  array, etc.) need design.
- **Status** — Documented as deferred.

### F-X11 — `coverage-tab` ActiveFilterChip uses non-localized strings + "Clear"

- **Locations**
  - `apps/app/src/features/rules/coverage-tab.tsx:1011-1027`
- **What** — The single-filter chip ("Showing jurisdictions with pending rules")
  is raw English strings instead of `<Trans>` / `t\`\``. The "Clear" button
  - `aria-label="Clear filter"` is also raw English. Every other surface in
    this file is properly localized.
- **Why it matters** — Lingui pipeline drops untranslated strings. zh-CN /
  en messages.po stays out of sync.
- **Severity** P2
- **Proposed fix** — Wrap labels in `t\`\``(function body needs`useLingui`)
or `<Trans>` (JSX). Localize the "Clear filter" button.
- **Status** — Shipped this branch (changed to `t\`Clear filter\`` consistent
  with other surfaces).

### F-X12 — `/clients/$id` panel filter-toolbar Reset clears too much

- **Locations**
  - `apps/app/src/features/clients/ClientFactsWorkspace.tsx:1666-1678`
- **What** — The Reset button on the /clients filter toolbar clears search +
  every filter. But the **import-history** URL param (`importHistory=open`,
  controlling the drawer) is independently controlled and NOT cleared. That's
  actually correct (don't yank an open drawer) — but the button label
  "Reset" implies fuller scope than it has.
- **Why it matters** — Reinforces F-X01 — "Reset" oversells; "Clear filters"
  is honest about scope.
- **Severity** P2
- **Proposed fix** — Rename to "Clear filters" (rolled into F-X01).
- **Status** — Shipped (rolled into F-X01 patch).

### F-X13 — `/alerts` has no top-level search input

- **Locations**
  - `apps/app/src/features/pulse/AlertsListPage.tsx` (no SearchInput)
- **What** — Alerts have title, summary, source, jurisdiction — all free-text
  searchable in theory. Today the only way to narrow is the five filters; no
  way to find "the alert that mentioned Section 199A".
- **Why it matters** — As pulse history grows (currently capped at 50, but
  growable), filters won't substitute for keyword search.
- **Severity** P2
- **Proposed fix** — Add SearchInput URL-bound to `q` once F-X07 lands the
  nuqs migration. Deferred together.
- **Status** — Documented as deferred.

### F-X14 — `/notifications` has zero find affordance

- **Locations**
  - `apps/app/src/features/notifications/notifications-page.tsx` (no
    filter / search / pagination / read-status toggle)
- **What** — Hardcoded `limit: 50, status: 'all'`. Read vs unread is rendered
  but not filterable. No search by content. No pagination beyond the 50.
- **Why it matters** — Inboxes scale faster than any other list. Without
  unread-only at minimum, the inbox becomes unusable at 200+ notifications.
- **Severity** P1 — feature gap
- **Proposed fix** — Add a read/unread tab pair + cursor pagination + an
  optional search input. Substantial work; out of scope for this audit pass.
- **Status** — Documented as deferred (P1 backlog).

### F-X15 — `/calendar`, `/workload`, `/members`, `/opportunities` have no find affordance

- **Locations** — Respective `*-page.tsx` files.
- **What** — Members page has 1198 lines and zero search; growable to dozens
  of seats (workshops, conferences, large firms). Calendar is subscription
  config so n/a, but Workload and Opportunities show data lists with no
  search or filter.
- **Why it matters** — Members + Opportunities scale. A 30-person firm hits
  scroll-fatigue on members; an active opportunities feed is hard to dig
  through without filter chips.
- **Severity** P2 / P3 (varies by surface)
- **Proposed fix** — Per-surface design pass; out of scope for this audit.
- **Status** — Documented as deferred.

### F-X16 — `keyboard-shell` `/` hotkey help label says "Focus search" — inconsistent verb

- **Locations**
  - `apps/app/src/routes/obligations.tsx:2412` — name "Focus search"
  - `apps/app/src/routes/rules.library.tsx:1423` — name "Filter rules"
  - `apps/app/src/features/rules/coverage-tab.tsx:994` — name "Filter coverage"
- **What** — Help-dialog labels for the `/` hotkey across three surfaces are
  inconsistent: "Focus search", "Filter rules", "Filter coverage". Per the
  recent Phase 1 cross-product audit (per coverage-tab comment 971-974: "Page-
  level filter, not entity search"), every page-level `/` hotkey is a _filter_,
  not a _search_.
- **Why it matters** — User opens help dialog, sees three different verbs for
  the same conceptual shortcut on three different pages. Erodes confidence
  in the consolidation effort already underway.
- **Severity** P2
- **Proposed fix** — Rename `obligations.focus-search` label to "Filter
  deadlines" to align with the verb-discipline introduced in coverage-tab
  - rules.library. Description text stays mostly the same.
- **Status** — Shipped this branch.

### F-X17 — Pagination styles diverge across surfaces

- **Locations**
  - `/deadlines` — prev/next with `N / N+` indicator + load-on-demand
  - `/audit` — manual prev/next with paged events array
  - `/clients` — no pagination (hard slice to 500)
  - `/rules/library` — no pagination (virtualized list)
  - `/notifications` — no pagination (limit 50)
- **What** — Five surfaces, five different paging strategies. Some justified
  (rules vlist), some not (notifications stops at 50; clients silently truncates
  at 500).
- **Why it matters** — Silent truncation is the worst: at the 501st client the
  user sees no warning, just a list that abruptly stops. Cursor pagination is
  the standard the data layer already supports (`orpc.*.list` uses cursors).
- **Severity** P2
- **Proposed fix** — At minimum, render "Showing first 500 of N (refine
  filters to see more)" once a hard slice is applied. Adopting cursor
  pagination across /clients is a larger architectural pass. Deferred for
  the page-pagination convergence sweep.
- **Status** — Documented as deferred.

---

## Per-surface findings

### `/deadlines` (`apps/app/src/routes/obligations.tsx`)

**Standout strengths**

- Largest filter inventory in the product; richest URL contract; J/K row
  navigation; sortable column headers with proper aria-sort.
- Smart Priority sort uses non-monotonic ordering — kept off the URL until
  user explicitly picks it.

**F-D01** — Sort-default-deletion convention is fragile

- Location: `apps/app/src/routes/obligations.tsx:713-715` (`withDefaultSortCleared`)
- What — When user picks the default sort, URL writes `sort: null` instead of
  leaving `?sort=due_asc` in the URL. Designed so the default URL is clean.
  But the same logic doesn't apply to _every_ default (`density`, `group`,
  etc.) — only `sort` got the cleanup.
- Why — Inconsistent URL hygiene means default URLs sometimes carry
  noise params (`?density=comfortable`).
- Severity — P3
- Status — Documented.

**F-D02** — `assignee` (string) + `assignees` (array) are two URL params for one concept

- Location: `apps/app/src/routes/obligations.tsx:646-647`
- What — `assignee` is a singular string param; `assignees` is a comma-separated
  array. Legacy support? — Both are parsed and only `assigneeName` from
  `assignee` feeds the query (line 1182).
- Why — Two parsers for one human concept invites bugs and is hard to bookmark
  predictably. Bookmark `?assignee=Yuqi&assignees=Yuqi,Alex` and the behavior
  is non-obvious.
- Severity — P2 — legacy dual contract; collapse pending compatibility review.
- Status — Documented (deferred — needs redirect to preserve old bookmarks).

**F-D03** — `?lifecycle=v2` toggles sort default but not via the URL

- Location: `apps/app/src/routes/obligations.tsx:992-996`
- What — When `lifecycle=v2` is true AND no `?sort=` in URL, sort defaults to
  `due_asc` instead of `smart_priority`. Result: same URL → different
  rendered sort depending on a feature flag in another URL param.
- Why — Confusing for power users debugging share-links. Acceptable while
  v2 is a flag; once v2 is the default, drop the conditional.
- Severity — P3
- Status — Documented (resolves with v2 rollout).

### `/clients` list (`apps/app/src/routes/clients.tsx` + `ClientFactsWorkspace.tsx`)

Findings F-X01 / F-X02 / F-X03 above cover the main ones. Additional:

**F-C01** — Search has no debounce; every keystroke writes URL

- Location: `apps/app/src/routes/clients.tsx:226-232`
- What — `handleSearchChange` writes the URL on every keystroke. Because
  filtering is client-side over a max-500 slice, this isn't a perf concern,
  but it does mean the URL is twitchy in the address bar and history-stack
  grows fast.
- Why — `/deadlines` debounces via `useDebouncedQueryInput` (350 ms). /clients
  doesn't. Drift.
- Severity — P3
- Proposed fix — Apply `useDebouncedQueryInput` to the search URL write
  (filter input itself stays on every keystroke for responsive UI).
- Status — Documented (low priority — `history: replace` keeps the back
  stack clean already).

**F-C02** — `CLIENT_LIST_LIMIT = 500` is a silent ceiling

- Location: `apps/app/src/features/clients/client-query-state.ts:19`
- What — Hard slice at 500. No user-visible signal when the firm has more.
- Why — At 501 clients, the 501st silently disappears.
- Severity — P2 — rolls up into F-X17.
- Status — Documented as deferred.

**F-C03** — Search input height drift (`h-8` vs canonical `h-9`)

- Location: `apps/app/src/features/clients/ClientFactsWorkspace.tsx:1607`
- What — `className="h-8"` on the hand-rolled input; canonical SearchInput
  is `h-9`. Adjacent filter triggers are `h-8` (FilterTrigger).
- Why — Mixed heights in one toolbar = visual stutter.
- Severity — Subsumed by F-X02 (migration to SearchInput fixes the height).
- Status — Shipped (rolled into F-X02).

### `/rules/library` (`apps/app/src/routes/rules.library.tsx`)

**F-R01** — `entity` URL param is single, not multi

- Location: `apps/app/src/routes/rules.library.tsx:577`
- What — `parseAsString` for entity; allows only one entity at a time.
- Why — Limits filter expressiveness. /clients lets you pick multiple
  entities. /rules/library can't combine "show me Trust + Sole prop rules".
- Severity — P2
- Proposed fix — Migrate to `parseAsArrayOf(parseAsStringLiteral(ENTITY_KEYS))`.
- Status — Documented as deferred (refactor of EntityChipRow + filter logic).

**F-R02** — Legacy URL redirect path uses N>>1 params silently

- Location: `apps/app/src/routes/rules.library.tsx:213-241`
- What — `normalizeRulesLibrarySearch` rewrites several legacy params to
  `?q=`. Welcome behavior, but no telemetry tracks how often it fires; can't
  tell when the legacy params are extinct in the wild.
- Severity — P3
- Status — Documented.

### `/alerts` — see F-X07 and F-X13 above.

### `/audit` — see F-X01 (F-X06 main one — `q` parser is dead).

### `/notifications` — see F-X14.

### `/calendar`, `/workload`, `/members`, `/opportunities` — see F-X15.

### Command palette (`apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx`)

**F-CP01** — Placeholder "Navigate…" understates current scope (commands work too)

- Location: `apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx:274`
- What — Placeholder dropped "Search" intentionally (per the 2026-05-26
  comment) because entity search isn't wired. But the palette serves both
  _navigate_ and _trigger commands_ (Create deadline, Import clients, etc).
  Calling the input "Navigate…" hides the command half.
- Why — Phase-1 narrowed copy was justified; trade-off is "navigate" hides
  commands.
- Severity — P3 (Yuqi made this choice deliberately).
- Status — Documented (no change).

### Header multi-filter (`apps/app/src/components/patterns/table-header-filter.tsx`)

**F-HF01** — `DEFAULT_MAX_SELECTIONS = 16` silently caps

- Location: `apps/app/src/components/patterns/table-header-filter.tsx:45`
- What — User tries to add the 17th checkbox; it's `disabled`. There's no
  banner or tooltip telling them why.
- Why — At 16 selections the UX silently no-ops on the 17th click.
- Severity — P2
- Proposed fix — Add a footer line "Showing first 16 selections — refine
  the list to expand" when `atSelectionLimit && !checked`. Deferred (touches
  every multi-filter caller).
- Status — Documented as deferred.

**F-HF02** — Popover search input has no clear-X

- Location: `apps/app/src/components/patterns/table-header-filter.tsx:124-140`
- See F-X08.

### Combobox / select primitives

**F-CB01** — `ClientCombobox` has its own search-popover (no shared primitive)

- Location: `apps/app/src/features/clients/ClientCombobox.tsx`
- What — Internal `<CommandInput>` for searching the clients list. Different
  primitive than the page-level SearchInput; different visual chrome.
  Acceptable because Command primitives have their own design language, but
  worth flagging for the cross-surface inventory.
- Severity — P3
- Status — Documented (no fix — popover search is a different idiom).

**F-CB02** — `timezone-select` (firm) has no search affordance

- Location: `apps/app/src/features/firm/timezone-select.tsx`
- What — Renders ~24 timezones via plain `<Select>`; no typeahead.
- Why — 24 items is manageable; a typeahead would still help. Subsumed by
  the long-list filter convergence work.
- Severity — P3
- Status — Documented.

**F-DP01** — `iso-date-picker` uses native `<input type="date">`

- Location: `apps/app/src/components/primitives/iso-date-picker.tsx`
- What — Browser-native date input; cross-browser visual drift. Not a
  data-finding affordance per se, but listed here because the brief asks.
- Severity — P3 — out of scope.
- Status — Documented (no fix).

---

## Summary

- **Shipped (mechanically safe)** — F-X01 (label normalization on /clients +
  /audit + coverage-chip), F-X02 (SearchInput migration on /clients), F-X03
  (rolled into F-X02), F-X05 (a11y label mismatch), F-X06 (audit search
  input), F-X11 (coverage-chip localization), F-X12 (rolled into F-X01),
  F-X16 (hotkey help label normalization).
- **Documented / deferred** — F-X04, F-X07, F-X08, F-X09, F-X10, F-X13,
  F-X14, F-X15, F-X17, F-D01, F-D02, F-D03, F-C01, F-C02, F-R01, F-R02,
  F-CP01, F-HF01, F-HF02, F-CB01, F-CB02, F-DP01.

### Top 10 follow-ups (priority order)

1. **F-X07** — URL-sync `/alerts` filters (P1, share-link gap).
2. **F-X14** — Notifications inbox: read/unread tabs + pagination + search (P1).
3. **F-X04** — Re-pose `/` hotkey + kbd hint on /deadlines collapsed magnifier (P2).
4. **F-X17 + F-C02** — Surface the 500-client truncation; cursor pagination (P2).
5. **F-X09** — URL-sync filing-plan sort on `/clients/$id` (P2).
6. **F-HF01** — Surface the 16-selection ceiling in TableHeaderMultiFilter (P2).
7. **F-X10** — URL-sync expand/collapse state on `/rules/library` (P3).
8. **F-D02** — Collapse `?assignee=` + `?assignees=` legacy duo (P2 with
   redirect).
9. **F-R01** — Multi-entity URL param on `/rules/library` (P2).
10. **F-X13** — Add SearchInput to `/alerts` (P2, depends on F-X07).
    </content>
    </invoke>
