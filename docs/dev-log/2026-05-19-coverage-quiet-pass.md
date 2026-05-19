---
title: 'Coverage: quiet pass — passive stats, thin group headers, glyph cells, white expanded panel'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Coverage: quiet pass

## Context

Five pieces of feedback on the row-expander build:

1. **Stats strip as filters felt over-complicated** — the user wanted
   the four pills to be plain summary, not toggle controls.
2. **Expanded row background should be white or very close to it.**
3. **Group-header band ("Rules" / "Entity coverage") was hard to
   read** — the two-row TableHeader had a visible border between rows
   and the group labels were the same weight as the column labels.
4. **Cell text was too repetitive.** Across 7 entity columns × 52
   rows, "Active / Review / No rule" pills repeated 364 times — a
   visual roar that drowned out the few cells that actually needed
   attention.
5. **"Open all in Catalog" CTA needed justification.** The user
   pushed: why leave Coverage to do work in another page?

## Change

### Stats strip → plain inline text

First iteration of this pass made the pills passive but kept the gray
pill chrome (`bg-background-subtle/60`). User feedback: that chrome
is still ugly. Second iteration strips it entirely — each stat is a
plain inline span: bold number + muted label, separated by generous
whitespace (`gap-x-7`). No box, no fill, just text.

| Before                                                         | After                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------ |
| Pills were `<button aria-pressed>` filter toggles              | Plain text spans, no chrome                                        |
| Active filter inverted to `bg-text-primary text-text-inverted` | N/A — no filter behavior                                           |
| `sources working` pill carried warning tint when count > 0     | Plain text (the dedicated source banner already carries the alert) |
| `bg-background-subtle/60 rounded-md px-3 h-9` chrome           | `inline-flex items-baseline gap-1.5 text-sm`                       |

`filter` URL state stays (so `?filter=attention` deep-links still work
and `ActiveFilterChip` still appears with a Clear button), but the
stats no longer set it.

### Group-eyebrow header strip → dropped

First iteration introduced a thin eyebrow row carrying "Rules" +
"Entity coverage" group labels above the column-label row. User
feedback: it's messy — short labels off-center over their colspans,
empty placeholders over Jurisdiction + Source. Second iteration
drops the eyebrow row entirely. Single-row header:
`Jurisdiction / Active / Pending / Source / LLC / Partner. / S-Corp /
C-Corp / Sole Prop / Individual / Trust`. The "Entity coverage" h2
above the section already names the grouping, and Active/Pending are
self-explanatory in a rules table.

### Text sizes — bumped up

Multiple base sizes were `text-[10px]` or `text-[11px]` — too small
to scan comfortably. Bumped to the Tailwind base scale:

| Element                                 | Before              | After                                                |
| --------------------------------------- | ------------------- | ---------------------------------------------------- |
| Column headers                          | `text-[11px]`       | `text-xs` (12px)                                     |
| Source descriptor in row                | `text-[12px]`       | `text-sm` (14px)                                     |
| Count cells (Active/Pending)            | `font-mono text-sm` | `text-sm tabular-nums` (system font instead of mono) |
| Source count badge                      | `text-[11px]`       | `text-xs` (12px)                                     |
| Expanded section eyebrows               | `text-[10px]`       | `text-xs` (12px)                                     |
| Rule titles + source titles in expanded | `text-xs`           | `text-sm` (14px)                                     |
| Source ↗ chip in expanded               | `text-[11px]`       | `text-xs` (12px)                                     |
| Source-status banner                    | `text-xs`           | `text-sm` (14px)                                     |
| Active-filter chip                      | `text-[11px]`       | `text-xs` (12px)                                     |
| Search input                            | `h-8 text-xs`       | `h-9 text-sm`                                        |

### Group header → thin eyebrow strip

`<TableHeader>` is now structured so row 1 is a 24-px (`h-6 py-0`)
eyebrow carrying just "Rules" and "Entity coverage", and row 2 is the
column-label row carrying Jurisdiction / Active / Pending / Source /
LLC / Partner. / S-Corp / C-Corp / Sole Prop / Individual / Trust.

Row 1 has `border-b-0` on the row itself so there's no horizontal line
between the eyebrow and the column labels — the two read as a single
header block. The header bg flipped from `bg-background-subtle/95
backdrop-blur` to `bg-background-default` (white) for cleaner contrast
on the small-cap labels.

Jurisdiction and Source moved out of `rowSpan={2}` cells and into row
2, with row 1 carrying empty placeholders. This decouples their
height from the eyebrow's height and keeps the column-label row a
consistent typographic strip.

### Entity cells → glyphs

