---
title: 'Coverage v6: chips committed, dots removed, Library daily-use folded into Coverage'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Coverage v6: chips committed, dots removed, Library daily-use folded into Coverage

## Context

Four asks from the designer on top of the previous turn:

1. **Keep chips only** as the card-level entity-coverage treatment —
   drop the A/B/C (Summary/Chips/Bar) toggle.
2. **Maybe have a checkbox** to opt into viewing entity coverage on
   cards (default hidden — cleaner glance).
3. **Avoid random use of dots** — the leading tone-dot in section
   headers, card status pills, and the rail header pill was decorative
   noise.
4. **Actually fold Library's daily-use jobs into Coverage** — bulk
   multi-select + bulk-accept lived only in Library; the merge I'd
   discussed in two prior turns hadn't shipped.

## Change

### Card-level chips, opt-in

- Removed `EntityCoverageStyle` type, `ENTITY_STYLE_VALUES`,
  `EntityStyleToggle`, `EntityCoveragePresentation`, `EntitySummaryLine`,
  `EntityProportionBar`, and the `countStates` helper. Single
  treatment: `EntityChips` (named entity chips with status-tinted fill).
- Added page-level `showEntityCoverage` boolean state (default `false`).
- New checkbox next to the Business/Personal/All toggle:
  `[☐] Show entity coverage on cards`. Toggling on reveals
  `EntityChips` inside each `JurisdictionCard`; off hides them entirely
  so cards stay glanceable.

### Decorative dots removed

Four locations stripped:

| Where                                                                   | Before                     | After                                                     |
| ----------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------- |
| Section header (`Needs your approval`, `Manual verify`, `Auto-managed`) | leading `●` + title        | title-only; tone carried by text color                    |
| Card `StatusPill` (was `<div>` with dot + label)                        | `● Approve N pending`      | tinted pill: `Approve N pending` with bg/border/text tone |
| Rail header status pill                                                 | `● Approve N pending`      | tinted pill: `Approve N pending`                          |
| Standard-queue expander                                                 | `● Show 46 jurisdictions…` | text-only                                                 |

