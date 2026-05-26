# Clients family — macro → micro consistency audit

**Date:** 2026-05-26
**Surfaces:** `/clients` (list) + `/clients/[id]` (detail)
**Method:** macro audit first (every shared component or pattern
across the two pages, scored against the canonical), then drill
into per-instance drift with file:line and a concrete fix.
**Rubric:** `docs/Design/page-family-canonical.md`
(prescriptive — token references override raw values).

The companion critique (`clients-family-critique-2026-05-26.md`)
covered usability + heuristics + IA. This doc is **purely about
visual consistency** — same conceptual element should render the
same way, with the same tokens, obeying the same restrictions.

Findings are mapped to a 4-priority severity scale:

- **P0** — Family-breaking. Shared pattern renders inconsistently
  between the two pages or between the Clients pages and the rest
  of the family (/today, /alerts, /deadlines, /rules/library).
- **P1** — Canonical-violating. Uses a retired pattern, a raw
  class instead of a token, or violates a "what NOT to use"
  restriction.
- **P2** — Token drift. Picks a similar-but-not-identical token
  (e.g. `gap-4` where canonical specifies `gap-6`).
- **P3** — Nitpick. Single-instance polish.

---

## §1. Macro audit — shared/cross-page components

For each row, "Same?" = does this component render identically
across the two Clients pages, AND match the canonical pattern?