`EntityCellContent` swapped from a 3-state pill grammar
(`Active` / `Review` / `No rule` text in tinted boxes) to a 3-state
glyph grammar:

| State               | Glyph                    |
| ------------------- | ------------------------ |
| `verified` (active) | green `CheckIcon` (✓)    |
| `review`            | orange `AlertCircleIcon` |
| `none` (no rule)    | muted em dash (—)        |

Each glyph carries a `title` for hover and an `sr-only` text label
for screen readers, so the semantics survive even though the visible
text doesn't. The total ink per cell dropped from ~28 px wide × 20 px
tall to a 16-px icon — across the full grid that's a tenfold
reduction in entity-cell "noise" while keeping per-cell click drills
intact.

### Expanded row → stacked, white panel

The two sections (Pending rules, Watched sources) used to sit
side-by-side in a 2-column grid. The user pointed out that
side-by-side layout implies a per-row relationship — readers'
eyes pair "rule N on the left" with "source N on the right" even
though there's no such correspondence (each pending rule already
carries its own per-row Source ↗ link to its actual citation).

Fix: drop the `md:grid-cols-2` grid; stack the two sections as
full-width blocks in a single `flex flex-col gap-5` column. Each
section reads as its own list, no horizontal-pairing illusion.

The expanded detail `<TableRow>` is `bg-background-default` (white).
The main row, when expanded, drops its `bg-background-subtle/60`
tint entirely and uses `border-b-0` so the main row + detail row
read as one continuous white block. The collapse/expand state is now
signaled by:

- The chevron rotation in the JUR cell (▶ → ▼)
- The detail row appearing below
- The chevron's `aria-expanded` and the `aria-label` flip

No tint required.

Inside the expanded panel the row hover-tints on items also lightened:
`hover:bg-background-default` → `hover:bg-background-subtle/40` so
the hover affordance reads against the white panel.

### Dropped "Open all in Catalog" CTA

Justification: the main row already carries a `Pending N` column that
drills to `/rules/library?library=pending_review&jur=X` — the same
destination the CTA pointed at. Two ways to do the same thing,
sitting on the same page, is just clutter. The expanded panel is now
purely about _seeing_ the rules in context (with per-rule Source ↗
links); when the user wants the full Catalog view, they click the
Pending count in the row.

The "+N more" overflow is now a plain count, not a link. (Future
follow-up: inline Accept/Reject inside the expanded panel will turn
this into a proper action surface, at which point we can re-evaluate
whether the Pending-count drill is still needed at all.)

## Files

- `apps/app/src/features/rules/coverage-tab.tsx`
- `apps/app/src/features/rules/coverage-tab.test.tsx` (header order updated to reflect new row layout)

## Verified

- `pnpm exec tsc -p apps/app/tsconfig.json --noEmit` → exit 0
- Browser preview at `/rules/coverage`:
  - Stats strip reads as plain summary: `3 Active rules`,
    `123 rules pending approval`, `77/88 sources working`,
    `52 All US jurisdictions` — no buttons, no warning tints
  - Source banner: `11 sources need attention →` still hugs content
  - Header: thin "RULES" / "ENTITY COVERAGE" eyebrow above the
    column-label row; no border between them
  - Entity cells: orange `AlertCircleIcon` (review), green `CheckIcon`
    (active), em dash (no rule) — California row shows the mix
    cleanly
  - Click California: row expands; detail row renders on white;
    PENDING RULES list with Source ↗ chips, WATCHED SOURCES list with
    external-link icons; no "Open all in Catalog" CTA
  - JS verification confirms `expandedBg = rgb(255,255,255)` and
    `expandedHasOpenCatalogCTA = false`

## Critique scores — est. delta

This pass primarily fixed:

- **Heuristic 8 (Aesthetic & Minimalist)**: 3 → 4 (glyph cells +
  passive stats remove substantial ink across the most-repeated grid
  region)
- **Heuristic 4 (Consistency & Standards)**: 4 → 4 (still consistent;
  glyph grammar is just as systematic as the pill grammar was)
- **Heuristic 6 (Recognition rather than Recall)**: 4 → 4
  (`title` tooltips + sr-only labels keep the semantics intact for
  first-time users)

Estimated total: **~35/40 — Good**.

### Rule-title search

The Coverage search box used to match jurisdiction code + name only.
A CPA typing "form 1040" got zero results, even though Federal has
that rule. Extended the filter to also fall through to rule-title
match across every rule in the jurisdiction (pending + active):

- Match jurisdiction code or name → keep row (early return)
- Otherwise match any rule title for that jurisdiction → keep row
- Otherwise drop