Coverage status is still carried unambiguously — just by background
tone + text color, not by an extra ornament. The interactive entity
filter chips in the rail and the entity chips on cards remain (those
_aren't_ random; tone is the functional affordance).

### Library daily-use jobs folded into Coverage rail

Inventoried Library and identified the daily-use jobs that overlapped
with the rail:

| Library feature                                      | Daily-use?    | Disposition                                                        |
| ---------------------------------------------------- | ------------- | ------------------------------------------------------------------ |
| Per-rule list, drill into detail                     | Yes           | Already in rail (rule click → slim detail + Open full audit modal) |
| Accept / Reject one rule                             | Yes           | Already in rail (with two-step confirm)                            |
| Filter by entity                                     | Yes           | Already in rail (entity filter chips above rule list)              |
| **Bulk-select + bulk-accept**                        | Yes           | **Newly moved**: checkboxes + master + two-step bulk-accept strip  |
| Filter by tier (`applicability_review`, `exception`) | Catalog admin | Stays in Catalog                                                   |
| Filter by tax type                                   | Catalog admin | Stays in Catalog                                                   |
| Cross-jurisdiction flat view                         | Catalog admin | Stays in Catalog                                                   |
| Search across all rules                              | Catalog admin | Stays in Catalog                                                   |

Specifically built into the rail:

- `selectedRuleIds: Set<string>` state in `JurisdictionDetailRail`
- Per-rule checkbox prefix on each `RuleSourceRow` (rendered as a
  sibling so it doesn't interfere with rule-title click or `Source ↗`
  click)
- `BulkSelectHeader` — master checkbox + "N of M selected" line at the
  top of the filtered rule list; indeterminate state when partial
- `BulkAcceptStrip` — appears when `selectedCount > 0`; two-step
  confirm matching the single-rule pattern ("Activate 2 rules? Each
  will start generating client obligations" → "Confirm accept 2")
- `bulkAcceptMutation` wired through `orpc.rules.bulkAcceptTemplates`;
  toast on success reports `accepted` + `skipped` counts (the server
  filters rules without an open review task automatically)

### Library → Catalog rename

- Sidebar nav label: `Rule library` → `Catalog`
- `routeSummaries.rulesLibrary.title`: `Rule library` → `Catalog`
- `rules.library.tsx` page title + description rewritten to position
  the page as cross-jurisdiction catalog admin, not the daily review
  queue. Route stays at `/rules/library` for deep-link backwards
  compatibility — only the surface label changed.

## Why this is right

The page-level checkbox respects the user's read: cards default to a
clean scan (jurisdiction + status + sources), and entity detail is a
flick away when wanted. Removing the decorative dots collapses the
"three different dots in three different places" pattern that was
making the page feel like a system status panel rather than a
working surface. Bulk-accept in the rail closes the last daily-use
gap that was forcing users to leave Coverage for Library.

The catalog rename is the second half of that move: Library was
overloaded — both daily review queue AND cross-jurisdiction admin
tool. Coverage now owns daily review; Catalog owns admin. The split
is finally clean.

## Files

- `apps/app/src/features/rules/coverage-rail-view.tsx`
  - Removed `EntityCoverageStyle`, `ENTITY_STYLE_VALUES`,
    `EntityStyleToggle`, `EntityCoveragePresentation`,
    `EntitySummaryLine`, `EntityProportionBar`, `countStates`
  - Added `showEntityCoverage` state + checkbox UI
  - `JurisdictionCard.coverageStyle` prop replaced with
    `showEntityCoverage` boolean
  - Section + StatusPill + rail-header pill: dots replaced with
    tinted backgrounds
  - `BulkSelectHeader` and `BulkAcceptStrip` components (new)
  - `JurisdictionDetailRail`: `selectedRuleIds` state, per-row
    checkbox, master select, bulk-accept mutation
- `apps/app/src/routes/route-summary.ts`: Library title → "Catalog"
- `apps/app/src/components/patterns/app-shell-nav.tsx`: sidebar label
- `apps/app/src/routes/rules.library.tsx`: page title + description

## Verified

- `pnpm exec tsc -p apps/app/tsconfig.json --noEmit` → exit 0
- Browser preview at `/rules/coverage-v6?jur=CA`:
  - Sidebar: "Catalog" (was "Rule library")
  - Toggles: Business/Personal/All + "☐ Show entity coverage on cards"
    (no A/B/C style toggle)
  - Section headers: "Needs your approval 4" with no leading dot
  - Card status pills: tinted backgrounds, no dots
  - Standard-queue expander: text-only, no dot
  - Rail header pill: tinted "Approve 7 pending", no dot
  - Toggling the checkbox: 5 entity chips appear inside each card
    with status-tinted fill (LLC review tone, S-C C-C active tone,
    Partnership inactive)
  - Each rule row in the rail has a checkbox prefix
  - Master checkbox above list: "Select rules to act on multiple at
    once" (idle) / "2 of 7 selected" with indeterminate state (partial)
  - Selecting 2 rules → bulk strip appears: "2 rules ready to accept"
    with [Cancel] [Accept 2 rules] buttons
  - Click "Accept 2 rules" → confirm step: "Activate 2 rules? Each
    will start generating client obligations" with [Cancel] [Confirm
    accept 2]
  - Cancel resets selection; Confirm fires `bulkAcceptTemplates`
    mutation (verified click; no actual mutation in preview seed
    flow since rules don't have open review tasks in demo data)

## Open

- **Promote v6 to canonical `/rules/coverage`** — v6 is now ready;
  needs the swap. Will hold for explicit go-ahead.
- **Card chips use short codes (LLC/PRT/S-C); rail chips use full
  names (LLC/Partnership/S-Corp)** — minor inconsistency. Could
  unify by using full names on cards too once the entity-coverage
  checkbox sees real use.
- **Catalog page still uses its old internal structure** — only the
  outer page title changed. Body content (filter chips, table, bulk
  drawer) is unchanged. If the daily-use jobs are now in Coverage,
  Catalog's surface could be slimmed in a follow-up.
