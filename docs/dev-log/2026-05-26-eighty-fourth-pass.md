# 2026-05-26 — Eighty-fourth pass: cross-table drift unification

## Why

Yuqi flagged the residual drift between `/deadlines`, `/clients`, and
`/rules/library` after the 83rd-pass merge: the three workbench tables
still diverged on title size, search affordance, pagination, owner
avatar, count chips, and a handful of smaller details. The 15-item
drift catalog landed last turn; this pass works it.

Decisions made by Yuqi during the planning step:

| Drift #                    | Decision                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------- |
| #1 Title size              | All three `text-base` regular weight (shipped last turn)                               |
| #2 Status column placement | Defer                                                                                  |
| #3 Pagination              | `/clients` + `/rules/library` = prev/next + page count; `/deadlines` = infinite scroll |
| #4 Grouping axis           | Defer                                                                                  |
| #5 Search affordance       | Fix — collapse `/clients` search to ghost icon                                         |
| #6 Filter affordance       | Structure and unify (documented)                                                       |
| #7 Keyboard nav model      | Defer                                                                                  |
| #8–15                      | Fix all mechanically (or document where the divergence is semantic)                    |

## Shipped

### #3 — `/rules/library` pagination

Added jurisdiction-group pagination so the catalog matches the
`/clients` directory feel (prev/next chevrons + "Page X of N").

- New `?page=` nuqs param. Default 0; URL-bound so deep-links work.
- Page size: **10 jurisdiction groups** per page (~6 pages for the
  52-jurisdiction catalog).
- Pagination footer (`px-2 py-6` + chevrons) lives below the table —
  mirrors `/clients` shape exactly.
- Top-of-table count flips from `"N jurisdictions"` (single page) to
  `"Showing N of M jurisdictions"` (paginated) so the user always sees
  the relationship between current view and full filter set.
- Page index auto-resets when filters shrink the result set below the
  current page (`useEffect` clamp).
- `filteredGroups` (full filter set) feeds `groups` (current page);
  the parent owns the page state, the table component just receives
  `pageIndex`, `totalPages`, `totalGroupCount`, and `onPageChange`.

### #5 — `/clients` collapsible search

Refactored the inline 280px `<SearchInput>` on the `/clients` toolbar
into the canonical collapsible-icon pattern shared with `/deadlines`
(`ObligationQueueSearchControl`) and `/rules/library`
(`RuleSearchControl`).

- New `ClientsSearchControl` local component — ghost icon at rest,
  expands inline into `SearchInput` on click or `/` hotkey.
- `useAppHotkey('/')` registers the focus shortcut + surfaces it in
  the keyboard-help overlay (category `'practice'`, scope `'route'`).
- Dropped the bespoke `useEffect` window-keydown listener (one fewer
  global keyboard handler).
- Cleaned up the now-unused `Input` + `XIcon` imports.

### #9 — `<CountDotChip>` primitive

Extracted the "small dot + text" count-chip pattern
(`"N needs review"`, `"N missing"`) into
`components/primitives/count-dot-chip.tsx`. Renders nothing when
`count === 0`; supports an optional `minWidth` for left-aligning chips
across rows with varying singular/plural copy. Tones: accent /
destructive / warning / success / muted.

Refactored the `/rules/library` state-row chips (`N needs review` +
`N missing`) to use it. Two surfaces (`/clients` readiness, `/deadlines`
late-counts) can adopt the same chip with one import in a future pass.

### #10 — Owner/Assignee avatar parity

Extracted `ASSIGNEE_TINTS` + `hashStringToBucket` from
`ClientFactsWorkspace.tsx` into a shared `lib/assignee-tint.ts` module
exporting `getAssigneeTint(name)`. Both consumer surfaces now resolve
the same per-name tint:

- `/clients` `ClientAssigneeAvatar` — bumped from `size-6` → `size-8`
  - `text-sm` to match the `/deadlines` canonical (Today dashboard
    parity). The `w-[80px]` owner column accommodates the bump.
