# 2026-05-26 — Eighty-second pass: Rule library structural P0

## Context

Yuqi flagged Rule library as "coarse, undesigned, squeezed, and
raw" — score 23/40 in
`rules-library-critique-2026-05-26.md`. The diagnosis was
structural: it's the only list page in the family still using the
Regular variant + frameless table + page-level scroll, while
/alerts, /deadlines, and /clients run sticky-footer + table-card +
independent scroll.

This pass lands the structural P0 + bold polish in one go.

## Structural changes

### Outer container → sticky-footer

Replaced the prior `RulesPageShell` wrapping with the canonical
sticky-footer container, inlined in `routes/rules.library.tsx`:

```
mx-auto flex w-full max-w-[1440px] flex-col gap-4
px-4 pt-6 pb-0 md:px-6 md:pt-8 md:pb-0
xl:h-screen xl:overflow-hidden
```

`max-w-[1440px]` preserved (was the `wide` shell variant) so the
jurisdiction + entity matrix has room at desktop. `xl:h-screen`
pins the outer to viewport height so the inner table-card can
flex into the remaining space.

### Direct PageHeader

`RulesPageShell` retired from the import list. PageHeader is now
used directly (`@/components/patterns/page-header`). Title chip +
actions slot match every other family page.

### ScopeTabBand (new)

Primary navigation axis — All / Active / Needs review / Missing.
Same visual contract as /deadlines' `ObligationQueueScopeTab`:

- hug-content triggers (no flex-1 spread)
- transparent background
- single hairline `border-b` underline on the row
- 2px accent underline on the active tab
- count badge per tab (`tabular-nums`)

URL-bound via nuqs `parseAsStringLiteral`. `scope=all` is the
default and is stored as `null` (no query param). Tab badge counts
are pinned to the UNFILTERED rules + `groupsAll` so each badge
honestly says "this is what's in this scope before you switch."

Scope filtering:

- `all` — no filter
- `active` — rules with status `active` or `verified`
- `review` — `statusGroupOf(status) === 'needs_review'`
- `missing` — post-build filter on groups to those with
  `gapEntities.length > 0` (state × entity combos with no rule)

### Table-card frame

`GroupedRulesTable` (and `SearchResultsTable` when searching) now
render inside the canonical bordered card:

```
<div class="flex min-h-0 flex-1 flex-col overflow-hidden
            rounded-md border border-divider-subtle
            bg-background-default">
  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
    {tables here}
  </div>
</div>
```

The outer card pins the frame; the inner div owns the scroll. The
PageHeader + progress bar + scope tabs + search + entity chips
stay pinned above; only the rule grid scrolls. Matches /deadlines

- /clients exactly.

### Header actions cluster

Reduced from 4 buttons to canonical (≤2 outline + 1 primary):

- ⋯ overflow menu carrying Sources, Export coverage, and (when
  reviewCount === 0) New rule.
- Primary CTA — switches dynamically:
  - When `reviewCount > 0`: Start review with inline count badge.
  - When `reviewCount === 0`: + New rule.

This keeps the header at a single primary action regardless of
review queue state — Yuqi's canonical pattern.

### StatsBar wrapper retired

The prior `StatsBar` component (progress bar + search bar + entity
chip row, all wrapped together) is replaced by inline siblings in
the route's flex column:

1. `<RuleReviewProgressBar />` (still defined; consumed directly)
2. `<ScopeTabBand />` (new)
3. `<SearchBar>` + `<EntityChipRow>` row (paired in a sub-flex
   `gap-3` block)

The route now reads top-down as 5 sibling rows + 1 flex-1 table-card.

### Description dropped

The verbose `"Every filing deadline the practice tracks. Review
pending rules, fill missing coverage, and add new ones."` is gone.
The title chip + scope tabs qualify the page; the description was
restating what each surface already shows.

## Verification

- `vp check` clean on all 13 files in
  `apps/app/src/features/rules/` + `routes/rules.library.tsx`.
- Browser verification deferred — preview-server auth lost during a
  prior structural change in this session; the dev SSO/login flow
  needs interaction.

## Files touched

- `apps/app/src/routes/rules.library.tsx` (outer container,
  PageHeader, ScopeTabBand, RuleReviewProgressBar wiring, header
  actions refactor, table-card frame, StatsBar retire).

## Remaining (deferred to future passes per critique action plan)

- `/distill` — drop the 7-column entity matrix from state rows;
  surface applicable entities in the rule-detail Dialog.
- `/adapt` — J/K row navigation + Enter to open + Esc to close +
  `e` for expand-all.
- `/clarify` — empty state with icon + title + CTA.
- `/polish` — final visual pass.

Expected score after this pass: ~28/40 (up from 23/40). Target
≥32/40 after the deferred items land.