A new `searchExpanded` set auto-expands rows whose match came from a
rule title rather than the jurisdiction itself — without it, the user
would see "FED" in the results and have no idea why. Auto-expanded
rows merge with the user's manual `expanded` set as a union, so manual
expansions and search-driven expansions coexist cleanly.

Search placeholder updated: `"Search jurisdictions or rules…"`. The
match is case-insensitive substring (no fuzzy yet — can upgrade if
substring proves insufficient).

### Rule detail — inline, not a drawer

First wiring of Catalog → Coverage opened the existing
`RuleDetailDrawer` (a `<Sheet>` slide-over with a dark overlay mask)
when the user clicked a pending rule. User feedback: the slide-over

- mask felt **isolated** — like a separate dialog cut off from the
  table context, when the whole point of folding Catalog into Coverage
  is to make the action feel integrated.

Second iteration removes the drawer entirely. The rule detail now
expands **inline** within the rules list:

- `RuleDetailDrawer`'s body was extracted into an exported
  `RuleDetailInline` component (in `rule-detail-drawer.tsx`) — same
  section list (Applicability, Due-date logic, Extension, Review
  reasons, Evidence, Candidate review with Accept/Reject,
  Verification footer), but without the `<Sheet>` wrapper or
  `<SheetHeader>`/`<SheetTitle>` primitives.
- Each pending rule in the expanded row is now a `PendingRuleItem`
  with its own collapsible state: chevron + title (clickable to
  toggle) + Source ↗ chip. When expanded, `RuleDetailInline`
  renders directly below with a left-border + indent so it
  visually nests under the rule it belongs to.
- The drawer's `acceptTemplate` / `rejectTemplate` mutations carry
  over unchanged because they live inside `CandidateReviewSection`,
  which is part of `RuleDetailInline`. Cache invalidation
  (`rules`, `audit`, `obligations`, `dashboard`) still flows so
  Coverage's pending count, entity glyphs, and source banner
  refresh automatically.
- The page-level `selectedRuleId` state is gone — expansion is now
  local to each row, so multiple rules across multiple jurisdictions
  can be compared inline without one closing the other.

No drawer, no overlay mask. Clicking a rule pushes the next rule
down a bit; the surrounding table stays visible above so the action
never leaves the matrix context.

The Library page still uses `RuleDetailDrawer` (now a thin wrapper
that puts `RuleDetailInline` inside a Sheet) — no regression there.

### Inline detail — compact variant

First inline pass reused `RuleDetailInline` directly. Each expanded
rule rendered ~28 lines of detail (full applicability grid, due-date
section, extension section, needs-review callout, evidence card,
practice review, verification footer). With a jurisdiction like
California having 7 pending rules, the row got unmanageably tall and
the surrounding table context disappeared off-screen.

Added a `RuleDetailCompact` export to `rule-detail-drawer.tsx` that
keeps only what a CPA needs at-a-glance to Accept or Reject:

| Kept                            | Reason                                                                  |
| ------------------------------- | ----------------------------------------------------------------------- |
| Rule ID + version + status line | Audit reference for the decision                                        |
| One-line applicability          | Jurisdiction · entity · form · event · year span — what the rule covers |
| Due-date logic                  | When the deadline lands                                                 |
| Extension policy (compressed)   | Yes/no + notes inline                                                   |
| Evidence card(s)                | The audit trail the decision rests on — kept verbatim                   |
| Accept / Reject buttons         | The action                                                              |

| Dropped                                              | Reason                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| Tax type code (`ca_state_individual_income_tax`)     | Engineer-facing identifier, not part of the review decision |
| Multi-row applicability grid                         | Folded into the one-line summary                            |
| Standalone "Needs review" callout                    | Redundant with the status pill in the header                |
| Verification footer (Reviewed by / at / Next review) | Audit history — not part of the Accept/Reject decision      |

Coverage's `PendingRuleItem` first rendered `RuleDetailCompact`
inline. Total height per expanded rule dropped from ~28 lines to
~12 lines. But the next user-feedback turn revealed the underlying
problem: even compact, inline detail competes with the table for
vertical space, and clicking from rule to rule means accordion-style
collapse/expand churn that's hard to scan.

### Rule detail — docked side panel, part of the layout

Final move: the rule detail goes to a **docked right panel** that's
part of the page layout, not an overlay. The table sits on the left
at `flex-1 min-w-0`; when a rule is selected, a `<aside>` panel
(420px wide, `sticky top-4`, its own scroll) opens to the right of
the table. When no rule is selected, the table reclaims full width.

Differences from the earlier drawer:

| Drawer                           | Docked panel                                      |
| -------------------------------- | ------------------------------------------------- |
| `<Sheet>` overlay with dark mask | `<aside>` as a flex sibling — no mask             |
| Floats on top of the page        | Part of the page layout                           |
| Page behind feels frozen         | Page behind stays interactive                     |
| Modal — Escape closes it         | Persistent — X button or click same rule to close |
| Action feels isolated            | Action feels integrated with the table            |