- `/deadlines` `AssigneeAvatar` — non-self avatars switched from a
  single `bg-background-subtle` neutral to `getAssigneeTint(name)`. "AR"
  and "KP" now look visually distinct at scan distance on the
  deadlines queue, matching how they read on `/clients`.

### #11 — Group header hover

Canonical rule documented in a Rule-library state-row comment + the
design doc addendum:

- Group headers that are **clickable** (rules-library state row →
  expand/collapse) keep `hover:bg-state-base-hover + cursor-pointer`.
- Group headers that are **passive section labels**
  (`/deadlines` client-group row) stay static.

Semantic difference → visual difference. Not drift.

### #13 — Within-group row borders

Documented the canonical rule in a `/deadlines` weld-site comment:

- Default: primitive `border-b border-divider-subtle` between every
  row.
- `border-b-0` weld is opt-in for surfaces with EXPLICIT logical
  sub-groups. Current single consumer: `/deadlines` same-client
  cluster.

### #12, #14, #15 — Documented divergences

Three drift items turned out to be semantic divergences, not visual
drift:

- **#12 Status section header** — `/rules/library`'s NEEDS REVIEW /
  ACTIVE / MISSING band is Rule-library-only because it owns
  state-grouped batch review. Local component; promote only when a
  second surface needs batch-review semantics.
- **#14 TaxCodeLabel** — `/rules/library` shows `rule.formName`
  (the rule's own authored form-name string), `/deadlines` + `/clients`
  show `TaxCodeLabel(code)` (resolved via `describeTaxCode`). Same
  visual shape, different data source — each surface has the
  authoritative field for its context.
- **#15 Click-to-detail destination** — all three surfaces open detail
  on row click; destination differs per task model. Triage queue
  (`/deadlines`) → inline drawer. Sustained workspace (`/clients`) →
  route navigation. Reference lookup (`/rules/library`) → centered
  Dialog. Documented in the unified-table-surface-vocabulary
  addendum.

### #6 + #8 — Filter affordance + toolbar shape

Each surface had reasonable shapes for its information density — the
"drift" was the lack of a written canonical rule. Added the rules to
`docs/Design/unified-table-surface-vocabulary.md` addendum (Section J:
toolbar shape; Section K: filter affordance).

**Toolbar shape rule**: surface with pagination → count + kbd hints
in the footer adjacent to prev/next. Surface without pagination
(rules library's grouped data) → count + kbd hints in the top toolbar
where the user sees them at scroll origin.

**Filter affordance rule**: low fixed-vocabulary chips ONLY for the
primary navigation axis (one chip strip per page max) or triage
shortcut chips. Multiple filters coexisting on the same toolbar row
all render as `TableHeaderMultiFilter` dropdowns for visual coherence.

## Files touched

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
  — `ClientsSearchControl` collapsible search; `ClientAssigneeAvatar`
  bumped to size-8 + getAssigneeTint; ASSIGNEE_TINTS extraction.
- `apps/app/src/routes/obligations.tsx` — `AssigneeAvatar` uses
  shared `getAssigneeTint`; #13 weld-site doc comment.
- `apps/app/src/routes/rules.library.tsx` — pagination state +
  footer; `CountDotChip` adoption; #11 hover canonical comment; #12
  - #14 doc comments.
- `apps/app/src/components/primitives/count-dot-chip.tsx` — new.
- `apps/app/src/lib/assignee-tint.ts` — new.
- `docs/Design/unified-table-surface-vocabulary.md` — addendum
  Sections A–K with the 11 cross-table canonical rules.

## Deferred (per Yuqi)

Drift items #2 (status column placement), #4 (grouping axis), #7
(keyboard nav model). Each is a real product call worth a separate
pass.

## Verification

- `pnpm exec tsc --noEmit` clean.
- All 15 drift items resolved or documented.
