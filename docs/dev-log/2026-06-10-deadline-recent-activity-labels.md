# Deadline Recent Activity Labels

## Context

The `/deadlines/:id` detail page Recent activity preview rendered raw audit action keys such
as `readiness.checklist.regenerated` because the card looked up `AuditActionLabels` by the raw
action string instead of using the shared formatter.

## Change

- Reused `formatAuditActionLabel(...)` in `ObligationQueueDetailDrawer` so Recent activity matches
  the full Timeline and audit surfaces.
- Changed the readiness checklist regeneration label to `Updated materials checklist`, which reads
  as a user-facing action instead of an implementation detail.

## Validation

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/app exec tsc --noEmit --pretty false`
- Browser verification on `http://localhost:5173/deadlines/000000000003`: Recent activity
  shows `Updated materials checklist`, and `readiness.checklist.regenerated` is absent.
