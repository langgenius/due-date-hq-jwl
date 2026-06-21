# 2026-06-21 — Group AffectedClientsTable by lifecycle status (img-026)

When an alert's relief touches clients in different lifecycle stages — some
not-started, some already in review, some filed — the flat affected-clients
table inside the alert drawer buried that signal. Grouping the rows by their
obligation's status answers "where does the firm stand on this relief?" at a
glance (Pencil img-026).

## Changes

In `apps/app/src/features/alerts/components/AffectedClientsTable.tsx`:

- Group rows by `PulseAffectedClient.status`, collapsed to the canonical six v2
  lifecycle stages (Not started / Waiting on client / Blocked / In review /
  Filed / Completed) via the inverse of `LIFECYCLE_V2_STATUS_SETS`. Using the
  v2 collapse — not the raw 10-value enum — keeps in_progress / review /
  extended from fragmenting into three "In review" headers, and makes each
  group label match the `ObligationStatusReadBadge` a row wears elsewhere.
- Grouping applies ONLY in the `apply` variant, and ONLY when the row set spans
  more than one v2 stage. A single-status set (the common case) and the
  `review` informational variant render flat, so we never add a redundant
  "Not started · 5" header above five identical rows.
- Each group renders a collapsible band header (chevron + `StatusMark`
  progress-ring glyph in its canonical hue + v2 label + full-set count). The
  header is a real full-width button toggling only that group's visibility.
  Groups render in lifecycle reading order (the `LIFECYCLE_V2_STATUSES` order).
- Preserved existing behavior: the needs_review-first sort survives inside each
  group (grouping filters the already-ordered list, which is stable); the
  collapse-threshold show-all/show-fewer footer is unchanged and partitions the
  visible window; the apply/select columns and per-row Confirm/Exclude controls
  are untouched (the row render was extracted into a shared `renderRow` closure
  reused by both the flat and grouped paths).
- Select-all still operates on ALL rows: collapsing a group only hides its rows
  visually and never touches selection state.

No new user-facing strings — group labels reuse the existing
`useLifecycleV2StatusLabels` vocabulary and counts are numbers, so no i18n
extract was run.

## Verification

- `pnpm -F @duedatehq/app exec tsgo --noEmit` (rc 0)
- `npx vp fmt --check` on the changed file (clean)
