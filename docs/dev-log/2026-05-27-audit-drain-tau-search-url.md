# Audit drain — agent τ (search / URL / filter)

Date: 2026-05-27
Branch: `design/audit-drain-tau-search-url`
Driver: Yuqi (cross-product IA audit, wave-5 drain pass).

Wave-5 mechanical drain on the Step 8 data-finding audit. Step 8
catalogued 31 search / URL / filter / sort findings; waves 1–4
shipped the high-leverage half (F-X01, F-X02, F-X03, F-X05, F-X06,
F-X11, F-X12, F-X16, F-CB01, plus R6.1 / R6.2 i18n drift on
ActiveFilterChip). This pass picks up the next mechanical batch.

## Shipped

### F-X14 — `/notifications` gets a SearchInput

- **Location** — `apps/app/src/features/notifications/notifications-page.tsx`
- **Was** — inbox had zero find affordance. Hard-coded `limit: 50,
  status: 'all'`; no filter, no search, no read/unread toggle. At
  any meaningful inbox depth the page becomes a scroll-and-pray
  surface.
- **Now** — canonical `<SearchInput>` at the head of the card, URL-
  bound to a `q` param (replace-history so the back stack stays
  clean), client-side filter over `item.title + item.body`. `/`
  hotkey wires through the primitive so the help dialog lists it
  under the `practice` category. Distinct empty state for the
  filtered-to-zero branch (mirrors `/audit` + `/alerts`).
- **Severity** — P1 (Step 8 ranked as feature gap; capped 50 still
  applies — read/unread tabs + cursor pagination are the larger
  follow-ups).

### F-HF02 + F-X08 — Multi-filter popover adopts SearchInput visual spec

- **Location** —
  `apps/app/src/components/patterns/table-header-filter.tsx:121-167`
- **Was** — raw `<Input className="h-8">` inside `TableHeaderMultiFilter`
  with no search icon, no clear-X. Page-level SearchInput primitives
  on `/deadlines` + `/clients` + `/rules/library` give CPAs an inline
  X to nuke the search; popover gave them nothing.
- **Now** — leading `<SearchIcon>`, trailing `<XIcon>` clear button
  matching the SearchInput primitive's visual spec (size-3.5 icon,
  size-3 X glyph). We do NOT fully adopt the primitive component —
  the popover has different keyboard contract needs (Escape must
  bubble so the dropdown closes; `/` hotkey wiring isn't
  appropriate). Visual parity without behavioural conflict.
- **Severity** — P3 (small drift, big "muscle memory" payoff).

### F-HF01 — 16-selection cap surfaces inline

- **Location** —
  `apps/app/src/components/patterns/table-header-filter.tsx`
- **Was** — `DEFAULT_MAX_SELECTIONS = 16` silently disabled the 17th
  checkbox. CPAs on a long-state filter (Texas + 16 jurisdictions
  selected, trying to add Wyoming) saw a greyed-out box with no
  explanation.
- **Now** — when `atSelectionLimit` is true, a `role="status"` line
  at the popover foot reads `Showing first ${maxSelections}
  selections — refine the list to add more.` The popover search
  input is the resolution path.
- **Severity** — P2.

### F-C01 — `/clients` search URL writes are rate-limited

- **Location** — `apps/app/src/routes/clients.tsx` (`handleSearchChange`)
- **Was** — every keystroke rewrote `?q=...`, twitching the address
  bar and growing the history-replace stack character-by-character.
  `/deadlines` already debounced its `q` writes via
  `queryInputUrlUpdateRateLimit` (350ms) — `/clients` drifted from
  the convention.
- **Now** — same `limitUrlUpdates: queryInputUrlUpdateRateLimit`
  pattern as `/deadlines`. nuqs returns the pending value
  optimistically during the rate-limit window so the visible
  SearchInput keeps repainting on every keystroke; the URL
  settles once typing stops. Clear (empty value) bypasses the
  rate-limit so X-click / Escape resolve immediately.
- **Severity** — P3.

### F-X05 sibling on `/clients` — collapsed/expanded accessible name unified

- **Location** —
  `apps/app/src/features/clients/ClientFactsWorkspace.tsx:1882-1900`
- **Was** — collapsed magnifier had `aria-label="Filter clients"`,
  expanded input had `ariaLabel="Search clients"` and
  `placeholder="Search by name or EIN"`. Screen-reader users heard
  two different control names for the same control depending on
  state — exact mirror of F-X05 (which fixed the same drift on
  `/deadlines`).
- **Now** — both states announce "Filter clients" via aria-label.
  Placeholder rewritten to `"Filter by name or EIN"` so the field
  hint stays useful for sighted users while the accessible name is
  consistent.
- **Severity** — P1.

## Skipped (documented as deferred — out of scope for the mechanical pass)

- **F-X07** — `/alerts` filter URL-sync (touches mutations + history-
  mode lock; ≥30 min refactor + tests per dev-log).
- **F-X09** — `/clients/$id` filing-plan sort URL-sync (separate
  route + would benefit from a shared sort-key contract with
  `/deadlines`).
- **F-X10** — `/rules/library` expand state URL-sync (P3; expand-all
  semantic edge cases need design).
- **F-X13** — `/alerts` top-level search (depends on F-X07).
- **F-X15** — calendar/workload/members/opportunities find
  affordances (per-surface design pass needed).
- **F-X17 + F-C02** — pagination convergence + 500-client truncation
  notice (architectural).
- **F-D01, F-D02, F-D03** — sort-default-deletion convention,
  `?assignee=` legacy duo, lifecycle=v2 sort default (all P3, all
  need redirect/compat work).
- **F-R01** — `entity` URL param array on `/rules/library` (EntityChipRow
  is single-select by design; multi-select needs UI rework).
- **F-R02** — legacy URL redirect telemetry (P3).
- **F-CP01** — command palette placeholder (deliberately narrowed
  per 2026-05-26 comment).
- **F-CB02, F-DP01** — timezone-select + iso-date-picker (P3 / out
  of scope per Step 8).
- **F-X04, F-X16 follow-ups** — `/` hotkey kbd-hint chip on
  collapsed magnifier (agent υ owns kbd-hint regions in this wave).

## i18n

6 new msgids extracted; zh-CN translations added:

- `Clear the search or try a different term to see the full inbox.` → 清除搜索或尝试其他关键词以查看完整收件箱。
- `Filter by name or EIN` → 按名称或 EIN 筛选
- `Filter inbox` → 筛选收件箱
- `Filter notifications` → 筛选通知
- `No notifications match your search.` → 没有通知与您的搜索匹配。
- `Showing first {maxSelections} selections — refine the list to add more.` → 已显示前 {maxSelections} 项选择 — 请细化列表以添加更多。

`pnpm i18n:compile --strict` passes; `pnpm exec tsc --noEmit` clean.
