# /rules/library selected-jurisdiction — design-critique pass (2026-06-10)

Five-point critique on `/rules/library?jurisdiction=FED`. Two code fixes + three
findings.

## Fixed

### Table alignment (#4 "many elements aren't aligned, different from other pages")

`jurisdiction-rule-table.tsx` row cells overrode the canonical `<TableCell>`
`align-middle` with `align-top` on **every** cell, plus hand-tuned `mt-0.5`
(leading dot) and `mt-1` (chevron) nudges to fake centering. And the TYPE cell's
pill was `block … text-center` (full-width, text centered) so short labels like
"Form 1040" floated centered instead of sitting left under the header.

- All body cells `align-top` → `align-middle` (the canonical the rest of the app
  uses — the primitive comment even notes "align-top read as cramped").
- Dropped the `mt-0.5` / `mt-1` compensating nudges.
- TYPE pill `block text-center` → `inline-flex items-center` (hugs content,
  left-aligned under the header, like the Severity/Status pills already are).

### Rail icons → StateBadge (#5 "why not use StateBadge")

`states-rail.tsx` jurisdiction rows used generic lucide `LandmarkIcon` (Federal)
/ `MapPinIcon` (states). Replaced with the `StateBadge` seal (`size="xs"`,
`preview={false}`) keyed off the jurisdiction code — the Overview row keeps its
dashboard icon. `RailRow` gained an optional `code` prop (renders the badge) and
`icon` is now optional. Matches the Pencil O0pyRO mock; resolves the follow-up
left open in `_rule-library-overview-O0pyRO-2026-06-09.md`.

## Findings (no change — explained back to design)

### Header height (#3 "is it too tall?")

The header `<th>` is the canonical `py-3` (12/12). Measured 44px here vs **53px**
on `/clients` — so it's already _shorter_ than peers, not too tall. Left as the
shared height (shrinking it would diverge from every other table, which #4 asked
us to match). Can revisit as a global density change if wanted.

### Filter spacing (#1 "is the spacing between filters the same?")

The 4 facet chips (Type · Modified · Effective · Severity) are evenly spaced
(`gap-3`, 12px). The larger gap before them is an intentional `flex-1` spacer
splitting the status-segmented + search group (left) from the sort/filter facets
(right) — the same left/right split the other list toolbars use. Uniform within
each group; happy to drop the spacer and pack everything left if that's preferred.

### Components (#2 "did you use a component?")

Yes — the bar is built entirely from shared primitives: `Segmented` (status),
`SearchInput`, and `FilterTrigger` + `DropdownMenu` (the same facet chrome
/deadlines + /clients use). No bespoke markup.

Verified live on /rules/library?jurisdiction=FED; `tsgo` clean for both touched
files; no new console errors.

## Round 2 — rail + overview pass (2026-06-10)

### Rail (`states-rail.tsx`)

