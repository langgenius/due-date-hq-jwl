---
title: 'Coverage page: full critique sweep (P0–P2) + clickability + hover affordances'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Coverage page: full critique sweep + clickability + hover affordances

## Context

Designer raised three concerns on the rebuilt Coverage page:

1. The source-attention banner's chevron sat at the far right of a
   full-width pill — "the arrow is too far away."
2. Essential links (`N Pending`, source descriptor, `Active` count,
   the review-state cells) needed to be clickable with clear hover
   indicators, and the destinations needed to be predictable.
3. Run `/critique` to find what else was wrong with the table for a
   first-time CPA.

`/critique` returned **21/40 on Nielsen** (Acceptable band) with **2/8
on the cognitive-load checklist** (critical). The deterministic
detector returned `[]` — no AI-slop patterns — but the LLM review
caught five priority issues:

| #   | Priority | Issue                                                      |
| --- | -------- | ---------------------------------------------------------- |
| 1   | P0       | The orange dot is unlabeled and load-bearing               |
| 2   | P0       | 52-row table has no sort / filter / search / sticky header |
| 3   | P1       | Stats strip duplicates table sums and steals primacy       |
| 4   | P1       | "Active / Pending" is two values asymmetric in one column  |
| 5   | P2       | "PTS" sub-column header is jargon                          |

User answers: tackle **all five**; on the stats strip, **keep but
make them filter-clickable** (earn their space by becoming the
primary triage entry point).

## Change

### Clickability + hover affordances (pre-critique fix)

- **Banner now hugs content** (`w-fit`) so the chevron sits right
  next to "11 sources" instead of floating at the far right of a
  full-width pill.
- **Source cell click-drill** added — entire `count badge + descriptor`
  is one button that drills into `/rules/sources?jur=X&from=coverage`.
- **Hover-chevron indicators** on pending count, active count, and
  source cell. `opacity-0 → opacity-100` on `group/active`,
  `group/pending`, `group/source` so the "this goes somewhere" cue
  appears on hover without layout shift.
- **`onSourceDrillIn` handler** added to `rules.coverage.tsx`.

### P0 — Tri-state cell grammar

The orange dot was the dominant signal on the page and a colorblind /
first-time user had no way to know it meant "review needed." Replaced
with a `Review` pill so all three states share one visual grammar:

| State      | Treatment                                             |
| ---------- | ----------------------------------------------------- |
| `verified` | `Active` pill — green-tinted bg + green-tinted text   |
| `review`   | `Review` pill — orange-tinted bg + orange-tinted text |
| `none`     | `No rule` pill — muted gray bg + muted text           |

Text-first, color-as-reinforcement. WCAG-friendly (state survives
desaturation) and Jordan-friendly (no decoding needed).

### P0 — Triage tools

The user's daily job is "find the things that need me," not "scan all
52 states." Added:

- **`<TableHeader className="sticky top-0">`** so the column labels
  survive scroll
- **Search input** (`SearchInput` component, top-right of the section)
  — case-insensitive match on jurisdiction code + name