| #   | Component / pattern                                 | List                                          | Detail                                                             | Same?  | Severity | Section |
| --- | --------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ | ------ | -------- | ------- |
| 1   | Outer container                                     | regular (`gap-4 pb-5`) ⚠️                     | regular (no `mx-auto` / `max-w-page-wide`) ⚠️                      | **No** | P0       | §2.1    |
| 2   | PageHeader shape                                    | title + 1 count chip ✓                        | title + 4 chip cluster ❌                                          | **No** | P0       | §2.2    |
| 3   | PageHeader title chip token                         | canonical ✓                                   | n/a (no count chip)                                                | ✓      | —        | §2.2    |
| 4   | PageHeader actions cluster                          | 2 outline buttons ✓                           | 1 overflow + 1 destructive button + 1 outline ⚠️                   | **No** | P1       | §2.3    |
| 5   | Identity chips (entity / state / owner / readiness) | rendered per row in table cells               | rendered in title cluster                                          | **No** | P0       | §2.4    |
| 6   | Owner display                                       | `ClientAssigneeAvatar` (size-8)               | `ClientOwnerHeaderPill` (pill w/ avatar)                           | **No** | P1       | §2.5    |
| 7   | Filter dropdowns                                    | `TableHeaderMultiFilter trigger="toolbar"` ❌ | n/a (no filters on detail)                                         | n/a    | P1       | §3.1    |
| 8   | Search input                                        | inline (PR #25, Phase 4) ✓                    | client name w/ `ClientTitleSwitcher` arrows (different pattern)    | **No** | P2       | §3.2    |
| 9   | Section heading style                               | n/a (table only)                              | `TabSection` h2 sm-semibold ✓ + several uppercase kicker labels ❌ | **No** | P1       | §3.3    |
| 10  | Data card frame                                     | frameless ❌                                  | n/a                                                                | n/a    | P0       | §3.4    |
| 11  | Table-header text style                             | uppercase tracked ❌                          | n/a                                                                | n/a    | P1       | §3.4    |
| 12  | Tab structure                                       | n/a                                           | 4 tabs, URL-bound ✓                                                | n/a    | —        | §3.5    |
| 13  | Section frame inside tab body                       | n/a                                           | mixed (some `bg-background-soft rounded-xl`, some flat) ⚠️         | n/a    | P2       | §3.5    |
| 14  | Token discipline (no raw hex)                       | ✓                                             | ✓                                                                  | ✓      | —        | §3.6    |
| 15  | Color reservation (red / amber / blue)              | needs-facts banner = amber ✓                  | readiness badge = destructive ⚠️                                   | ⚠️     | P3       | §3.7    |
| 16  | Empty state                                         | dashed-border in-table row ✓                  | per-tab empty (no canonical shape) ⚠️                              | **No** | P2       | §3.8    |

**Macro headline:** 6 of 16 dimensions ✓; 4 P0; 3 P1; 2 P2. The
two pages don't share a coherent visual identity. The detail
page especially carries 5+ pattern divergences from the
canonical.

---

## §2. P0 drift (family-breaking)

### §2.1 — Outer container

**Canonical** (`page-family-canonical.md` §2, regular variant):

```
mx-auto flex max-w-page-wide flex-col gap-6
px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6
```

**List** (`routes/clients.tsx:324`):

```tsx
<div className="mx-auto flex w-full max-w-page-wide flex-col gap-4 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-5">
```

Drift: `gap-4` (canonical `gap-6`), `pb-5` (canonical `pb-4 md:pb-6`).
The `gap-4` is a documented "density pass" deviation; the `pb-5` is
a half-step that doesn't match either the regular or sticky-footer
variant.

**Detail** (`routes/clients.$clientId.tsx:71`):

```tsx
<div className="flex flex-col gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6">
```

Drift: **missing `mx-auto`** and **missing `max-w-page-wide`** — the
page has no column-width constraint, so content extends to the
viewport width regardless of monitor. Inconsistent with every other
page in the family.

**Fix (both):** adopt the regular variant exactly. Drop the `gap-4`
density override on the list (rejoin the family `gap-6`). Add
`mx-auto max-w-page-wide` to the detail. Document any deviation
inline.

### §2.2 — PageHeader shape

**Canonical** (§3): title (noun) + 1 count chip + ≤2 outline
actions + optional 1-sentence description. Nothing else lives in
the header.

**List** ✓: `Clients [47]` + 2 outline actions. Matches.

**Detail** ❌: title cluster contains:

- Client name (with cycle arrows via `ClientTitleSwitcher`)
- Entity badge
- Owner pill (`ClientOwnerHeaderPill`)
- Filing state chips (multiple)
- Readiness badge (conditional)
- - Subtitle workplan-summary text below
- - 3 actions on the right (⋯ overflow + Archive + Create
    obligation)

**That's 5 distinct elements in the title cluster + 3 actions.**

**Fix:** title cluster reduces to title + 1 chip (per canonical).
The 1 chip should be **readiness** (most actionable status read).
Everything else moves to a metadata strip below the header
(merge with the existing `ClientContactMetaRow`):

```
PageHeader
  ↳ title: <ClientTitleSwitcher>{client.name}</ClientTitleSwitcher>
  ↳ 1 chip: <ReadinessChip>
  ↳ actions: ⋯ overflow (Archive lives inside) + "+ Create obligation"
ContactMetaRow
  ↳ Entity · States · Owner · Phone · Email
```

### §2.3 — Actions cluster

**Canonical** (§3 restrictions):

- ≤2 outline buttons. A third → ⋯ overflow.
- No `variant="default"` (solid) — those are page primary CTAs.
- No destructive actions in the visible cluster.

**Detail** ❌: 3 actions including a destructive Archive next to
the primary "+ Create obligation". Archive's destructive bg makes
it read as equal weight to creating work.

**Fix:** Archive moves INSIDE the ⋯ overflow. The visible cluster
becomes `[⋯ overflow]` + `[+ Create obligation outline]`.

### §2.4 — Identity chips: same data, two different render shapes

The list page renders entity + state + owner as **table cells**
(structured columns). The detail page renders the same data as
**title-cluster chips** (decorative pills).

This is conceptually fine — list = grid, detail = identification
— but the SHAPES diverge: list uses `StateBadge` (SVG flag + 2-
letter code), detail uses `ClientFilingStateChips` (plain text
chip). Same data, two different visual treatments.

**Fix:** detail page identity-chip cluster relocates to
`ContactMetaRow` (per §2.2). Adopt the list's `StateBadge` shape
there for visual consistency.

### §2.5 — Owner display

- List: `ClientAssigneeAvatar` — 32px circle, initials, color-hashed
- Detail: `ClientOwnerHeaderPill` — pill shape with avatar + name +
  optional unassigned amber

**Fix:** detail's owner moves to ContactMetaRow as
`<ClientAssigneeAvatar /> · <name>` — same shape as the list's
Owner column cell. Single owner-display vocabulary.

---

## §3. P1/P2 drift (canonical violations)

### §3.1 — Filter trigger primitive

`ClientFactsWorkspace.tsx:1497–1534` uses `TableHeaderMultiFilter
trigger="toolbar"` for the 4 filter dropdowns (Client / States /
Entity / Owner).

The canonical (§5) specifies `FilterTrigger` from
`@/components/patterns/filter-trigger`, which is what /deadlines,
/alerts, and /rules/library all use.

**Fix:** swap the 4 dropdowns to `FilterTrigger` wrapping a
`DropdownMenu` per the canonical snippet. `TableHeaderMultiFilter`
stays for the in-table column-header funnel-icon filters (a
different surface).

### §3.2 — Search input pattern

List: inline 280px text input with leading SearchIcon (PR #25).
Detail: `ClientTitleSwitcher` cycle-arrows on the client name.

These solve different problems (narrow vs. jump) but the **visual
vocabulary differs** — the list uses a search affordance, the
detail uses arrows-on-a-name. The arrows are discoverable only by
hover, which `page-family-canonical.md` §3 implicitly discourages
(actions should be obvious).

**Fix (deferred):** keep the cycle-arrows but surface them with a
visible discloser (e.g. ChevronUp/Down icons inline by the name
when there ARE neighboring clients). Out of scope for the macro
audit — flagged for the detail-page revamp.

### §3.3 — Uppercase kicker labels (§9 canonical restriction)

Per `page-family-canonical.md` §9: "❌ Uppercase kicker eyebrows
(`text-caption uppercase tracking-wider`). The family retired
this style. Use `--text-subsection-title` instead."

Violations in `ClientFactsWorkspace.tsx`:

| Line | Context                             | Snippet                                               | Fix                                                                                                           |
| ---- | ----------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1074 | TableHeader "Owner" label           | `text-xs font-medium tracking-wider uppercase`        | Replace with `text-sm font-medium normal-case tracking-normal text-text-secondary` (canonical TableHeader §6) |
| 3258 | "Active alerts for this client" h3  | `text-xs font-medium uppercase tracking-[0.08em]`     | Replace with `text-sm font-semibold text-text-primary` (canonical §9)                                         |
| 4560 | Tooltip "gap" caption               | `text-caption-xs uppercase tracking-wide`             | Replace with `text-xs text-text-tertiary`                                                                     |
| 4568 | Tooltip "Missing from this client"  | `text-caption-xs font-medium uppercase tracking-wide` | Replace with `text-xs font-medium text-text-secondary`                                                        |
| 4612 | "Suggested · # rules" section label | `text-xs font-medium tracking-[0.08em] uppercase`     | Replace with `text-sm font-semibold text-text-primary`                                                        |

(Exception: tax-code/state-code badges that ARE uppercase data
acronyms — `uppercase` on the code itself is fine. Section
LABELS that wrap uppercase are the violation.)

### §3.4 — Data card frame + table-header style

**Canonical** (§6): table wrapped in a bordered card
(`rounded-md border border-divider-subtle overflow-hidden flex
flex-col`); rows-area `flex-1 min-h-0`; pagination as a `border-t`
footer inside the card. TableHeader uses
`bg-background-default-dimmed`. Header text: `text-sm font-medium
normal-case tracking-normal`.

**List** ❌: table is frameless, sits directly on page bg.
TableHeader uses uppercase tracked caption. Pagination is a
sibling div with `border-t` only.

**Fix:** Phase 7 of the directory-pivot brief (already on the
roadmap). Adopt the table-card frame from /deadlines verbatim.
Switch TableHeader to canonical text shape.

### §3.5 — Tab body section-frame inconsistency

Each tab inside `ClientDetailWorkspace` uses `TabSection` for
heading (good — that's the canonical) but the section BODY frames
vary:

- Work tab: year-grouped panels with
  `bg-background-soft rounded-xl border-divider-subtle` ✓
- Client info tab: 5 flat sections, no frame ❌
- Discover tab: 2 flat sections, no frame ❌
- Activity tab: 3 sections, mixed (AI summary in a frame; notes +
  log flat) ❌

**Fix:** every section body inside a tab adopts the same frame
token (per `inset-surface-design-system.md`). Either all frames
or all flat — pick one and apply across all 4 tabs.

### §3.6 — Token discipline

✓ No raw hex in classNames (the audit found zero `bg-[#...]`,
`text-[#...]`, or `rgba(...)` violations in either file).
Comments mention hex values for design rationale but those don't
ship as styles.

### §3.7 — Color reservation

The detail page renders a "Add filing state" readiness badge with
`variant="destructive"` (red). Per the canonical §10:
"Reserved for: late dates, hard errors, blocked status." "Missing
a filing state" is closer to a **warning** (incomplete config,
not a destructive state). Should use `variant="warning"` (amber)
to match the needs-facts banner's tone.

### §3.8 — Empty states

**List** ✓: `ClientTableEmptyRow` (dashed border, py-8, tertiary text). Matches §11.

**Detail**: each tab has its own ad-hoc empty state. No shared
shape. Should adopt the canonical section-internal empty pattern
(`rounded-lg border-dashed border-divider-regular py-8`).

---

## §4. Component-by-component fix matrix

This is the actionable list. Apply in order; each row maps to
one (sometimes more) of the §2/§3 sections above.

| #   | Fix                                                                                  | Files touched                                                   | Severity | PR                  |
| --- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- | -------- | ------------------- |
| 1   | Drop `gap-4` + `pb-5` on list; rejoin canonical `gap-6 pb-4 md:pb-6`                 | `routes/clients.tsx`                                            | P0       | PR #25              |
| 2   | Add `mx-auto max-w-page-wide` to detail outer container                              | `routes/clients.$clientId.tsx`                                  | P0       | new                 |
| 3   | Reduce detail PageHeader title cluster → title + 1 readiness chip                    | `ClientFactsWorkspace.tsx` (ClientDetailWorkspace, ~L1999-2087) | P0       | new                 |
| 4   | Move Archive → ⋯ overflow on detail page                                             | same                                                            | P0       | new                 |
| 5   | Adopt `FilterTrigger` primitive on list-page toolbar (×4 dropdowns)                  | `ClientFactsWorkspace.tsx` (ClientsFilterToolbar, ~L1497)       | P1       | PR #25 Phase 6      |
| 6   | Wrap list table in canonical bordered table-card; canonical TableHeader text         | `ClientFactsWorkspace.tsx` (ClientFactsWorkspace, ~L1240-1300)  | P0       | PR #25 Phase 7      |
| 7   | Replace 5 uppercase kicker labels with canonical sm-semibold                         | `ClientFactsWorkspace.tsx` (lines 1074, 3258, 4560, 4568, 4612) | P1       | new                 |
| 8   | Unify section-frame across all 4 detail-page tabs (pick frame or flat)               | `ClientFactsWorkspace.tsx` (ClientDetailWorkspace tabs)         | P2       | new                 |
| 9   | Switch readiness "Add filing state" badge from destructive → warning                 | `ClientFactsWorkspace.tsx` (~L2078)                             | P2       | new                 |
| 10  | Adopt canonical empty-state shape across detail-page tabs                            | `ClientFactsWorkspace.tsx` (multiple tab bodies)                | P2       | new                 |
| 11  | Move detail-page identity chips (entity, states, owner, readiness) to ContactMetaRow | `ClientFactsWorkspace.tsx` (header cluster → ContactMetaRow)    | P0       | new (depends on #3) |

---

## §5. Implementation order

Two PRs:

### PR #25 (continue the directory pivot)

1. **Fix #1**: outer container correction (one-line in `routes/clients.tsx`)
2. **Phase 5 of brief**: `My clients` toggle chip
3. **Fix #5 / Phase 6 of brief**: FilterTrigger swap
4. **Fix #6 / Phase 7 of brief**: table-card frame + responsive page-size
5. **Fix #7 (list-only items)**: uppercase TableHeader label retire
6. Verification: re-run heuristic score (target 32+/40 on the list)

### New PR — Detail page revamp (5 rounds)

After PR #25 lands. Maps to the critique's 5-round revamp +
this audit's fixes:

- **Round A**: Fix #2 + Fix #3 + Fix #4 + Fix #11 (outer
  container; title cluster reduction; archive → overflow;
  identity chips → ContactMetaRow)
- **Round B**: Fix #7 (detail-only items 3258, 4560, 4568, 4612)
- **Round C**: Fix #8 — tab body section-frame consistency
- **Round D**: Fix #9 + Fix #10 — color tone + empty states
- **Round E**: Re-run `/critique` on both pages; target each ≥30/40

---

## §6. Decisions needed from Yuqi before code

Five micro-decisions, each unblocks one or more fixes above:

1. **Outer container `gap-4` density override** on the list — keep
   (intentional density pass) or revert to canonical `gap-6`?
   Fix #1 depends on this.

2. **Detail title-cluster chip** — which single chip survives?
   Recommended: **readiness** (most-actionable). Fix #3 depends.

3. **Section-frame style inside detail tabs** — all framed
   (Work-tab pattern: `bg-background-soft rounded-xl`) or all
   flat? Recommended: **all framed** for visual coherence,
   matches inset-surface canonical. Fix #8 depends.

4. **"Add filing state" badge tone** — destructive (current) or
   warning (recommended, matches needs-facts banner)? Fix #9
   depends.

5. **Cycle-arrows on the client name** in detail header — keep
   `ClientTitleSwitcher` (current) or hide behind ⌘K? Defer if
   unclear; this is a §3.2-flagged P2 not part of the macro
   findings.

---

## §7. Related docs

- `page-family-canonical.md` — the rubric. §2 outer container,
  §3 PageHeader, §5 FilterTrigger, §6 table-card frame, §9
  section heading scale, §10 color reservation, §11 empty
  states. Every fix above is a citation back to one of those
  sections.
- `clients-family-critique-2026-05-26.md` — companion critique
  scoring UX/heuristics. The recommendations map to the same
  PRs as this audit.
- `inset-surface-design-system.md` — frame tokens for §3.5
  section-frame consistency.
- `clients-list-and-detail-critique-2026-05-22.md` — prior
  critique; many items there are done; the remaining detail-page
  items intersect with the fixes here.