State pattern: `selectedRuleId` lives in `CoverageTab`; `selectRule`
toggles (click same rule twice to close). `PendingRuleItem` is now
a plain selectable row — selected state shows as a left-bar +
`bg-state-accent-tint/40` so the user can see which row the right
panel is showing. No inline detail expansion anymore.

The panel's `RuleDetailCompact` body is unchanged from the earlier
compact pass (rule ID line, one-line applicability, due-date,
extension, evidence card, Accept/Reject). Library still uses
`RuleDetailDrawer` for now — no regression.

**Trade-off resolved**: when the panel is open, the entity columns
(LLC / Partner. / S-Corp / C-Corp / Sole Prop / Individual / Trust)
hide and the table contracts to the four core columns: Jurisdiction
/ Active / Pending / Source. The user is in review mode (not
matrix-scan mode) when the panel is open, so entity coverage isn't
decision-critical mid-review; closing the panel snaps the matrix
back. Driven by a single `panelOpen` flag in `CoverageTab` that
flows into `visibleEntityColumns` and `totalColumnCount`, both
passed down to `CoverageRow` and `ExpandedRowDetail`.

The rule-detail panel itself also needed wrap fixes for narrow
widths: added `min-w-0` on grid items (CSS grid items default to
`min-width: auto`, which would let long mono identifiers overflow
the panel right edge), `grid-cols-[88px_minmax(0,1fr)]` (the
`minmax(0,1fr)` is the canonical fix for tracks that should shrink
below content width), `break-all` on the rule ID, and `flex-wrap`
on the header so the long `rule.id · v1 · pill` row reflows to
two lines instead of forcing horizontal overflow.

### Review-mode focus

When a rule is selected, the user is in "check + review + decide"
mode — orientation chrome is just visual noise stealing vertical
space. Hidden in review mode:

- Stats strip (`3 Active rules / 123 rules pending approval / ...`)
- Source-status banner (`11 sources need attention →`)
- "Entity coverage" h2 label (the entity columns are also hidden,
  so the label would point at nothing)