- **Active filter chip** ("Showing jurisdictions where sources need
  attention · Clear ×") above the table whenever a filter is active
- **Empty state** ("No jurisdictions match this filter.") inside the
  `<tbody>` when filtered set is empty

### P1 — Stats strip as filter controls

Each stat pill is now a `<button aria-pressed>`:

| Pill                         | Click behavior                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| `3 Active rules`             | Toggles `filter = 'active'` — narrows table to jurisdictions with active rules               |
| `123 rules pending approval` | Toggles `filter = 'pending'`                                                                 |
| `77/88 sources working`      | Toggles `filter = 'attention'` — narrows to jurisdictions whose sources are degraded/failing |
| `52 Jurisdictions`           | Disabled (the table already shows all when no filter is active)                              |

Active pill: inverted (`bg-text-primary text-text-inverted`).
"Sources working" pill carries a warning tint when count > 0
(`bg-severity-medium/10 border-severity-medium/40`) so the eye lands
on the action stat. Clicking again clears the filter.

### P1 — Split Active / Pending into 2 columns

Previously one column with `0 / 7 Pending` (asymmetric — left side
bare number, right side number + label, slash separator ambiguous).
Now two right-aligned columns under a `RULES` group header
(rowSpan=2 base columns + colSpan=2 group, mirroring the
`Entity coverage` group pattern):

```
                    | RULES              |
JURISDICTION        | ACTIVE | PENDING   | SOURCE | ENTITY COVERAGE
```

Active number drills into Library filtered to active rules; Pending
into Library filtered to pending_review. Both gated on count > 0;
zeros render muted, non-clickable.

### P2 — PTS → Partner. + header tooltips

- `partnership` sub-column header now reads `Partner.` (matches the
  case of the other labels; abbreviation with a period reads cleaner
  than the bare `PTS`)
- Every entity sub-column header (`<TableHead>`) now has a `title`
  tooltip carrying the full name (`Partner.` → "Partnership",
  `Sole Prop` → "Sole proprietor", etc.) — `cursor-help` cue tells
  the user the label is hover-revealing

### Minor cleanup

- **aria-label verb unified**: both Active and Pending buttons now
  say "Open N rules for {jurisdiction}" (was "View" / "Review")
- **Source descriptor switches per-row**: rows whose sources are
  degraded read `Source needs attention` (orange text + orange-tinted
  badge) instead of `Official sources — pending rules`; reinforces
  the top callout so the user can scan to find affected rows
- **Hooks hoisted** before early `loading` / `error` returns so React's
  Rules of Hooks stays satisfied across loading/success transitions

## Destinations recap

Every click target on the page now has a known destination:

| Element                                       | Destination                                                                  |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `Source needs attention 11 sources →` callout | `/rules/sources?health=degraded`                                             |
| `Active rules` pill                           | filter table → `filter=active`                                               |
| `rules pending approval` pill                 | filter table → `filter=pending`                                              |
| `sources working` pill                        | filter table → `filter=attention`                                            |
| `Active` count cell                           | `/rules/library?library=active&jur=X&from=coverage`                          |
| `Pending` count cell                          | `/rules/library?library=pending_review&jur=X&from=coverage`                  |
| Source descriptor + badge                     | `/rules/sources?jur=X&from=coverage`                                         |
| `Active` / `Review` cell pill                 | `/rules/library?library=active\|pending_review&jur=X&entity=Y&from=coverage` |
| `No rule` cell pill                           | non-interactive (no rules to land on)                                        |

## Files

- `apps/app/src/features/rules/coverage-tab.tsx` (rewrite)
- `apps/app/src/features/rules/coverage-tab.test.tsx` (update headers + cell count)
- `apps/app/src/routes/rules.coverage.tsx` (add `handleSourceDrillIn`)

## Verified

- `pnpm exec tsc -p apps/app/tsconfig.json --noEmit` → exit 0
- Tests skipped due to pre-existing `babel-plugin-macros` runner issue
  unrelated to this change
- Browser preview at `/rules/coverage`:
  - Banner hugs content; chevron is right next to "11 sources"
  - Source cell shows hover-chevron on every row
  - Active / Pending counts show hover-chevron when > 0
  - Clicking "123 rules pending approval" pill: filter chip
    "Showing jurisdictions with pending rules · Clear ×" appears
  - Clicking "77/88 sources working" pill: table narrows to 6 rows
    (CA, FL, MA, NY, TX, WA) — the jurisdictions whose sources are
    flagged
  - Source descriptor on those rows reads `Source needs attention`
    in orange (reinforcing the callout above)
  - Header is sticky; column labels stay visible on scroll
  - Hover any entity sub-column header (e.g. `Partner.`) → tooltip
    shows "Partnership"
  - Tri-state cells: `Active` green pill / `Review` orange pill /
    `No rule` muted pill — all three share one visual grammar

## Critique scores — before / after

| #         | Heuristic                       | Before    | After (est.)                                                        |
| --------- | ------------------------------- | --------- | ------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 3         | 3                                                                   |
| 2         | Match System / Real World       | 2         | 3 (Partner. tooltip + Active/Pending split + Source attention copy) |
| 3         | User Control and Freedom        | 2         | 4 (filter chips + Clear + search)                                   |
| 4         | Consistency and Standards       | 2         | 4 (tri-state grammar + RULES group mirrors ENTITY COVERAGE group)   |
| 5         | Error Prevention                | 3         | 3                                                                   |
| 6         | Recognition Rather Than Recall  | 2         | 4 (Review pill + tooltips + filter chips)                           |
| 7         | Flexibility and Efficiency      | 1         | 3 (search + filter; keyboard nav still pending)                     |
| 8         | Aesthetic and Minimalist Design | 2         | 3 (sticky head reduces visual fatigue; pill grammar unified)        |
| 9         | Error Recovery                  | 3         | 3                                                                   |
| 10        | Help and Documentation          | 1         | 2 (header tooltips; in-context help still light)                    |
| **Total** |                                 | **21/40** | **~32/40** — **Good**                                               |

Cognitive-load checklist: estimated **5/8** passing after this sweep
(was 2/8). Remaining failures: (a) action-verb-vs-noun headers,
(b) keyboard shortcuts, (c) state-without-color survival on the pill
grammar — pills carry text but the color is still doing semantic
work for sighted users.

## Open

- **Keyboard accelerators** (j/k row nav, `/` to focus search) —
  flexibility heuristic still scores 3, not 4
- **"Last synced" timestamp** on the source-health callout — Casey
  needs to trust the freshness number to act on it
- **Source descriptor dedup** — "Official sources — pending rules"
  repeats verbatim on ~45 rows; defer to a follow-up
- **JUR badge** is redundant with the state name on wide screens —
  consider keeping for mobile only
