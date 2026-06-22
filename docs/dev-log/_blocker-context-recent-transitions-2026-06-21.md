# 2026-06-21 — BlockerContextCard recent status transitions

The inline `BlockerContextCard` (rendered on the Blocked stage, explaining WHY a
deadline is blocked) showed only the blocker's current status + due date. The
CPA had no sense of whether the upstream obligation was actually moving, so they
couldn't tell a freshly-stuck blocker from one that just advanced — without
clicking through to the blocker's drawer and reading its Audit tab.

## Changes

- `obligations.getDetail` already returns `auditEvents`; the card now reads that
  array (newest-first) and appends the 1–2 most recent status transitions after
  the existing status/due row.
- Filters to status-change actions only (`obligation.status.updated`,
  `obligation.status.auto_unblocked`) — both write the `status` field into the
  audit snapshot, so the canonical renderer produces a "Deadline status changed
  from X to Y" headline for either.
- Reuses the canonical `buildAuditChangeView` renderer (with the same label
  hooks the Audit tab uses, legacy vs lifecycle-v2 aware) for the headline
  rather than hand-parsing before/after JSON, so wording stays in lockstep with
  the Audit tab and audit log.
- Relative timestamps via the shared `formatRelativeTime`.
- Kept calm per canon: tertiary tone, no new colors, a top divider for the
  section, a leading `→` glyph + headline + relative time per row. No nested
  interactive elements (the card root is a `<button>`) — transition rows are
  plain text spans with the full headline in a `title` for truncation recovery.
- New aria-label string "Recent status changes"; zh-CN translation added.

## Verification

- `pnpm -F @duedatehq/app exec tsgo --noEmit` (rc 0)
- `pnpm -F @duedatehq/app i18n:extract` (1 new string)
- `pnpm -F @duedatehq/app i18n:compile --strict`
