---
title: 'Rule library: critique fixes (P0 cross-section, P1 distill / diagnostics / empty states)'
date: 2026-05-18
author: 'Claude'
area: rules
---

# Rule library: critique fixes (P0 cross-section, P1 distill / diagnostics / empty states)

## Context

After [merging Coverage + Sources + Library onto one page](2026-05-18-rules-library-merge.md),
a design review flagged that the page was _three independent pages glued
onto one URL_ — the merge implied a relationship the UI didn't deliver.
Specific findings, ranked by severity:

- **P0** Coverage and Library don't talk to each other — clicking a
  "7 pending" cell in Coverage's jurisdiction table didn't filter the
  Library table below or scroll to it
- **P1** Entity Coverage matrix is decorative — 251 yellow "review" dots,
  5 green, 4 "no rule"; almost zero signal-to-noise
- **P1** "Degraded" in Sources is a verdict with no evidence — no
  last-checked timestamp, no error reason, no diagnostic detail
- **P1** Empty states render as blank tables — when a filter empties the
  list, nothing explains it

## Change

### P0 — Coverage drills into Library

`RuleLibraryTab` filter state for `libraryFilter` and `jurisdictionFilters`
moves from local `useState` to nuqs `useQueryState` (`?library`, `?jur`).
Other filter axes (entity, tier, status, header) stay local — only the
cross-section-coupling axes are promoted.

`CoverageTab` gains an optional `onJurisdictionDrillIn?(jurisdiction)`
prop. When provided, pending-count cells with count > 0 render as
buttons with `aria-label="Review N pending rules for {state}"`. When
omitted, cells stay as plain text.

The merged Library page (`apps/app/src/routes/rules.library.tsx`)
provides the handler: it pushes `?library=pending_review&jur=<state>`
through `useSearchParams` and `scrollIntoView`s the Library section on
the next animation frame, after the URL-driven re-render commits.

End-to-end (verified in browser):

- Click `7` in California row → URL becomes `/rules/library?library=pending_review&jur=CA`
- Library filter chip flips to `Needs review 123` (active)
- Library jurisdiction header filter shows CA selected
- Table renders 7 rows
- Library section scroll-anchors to viewport top in the page's overflow container

### P1 — Coverage matrix distill

Partition jurisdictions into "interesting" (≥1 cell that's not `review`)
and "all-review". Render interesting rows immediately; collapse the rest
under an expander row (_"Show 48 jurisdictions defaulting to review"_).
Reduces visible-on-load matrix from 52 rows × 5–7 columns of mostly
identical yellow dots to ~4–6 informative rows. Cuts the page's vertical
length by ~30%.

### P1 — Sources diagnostics

`SourcesTab` now queries `usePulseSourceHealthQueryOptions` and joins
`PulseSourceHealth.sourceId` → `RuleSource.id`. New `LAST CHECKED`
column shows relative time (`2m`, `3h`, `5d`, `3w`) with exact ISO
timestamp on hover. The Degraded / Failing `HealthBadge` cell now has a
`title=` tooltip surfacing `lastError` when present, or a "see Radar for
full watcher diagnostics" hint as fallback. "Retry now" / "Pause"
inline actions are deferred — they're mutations with confirmation
flows, separate piece of work.

### P1 — Empty states

Library and Sources tables now render an explanatory row when the
filtered result set is empty:

- _No rules in the catalog yet._ (when `rows.length === 0`)
- _No rejected rules in this view. Rejections appear here with timestamp and reviewer so the decision stays auditable._ (when filter = rejected)
- _No archived rules in this view. Archived rules are no longer active but stay visible for audit._ (when filter = archived)
- _No rules match these filters. Clear filters above to see more._ (generic filter miss)

Same pattern on Sources (catalog-empty vs filter-empty).

## Deferred follow-ups

The critique flagged additional issues at P1/P2 that aren't addressed
here:

- Retry / Pause inline actions on degraded source rows (mutation flows)
- Status language consistency across sections (Needs review / Pending
  review / Candidate / Applicability review collapse)
- Sticky in-page section nav for the 5700-px scroll
- Library row affordance (the `›` glyph is the only signal that row-click
  opens detail)

These belong to a separate polish pass.

## Validation

- `pnpm check`
- `pnpm test` (203/203 passing)
- Browser preview verified end-to-end: clicked CA pending cell, URL
  updated, table filtered to 7 rows, section scrolled into view