- **Selected state → canonical accent (#8).** Jurisdiction rows used a bespoke
  gray fill (`bg-background-subtle`) for the selected state while Overview used
  accent — the user flagged it as "lonely / not in the design library." Unified:
  every selected row (Overview AND jurisdictions) now reads
  `bg-state-accent-hover` + `text-text-accent`, the same nav-item selected state
  `SettingsSubNav` and the main sidebar use. Verified: selected AL row bg =
  `rgb(239 244 255)`.
- **Quieter rows (#6, #7).** Count weight `font-semibold`→`font-medium`, row
  padding `py-2.5`→`py-2`, and only the selected row goes strong (accent) — so 50
  states read calm with one focal row instead of a wall of strong items. Dropped
  the now-dead `tone` prop. Seals stay full-colour (user: "def not gray").

### Overview (`rules.library.tsx`)

- **Recent-changes rows (#11).** Were full-bleed with `border-t` dividers and no
  side padding, so the hover wash ran edge-to-edge. Now `rounded-lg px-3 py-3`
  rows inside a `-mx-3` list — hover is an inset rounded highlight with padding,
  dividers dropped. Content still aligns with the section header.
- **Removed the header eyebrow (#13).** Dropped the "● Live · Federal + N states ·
  N sources monitored" line (redundant with the subtitle + the Sources button).
  Removed the now-unused `stateCount` / `sourcesMonitored` memos.

### Answered (no change)

- #1 facet gaps uniform (12px) + intentional group spacer · #2 all shared
  primitives (Segmented / SearchInput / FilterTrigger / DropdownMenu) · #3 header
  is canonical (44px, shorter than /clients' 53px) · #9 rail search is the shared
  `SearchInput` · #12 page reuses StatBand / PageHeader / Table / Segmented /
  StateBadge etc.

## Round 3 — calm the rail further + funnel label + StatBand polish

- **Smaller seals + quieter dots (#6/#7).** Added a `2xs` (16px) size to
  `StateBadge` and used it in the rail (was `xs`/20px); the "needs review" dot
  dropped `size-1.5`→`size-1` so a list where most rows carry one stops reading as
  a field of warning dots.
- **Funnel relabelled (#10).** The icon-only review-filter toggle is now a labelled
  pill — `[funnel] Needs review` — so its purpose is legible without hovering for
  the tooltip.
- **StatBand polish (#14).** Added a subtle vertical hairline between columns
  (`sm:border-l border-divider-subtle`, first column + mobile 2-up grid excluded)
  so the band reads as a structured, intentional set of stats without
  re-introducing a card border. Shared, so all 5 summary surfaces gain it;
  verified on /rules/library + /clients.

## Round 4 — filter-bar spacing (#1) + header height (#3)

- **Even filter spacing (#1).** Dropped the `flex-1` dead spacer that pushed the
  facets to the far right. The `SearchInput` now flexes (`sm:flex-1 sm:basis-0
sm:max-w-[280px]`) to absorb the row's slack, so every control keeps a uniform
  `gap-3` and the six filters stay on one line. The secondary "Clear filters"
  action wraps to its own row (it's disabled until a filter is applied).
- **Tighter table header (#3).** Local override `[&>th]:py-2` on the rule-table
  header row — `py-3`→`py-2`, header height 44px→36px. A deliberate
  denser-than-canonical head for this data-heavy table.

## Round 5 — surface the review queue on the overview

The overview had an `OverviewCaughtUpCard` for the 0-pending state but **no
prompt** when rules WERE waiting — the pending count only whispered in the
StatBand. Added the missing counterpart: a review-prompt callout at the top of
the pending-review overview branch.

- Accent-toned banner (`bg-state-accent-hover`, eye icon): **"N rules need your
  review · Oldest waiting since {date}"** + a primary **Start review** button.
- Wired to the existing bulk-review flow: `selectAllPending()` +
  `setBulkListOpen(true)` opens the `BulkReviewListModal` with every pending rule
  selected (verified: opens "Bulk review · 456 rules selected" with Accept/Reject
  + audit note). No new review machinery — just an entry point that was missing.
- Pairs with `OverviewCaughtUpCard`: queue clear → "all caught up"; queue dirty →
  "N need your review". `tsgo` clean; verified live.

## Round 6 — collapse the jurisdiction status filter to Active + Review

Per design: a rule is, in practice, either **Active** or in **Review** — so the
jurisdiction `JurisdictionFilterBar` status Segmented dropped from four tabs
(All / Active / Pending / Deprecated) to two: **Active** (default) · **Review**
(renamed from "Pending", matching the rail filter + overview CTA).

- `jurisdiction-rule-table.tsx` — Segmented options trimmed to `active` / `review`.
- `rules.library.tsx` — the jurisdiction table now filters to Review when
  `scope === 'review'` else **Active** (no 'all'/'archived' branch); the call site
  maps `scope={activeScope === 'review' ? 'review' : 'active'}` so a freshly
  opened jurisdiction defaults to Active and the tab always matches the rows.
- Deprecated/archived rules no longer surface in the jurisdiction view (they fold
  out of scope). The global rule-search `ScopeTabBand` (All/Active/Review/Archive/
  Missing) is untouched — this only affects the per-jurisdiction filter.

Verified: FED defaults to Active (18 rows); Review tab (`?scope=review`) shows the
1 pending rule. `tsgo` clean.

## Round 7 — rule review panel (Pencil BbK6Q) — first pass

Compared the live `RuleDetailPanel` against the mock `BbK6Q`:

- **Chrome already matches** — verified the mock's card tokens via Pencil: white
  fill, `#10182814` (8% = `divider-regular`) border, `#f9fafb` (gray-50) 36px
  header bar, radius 12. The current `DisclosureCard` / hero use the same. So the
  "ugly" isn't the card styling.
- **Opened scrolled past the hero** — Base UI focuses the first focusable child on
  open (Applicability's "Show all fields" link), scrolling the text-only hero
  (title · status · AI% · summary) off-screen, so the panel read as "missing" its
  header. Fixed: `initialFocus={scrollRef}` on the Dialog + an rAF scrollTop=0
  reset after focus settles. DOM confirms hero at the top (`scrollTop 0`).
- **Card gap** `gap-3`→`gap-[18px]` to match the mock's 18px stack rhythm.
- **Most remaining richness is data, not design** — this demo rule is a sparse
  *candidate* (no clients/obligations, no concrete due date, single source, no
  notes, v1), so Impact reads "No client obligations yet", Due-date shows the
  review-required sentence instead of a concrete "Due {date}" block, etc. The mock
  shows a *populated* rule; the component already renders the richer treatments
  when that data exists.

NOTE: the local preview was bouncing routes + returning stale modal screenshots
this session, so the visual was verified via DOM measurement rather than a clean
screenshot. Needs a real-app confirmation pass.

## Round 8 — rule review panel, real fixes after section inspection

The scroll-reset hacks didn't hold (panel still opened with no visible title).
Switched to a structural fix + a section pass:

- **Title pinned (was missing).** The hero (`RuleDetailHeroCard`) was the first
  *scrolling* card, and Base UI's open-focus scrolled it away — the panel opened
  showing "Applicability", no title. Moved the hero OUT of the scroll body into a
  fixed header `<div className="shrink-0 px-5 pt-5">`, so title · status · summary
  are always visible while the sections scroll beneath. Removed the rAF hack.
  Verified live: "Federal disaster tax relief candidate watch" now shows on open.
- **Humanized the due-date enum.** The Due-date logic meta rendered the raw
  `source_defined_calendar` in mono — developer-ish + inconsistent with the rest
  of the app. Now `formatEnumLabel(...)` → "Source defined calendar".
- **Real 18px gaps.** The `gap-[18px]` on the scroll body didn't reach the
  sections — `RuleDetailCompact`'s inner wrapper was `gap-3` (12px). Bumped it to
  `gap-[18px]` so the card stack actually breathes like the mock.

Remaining richness (concrete due-date block, per-client impact, multi-source,
team notes, multi-event Activity) is still gated on populated rule data — this
demo rule is a bare candidate. The component renders those treatments when the
data exists.

## Round 9 — review panel: wire the queue/reason callout (backend was ready)

Audited backend readiness first (most of the mock's richness IS backed). Then:

- **Wired the "In queue since / Reason" callout (#5 gap).** `RuleDetailPanel` now
  queries `orpc.rules.listReviewTasks({ status: 'open' })`, finds the task for the
  open rule, and passes it to `RuleDetailHeroCard`, which renders `In queue
  {relative}` + `Reason: {label}` in the hero bar (reason enum → friendly label
  map). Verified live: hero reads "In queue 17h ago … Reason: New template" —
  real `RuleReviewTask.createdAt` / `reason` data.

### Seed (a) — NOT done; it's a real seed change, not a data tweak
Discovered the demo seed (`mock/demo.sql`, generated by the 2800-line
`packages/db/seed/generate-demo.ts`) has:
- **no `rule_note` rows at all** (team notes table exists — migration
  `0075_rule_note.sql` — but nothing is seeded), and
- **no `fixed_date` rule** (every seeded rule is `nth_day_*` / `source_defined_*`),
  and **no seeded concrete drafts**.

So showing the mock's concrete "Due {date}" block, populated Practice-review
notes, and per-client impact needs: a new `emit('rule_note', …)` for a candidate,
one rule flipped to `fixed_date` with 2+ evidence, optional concrete-draft rows →
`pnpm --filter @duedatehq/db demo:generate` → `pnpm db:seed:demo`. That's a
deliberate packages/db change + DB re-seed, left for a focused pass rather than
rushed (and the local preview was too flaky this session to verify a re-seed).
