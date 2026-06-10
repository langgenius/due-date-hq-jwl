# Comment cleanup — features/alerts, 2026-06-10

**Who/why:** Automated comment-hygiene pass over the alerts feature. Trimmed
verbose dated change-history narration from source comments — deleting
pure-narration comments (records of a tweak/removal/rename on a date or per
feedback #N with no bearing on current code) and stripping the
date/attribution/"changed-from-X" prefix off mixed comments while keeping the
present-tense rationale (the WHY: constraints, footguns, what a component does).
No code, JSX, props, className strings, user-facing text, imports, or logic were
changed; the only non-comment delta is a benign prettier reflow of two
`<Skeleton>` elements onto single lines after a preceding comment was removed.

## Files touched

- **apps/app/src/features/alerts/AlertsListPage.tsx** — ~17 dated comments
  deleted (import-retirement notes, filter-row layout oscillation stack,
  removed-control placeholders, "Load more" removal note), ~28 trimmed to
  present-tense WHY (mode/filter behavior, work-queue split, map view,
  bulk-action bar, sort/grouping rationale, sticky-toolbar constraints).
- **apps/app/src/features/alerts/AlertDetailDrawer.tsx** — ~9 deleted (retired
  import notes, header/body/footer padding-oscillation stacks, deleted
  `drawerChangeKindLabel` trailer), ~40 trimmed to WHY (F-041 verification gate,
  Mark-reviewed reverify gate, shared-helper consistency notes, panel/sheet mode
  contract, white-surface divergence, group-card structure, no-fiction timeline
  notes).
- **apps/app/src/features/alerts/components/AlertStructuredFields.tsx** — 1
  deleted (removed source-link narration), 1 trimmed (ExtractedFacts cell
  padding rationale).

Rough totals: ~27 comments deleted, ~70 trimmed across the three files.
Remaining dated-comment count after the pass: 0 (re-grep clean).
