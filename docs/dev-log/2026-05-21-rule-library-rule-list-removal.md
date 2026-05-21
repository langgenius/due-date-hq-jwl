# Rule Library Rule List removal

**Date:** 2026-05-21

## Change

Removed the standalone Rule List view from `/rules/library`. Rule Library
now keeps the Coverage map as the only primary view; legacy `?view=rules`
links are normalized back to Coverage query state.

## Implementation Notes

- `RulesLibraryRoute` no longer renders the `view=matrix|rules` segmented
  control or imports `RuleLibraryTab`.
- Coverage summary numbers now filter the Coverage map with
  `?filter=active|pending` instead of switching into a separate rule table.
- Legacy `library=pending_review|active` and single `jur=` params are
  replaced to `filter=pending|active` and `q=...`; `rule=` deep links still
  open the right-side rule detail workflow.
- Bulk review moved into the Coverage pending review queue:
  visible select-all, row checkboxes, selected count, Review selected drawer,
  preview, batch note, and Accept selected.
- Source-defined pending rules and `source_changed` review tasks remain
  single-rule review only and have disabled bulk checkboxes.
- Removed the standalone black "Review N pending rules" CTA above Coverage;
  pending rule review now starts from the queue/drill-in workflow only.

## Follow-up Guardrails

- Do not reintroduce a full per-rule table under Rule Library unless it
  serves a different workflow from Coverage.
- Keep future rule-list affordances inside the Coverage queue or rule detail
  workspace so the page has one canonical scan path.