Kept in review mode: search input (so the user can hop to another
rule), active-filter chip (the filter still affects what's visible),
breadcrumb + sidebar.

Selected rule item also got a presentation tune-up:

- Row height bumped from `py-1` to `py-2` so the click target reads
  as a proper row, not a tight one-line link
- Dropped the `border-l-2` accent bar and the inner button `px-2`
  so the rule title text starts flush at the same x as the
  "PENDING RULES" eyebrow (verified: both at x=289 in the layout
  test)
- Selected state shows as `bg-state-accent-tint/50` + accented
  `text-text-accent` on the title for clearer contrast

Panel itself: `min-h-[calc(100vh-2rem)]` so the white panel card
reads as a tall column filling the viewport even when the rule's
content is short, instead of ending awkwardly mid-page.

### Review mode — left side becomes a queue, not a matrix

Final pass on review-mode focus: the coverage table (Jurisdiction /
Active / Pending / Source) was still on the left while the panel was
open. Those columns are matrix-scan chrome — orientation, not action
— and once the user has committed to reviewing a specific rule, they
add no value. What actually helps the daily triage flow is **fast
hop between pending rules**.

So in review mode, the table is replaced wholesale by a
`PendingRuleQueue` rail:

- 320px wide, sticky, scrolls within itself
- Header: `PENDING REVIEW QUEUE · {N} rules` (total pending across
  all jurisdictions)
- Grouped by jurisdiction: each section header carries the JUR
  badge + jurisdiction name + pending count
- Per-rule rows reuse the same `PendingRuleItem` component (so
  selection state, hover treatment, source-↗ chip all carry over
  from the table view)
- Empty state: `"No pending rules to review."`

What's gone from the left side in review mode:

| Hidden                 | Why                                                       |
| ---------------------- | --------------------------------------------------------- |
| Active count column    | Already-accepted rules aren't part of the triage decision |
| Pending count column   | Folded into the per-jurisdiction header `(N)`             |
| Source descriptor      | Per-rule citation is already in the panel's evidence card |
| Entity coverage matrix | Coverage scan isn't the active task                       |
| Source-attention badge | Out of scope for rule review                              |

What stays: jurisdiction badge + name (visual grouping anchor),
rule titles (the navigation targets), source-↗ chip per rule.

### Panel — vertical section layout

The earlier `grid-cols-[88px_minmax(0,1fr)]` was eating ~25% of
panel width for the section labels (Applicability, Due date,
Extension, Evidence). Switched to vertical: label sits above
content, content gets the full panel width. Long due-date
paragraphs and evidence excerpts now wrap less, often fitting on
one or two lines instead of three or four.

The panel itself widened from a fixed `w-[420px]` to `flex-1
min-w-0` so it absorbs the space freed by replacing the 11-col
table with the 320px rail. On a 1440px viewport the panel is now
~816px wide (was 420px) — nearly double — and the evidence card,
applicability one-liner, and due-date paragraph all read
comfortably.

### Mode indicator — explicit eyebrow in the panel header

Added a small `REVIEWING RULE` eyebrow in `text-text-accent` above
the rule title in the panel header. The combination of:

- Replaced table → narrow queue rail
- Hidden orientation chrome (stats, banner, h2)
- Docked detail panel with `REVIEWING RULE` eyebrow

...makes the mode unambiguous. The user knows they're in review
mode; closing the panel (X button or click same rule again) snaps
everything back to the matrix view.

### Pending-rule item — taller + flush-left

- Row height bumped: `py-2` (was `py-1`)
- Dropped the `border-l-2` accent bar and inner button `px-2` so
  the rule title text starts flush with the section eyebrow
  (`PENDING RULES` / jurisdiction header). Verified at x=289 in
  the layout test.
- Selected state: `bg-state-accent-tint/50` + `text-text-accent` +
  `font-medium` on the title for unambiguous contrast.

### Unified review workspace — one white surface, not two cards

User flagged that the queue and panel both living in their own white
cards with their own borders looked like "two cards", not one
workspace, and that having two independently scrollable regions on
top of a page that could also scroll was confusing.

Refactor: the review-mode layout now renders a single
`<div aria-label="Review workspace">` containing both the queue
(left) and the rule detail (right). The workspace owns the white
background + rounded corners + sticky positioning + viewport-height
sizing. Each half is just a flex column inside it, with a vertical
`border-r` between them as the divider.

`PendingRuleQueue` and `RulePanel` were each refactored to return
their content as a Fragment (header + scrollable body) instead of
their own `<aside>` with their own bg/border/rounded chrome — the
workspace shell does that work once at the outer level.

Net effect:

- One visual "card" instead of two
- Vertical divider in place of two outer borders
- Scrollable regions reduced from 3 (page + queue + panel) to 2
  (queue + panel within the workspace) since the workspace itself
  doesn't scroll
- The two halves stay flush against each other; no mismatched
  borders or wasted gap

The remaining page-level scroll source (the route-level "Rules"
title + description above the workspace) requires URL state to
hide. Deferred as before.

### Review-mode banner + queue title de-duplication

Two cleanups on the review surface:

**Banner.** Added `ReviewModeBanner` at the top of `CoverageTab`
while a rule is open. Reads `REVIEW MODE · {rule.title}  [× Exit
review]`. Replaces the stats strip in review mode. Functions as a
soft breadcrumb (announces the mode + carries context) and as an
escape hatch (Exit Review button). The page-level chrome above
(Rules h1 + description) is preserved on purpose — they form the
"home" the user can navigate back to.

**Queue de-duplication.** Rule titles in the queue used to read
`Alabama individual income tax return applicability` /
`Alaska individual income tax return applicability` /
`Arizona individual income tax return applicability` — the
jurisdiction is already the section header above each rule, so the
prefix was pure visual chatter. `PendingRuleItem` now strips the
jurisdiction-name prefix at display time, falling back to the full
title when the prefix doesn't match (defensive). Hover tooltip
(`title={rule.title}`) still carries the full title.

Within California, the seven pending rules now read clearly:

```
individual income tax return applicability
individual estimated tax payment schedule
LLC Form 568 return
LLC annual tax payment
LLC estimated fee payment
S corporation Form 100S return
C corporation Form 100 return
```

The entity type (individual / LLC / S-corp / C-corp) is now the
first scannable token — exactly what differentiates the rules.

### URL state for `?rule=...` + page-level chrome collapse

Lifted `selectedRuleId` from local `useState` to nuqs `useQueryState`
with key `rule`. Both `CoverageTab` (writes) and the route
`rules.coverage.tsx` (reads) now reference the same URL-backed
state. Three benefits:

- **Survives refresh.** A user mid-review who hits ⌘R lands back
  in the same rule's review surface.
- **Deep-linkable.** `/rules/coverage?rule=ca.individual_income_return.candidate.2026`
  drops a teammate straight into the right rule.
- **Lets the route file know review mode is active.** The route
  reads the URL state and passes `compact={inReview}` to
  `RulesPageShell`, which conditionally collapses its title +
  description header. That gives the review workspace nearly the
  full viewport height.

`RulesPageShell` now accepts an optional `compact` prop. When true,
the page header is wrapped in a `overflow-hidden transition-all
duration-300` container that goes `max-h-[200px] opacity-100 → max-h-0
opacity-0`. The collapse is animated, not abrupt.

### Smooth mode transitions

Both the page-level header (Rules h1 + description) AND the in-tab
chrome (stats strip ↔ review banner, source-status banner) now
animate when entering / exiting review mode. Pattern:

- Wrapping container has `overflow-hidden transition-all
duration-300 ease-in-out`
- Two states: normal (`max-h-[80px] opacity-100`) and compact
  (`max-h-0 opacity-0`)
- `aria-hidden` flips with state so screen readers track the
  collapse

The stats strip and review banner are now in two sibling slots
that cross-fade — both remain mounted so the transition can run
both directions. The source banner collapses similarly.

The combined effect is a coordinated cross-fade between matrix
view and review view instead of an abrupt content swap.

### Catalog hidden from sidebar

`Catalog` (`/rules/library`) was the parent of `RuleDetailDrawer`
back when Coverage and Catalog were two separate surfaces. Now that
Coverage absorbs the daily Accept / Reject flow (via the docked
panel + inline `RuleDetailCompact`), Catalog is no longer the
primary entry point and showing it in the sidebar suggested it was
a distinct surface to use.

Removed the entry from the `rules` nav group in
`apps/app/src/components/patterns/app-shell-nav.tsx`; deleted the
now-unused `LibraryIcon` import. The route stays in place so
direct links and existing bookmarks still resolve — only the
sidebar nav entry is gone.

### Triage flow — keyboard nav, auto-advance, skip, queue position

The critique called out workflow ergonomics as the biggest score-
mover. Six related changes ship together to turn the review surface
into a real triage loop:

1. **Auto-advance after Accept / Reject.** `RuleDetailCompact`
   accepts an `onActionComplete?` callback that threads through
   `CandidateReviewSection` → `CandidateReviewForm` and fires in
   each mutation's `onSuccess`. `CoverageTab.advanceAfterDecision`
   then jumps to the next pending rule in queue order — or closes
   the panel if the queue is empty.
2. **Skip → go to next pending without acting.** A `Skip ›` button
   in the panel header (next to the X) advances to the next rule.
   No state change to the skipped rule — pure navigation.
3. **Queue position indicator.** The `REVIEWING RULE` eyebrow now
   reads `REVIEWING 2 OF 123` so the reviewer always knows where
   they are in the burndown. Falls back to plain "Reviewing rule"
   when the position is unknowable.
4. **Keyboard shortcuts.** `j` / `↓` next, `k` / `↑` previous,
   `Esc` exit. Global keydown listener registered only when the
   panel is open; ignored when focus is inside `input` /
   `textarea` / contenteditable.
5. **`pendingQueue` flat list.** New memo that flattens
   `rowsByJurisdiction × pendingRulesByJurisdiction` into the same
   order the queue rail renders, so all three helpers (`goNext`,
   `goPrev`, `advanceAfterDecision`) share one source of truth.
6. **Fade-in on rule swap.** The panel content uses
   `key={rule.id}` + `animate-in fade-in duration-150` so each new
   rule fades in instead of snapping — small but settles the eye
   as the user sweeps through the queue.

### Decoded the matrix glyphs

The critique flagged a P1: "Entity-column abbreviations and the
orange / green / em-dash glyphs read flat to a first-timer." Added
a tiny `EntityCoverageLegend` line between the source banner and
the table in matrix mode:

```
LEGEND  ✓ Active rule  ⊕ Needs review  — No rule
```

Sits below the source banner so the legend is in view when the user
first sees the matrix. Reusing `CheckIcon` and `AlertCircleIcon`
from `EntityCellContent` so the icons in the legend are byte-for-
byte what the table shows.

### Made the action's downstream impact concrete

The P1 finding "Accept is a one-click destructive-ish primary with
no preview" — the practice-review prose used to read "Accepting
activates this rule exactly as shown." Now reads:

> Accepting activates this rule for every client filing in {jurisdiction} as {entity}.

Pulls `rule.jurisdiction` + `rule.entityApplicability` directly,
so the reviewer sees the actual blast radius (state + entity set)
in plain English before clicking. Doesn't enumerate exact client
counts — that would need a server-side aggregation we don't have —
but it converts a vague "this rule will be active" into a concrete
"this rule will apply to AK individual filers."

### Source attention has CPA-hours sense

The P-flag "Jordan sees the orange pill but has no sense of how
many CPA-hours it implies." Source-status banner now reads:

> 11 sources need attention · ~35 min

Heuristic: ~3 minutes per source (open URL, scan for changed
section, decide acknowledge/edit), rounded to nearest 5 min, with
a 5-min floor. Cheap; gives the urgency a unit.

### Backend-required follow-ups

Not addressed because they need server work:

- **Prior-version diff** ("Alex wants to know what changed since I
  last reviewed this rule") — needs rule-version history on the
  contract.
- **"Started but not decided" filter** — needs persisted per-user
  review-state, not just the in-memory selection state we have.

Both are flagged in the dev log; ship them when the contract is
ready.

### Reverted: pending stat is no longer clickable (consistency over redundancy)

First iteration of the direct-entry work made the `123 rules
pending approval` stat clickable AND added the primary CTA below
— two paths to the same place. User pointed out the inconsistency:
the other three stats (3 Active / 77/88 sources / 52
jurisdictions) sit at the same visual hierarchy but don't have any
action, so making one of them clickable while the others aren't
violates affordance consistency. Visually-identical things should
behave identically.

Drop the click handler from the pending stat. All four stats are
now uniformly passive summary text. The `StartReviewCTA` button
below remains as the single, unambiguous entry point. `Stat`
component lost its optional `onClick` prop; `StatsStrip` lost its
`onStartReview` prop.

### Direct entry to review — primary CTA + clickable stat

The critique flagged that the daily task is processing the 123-item
pending queue but the page defaulted to the matrix view, requiring
2–3 clicks (expand jurisdiction → click rule) to even start
reviewing. Added two entry paths to review mode, both wired to the
same `startReview()` callback (selects the first pending rule in
jurisdiction order):

1. **Primary CTA** — `<StartReviewCTA>`: a dark primary button
   reading `Review 123 pending rules →` sitting directly under the
   stats strip. Only renders when there's something pending. This is
   the obvious affordance — visible immediately on landing.
2. **Stat-as-action** — the `123 rules pending approval` stat in the
   stats strip is now a `<button>` (with the same passive type
   styling) that also enters review. Subtle, for users who intuit
   that numbers should be clickable.

`firstPendingRule` is a `useMemo` over `rowsData × pendingRulesByJurisdiction`,
hoisted above the loading/error early-returns so the hook order
stays stable across renders (React Rules of Hooks).

Closes Critique P0/P1 around "matrix is the default but review is
the actual job" — users now see and reach the queue without
deliberate hunting.

### Eliminated the top-of-page dead space in review mode

Even after collapsing the page header (h1 + description) and the
stats strip to `max-h-0`, a noticeable empty band remained above
the workspace. Cause: a `max-h-0 opacity-0` div is still a flex
child, so its parent's `gap-6` (24px) was reserved on both sides of
it — ~48px of dead space at the top of the page.

Trade-off accepted: drop the smooth fade-collapse for these wrappers
in favor of conditional rendering (`{!compact ? <Header /> : null}`,
`{!panelOpen ? <StatsStrip /> : null}`). The mode transition is now
abrupt for those two elements, but the static review state has zero
dead vertical space — measured 24px from the top of the scrollable
main to the top of the workspace (just the page's `py-6` padding).

The smooth cross-fade for the workspace itself (matrix view ↔ queue+
panel) is unaffected; only the unmounted-when-not-needed chrome
elements lost their animated collapse.

### Dropped the review-mode banner entirely, single exit path

User feedback (paraphrased): the banner repeats the rule title that's
already in the panel header, gives a second way to exit (which
competes with the panel's X button), and adds chrome above the
workspace that the layout already implies. "Don't give multiple
options. Make it intuitive."

So:

- **Banner deleted.** The workspace card itself signals review mode
  — the layout swap (matrix → queue + panel), the collapsed page
  chrome, the URL state, and the `REVIEWING RULE` eyebrow in the
  panel header all already say "you are reviewing." Adding a
  separate strip saying the same thing was just noise.
- **Single exit: the X in the panel header.** Closing the panel
  clears `?rule=` and snaps the page back to the matrix view.
  "Close detail" is the universal pattern users know.
- The `ReviewModeBanner` component is gone; the cross-fade slot it
  shared with the stats strip collapsed into a single conditional
  collapse for the stats strip.

### Hide scrollbars in the workspace

Both internal scroll regions in the workspace (the queue rail's
overflow + the panel body's overflow) now use
`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden` so the
scrollbars disappear visually while the regions remain scrollable
via wheel / trackpad / keyboard. Tighter, less chrome.

### Tighter panel hierarchy

- Audit meta line bumped down a tier: `text-xs text-text-tertiary` →
  `text-[11px] text-text-muted`. Reads as a sub-caption under the
  title instead of a competing header.
- Section gap bumped from `gap-4` → `gap-5` for more breathing room
  between Applicability / Due date / Extension / Evidence /
  Practice review blocks.

### Closed the banner-to-workspace gap in review mode

After landing the review-mode banner + chrome-collapse, a noticeable
empty band sat between the banner and the workspace. Cause: the
section's flex container kept rendering (1) the search-row wrapper
with the `Entity coverage` h2 hidden but the search still occupying
its right edge — leaving the left side blank — and (2) the
collapsed source-banner wrapper that, even at `max-h-0`, still ate
two `gap-3` slots in the parent flex column.

Two fixes:

- The section header (`<h2>Entity coverage</h2>` + search input +
  source-status banner) now renders ONLY in matrix mode. In review
  mode the section is just `<workspace />`, so there's no extra
  layout slot to collapse.
- The search input moves into the queue header inside the workspace
  rail. It becomes the queue's filter (where you'd expect it to be)
  and sits full-width inside the 320px rail right below the
  `PENDING REVIEW QUEUE · {N} rules` label.

`SearchInput` got an optional `fullWidth` prop so the queue version
fills its container and the matrix-mode version keeps its fixed
260px width. Net: zero dead vertical space between the review-mode
banner and the workspace.

### Blue restraint + visual hierarchy

User feedback: blue was doing too much — labeling mode, indicating
selection, marking status, marking links, AND being the primary CTA.
When everything is blue, nothing is the primary signal. Tightened
the colour budget:

| Element                                 | Before                                | After                                               |
| --------------------------------------- | ------------------------------------- | --------------------------------------------------- |
| `REVIEWING RULE` eyebrow (panel header) | `text-text-accent`                    | `text-text-tertiary`                                |
| `REVIEW MODE` eyebrow (banner)          | `text-text-accent`                    | `text-text-tertiary`                                |
| Review-mode banner background           | `bg-state-accent-tint/40`             | `bg-background-subtle/60`                           |
| Exit review button                      | `text-text-accent`                    | `text-text-secondary` (accent on focus only)        |
| Selected pending-rule title             | `font-medium text-text-accent`        | `font-semibold text-text-primary` (+ bg-tint)       |
| Accept rule button                      | accent (primary)                      | **kept** — single accent CTA                        |
| Source ↗ chip in queue                  | tertiary (kept)                       | (no change)                                         |
| `Needs review` status pill              | `text-status-review` (semantic token) | **kept** — status colour is meaning, not decoration |

Net effect: blue now reliably signals "this is an action" or "this
is a status," not "this is interesting."

Visual hierarchy fix on the panel: the rule title bumped from
`text-sm font-medium` to `text-base font-semibold`, with the
`REVIEWING RULE` eyebrow on the line above as a quiet label. The
title is now visually the heaviest element on the panel, which
matches what it is informationally. Header padding bumped from
`py-3` to `py-4` to give the title more breathing room. Reading
order top-down:

1. Title (text-base, semibold) — the rule under review
2. Audit meta line (rule ID + version + status pill, text-xs muted)
3. Section labels (10-11px uppercase, text-muted)
4. Section content (text-sm, text-primary)
5. Card sub-meta (retrieved/updated dates, text-xs tertiary)

The five tiers are now visually distinct without competing for
attention.

### Open

- **Queue title restructuring** — for further density reduction the
  rule items could become `[entity-badge] Form name` style (e.g.
  `[LLC] Form 568`) instead of prose titles. Bigger surgery; defer
  until prefix-stripping proves insufficient.
- **Keyboard nav for the queue** (j/k / arrows + Enter to accept)
  would tighten bulk triage further.
- **Page-level scroll in review mode** — the workspace is sticky
  with `min/max-h-[calc(100vh-2rem)]` and the page chrome above is
  now collapsed, so on a normal viewport the page rarely needs to
  scroll. But it CAN if the workspace's max-height is exceeded
  (very tall viewport + collapsed chrome). Not pursuing a full
  no-page-scroll lockdown right now — current behavior is fine.

## Open

- **Rule-title fuzzy search in Coverage** — current search is
  jurisdiction-only; bringing title match in would close the only
  remaining capability gap with Catalog.
- **Remove Catalog from the sidebar nav** — deferred until we
  confirm via telemetry that Catalog traffic has actually dropped.
  The safe intermediate is: ship inline Accept/Reject, leave Catalog
  in the nav, watch usage, then remove if quiet.
- **Glyph contrast under desaturation** — the green check and orange
  alert-circle are distinguishable by shape, but a colorblind test
  pass is worth doing before this design is treated as final.
- **Persist expanded state + selected rule in URL** (`?open=CA,NY&rule=...`)
  — useful for shareable views and refresh-survival.
