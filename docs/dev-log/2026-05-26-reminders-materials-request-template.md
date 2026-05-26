# 2026-05-26 — Reminders materials request template

## Context

The Materials tab could send a client request, but the email subject/body lived in
the readiness procedure rather than the `/reminders` template surface.

## Change

- Added a `readiness_request` reminder template kind with a default `Client
materials request` template.
- Added checklist-aware template variables for `request_url`,
  `outstanding_checklist`, and `received_checklist`.
- Added `readiness.previewRequestEmail` so the deadline drawer can show a
  read-only preview before creating the portal link.
- Updated `readiness.sendRequest` to use the same rendering helper as the
  preview and to re-read/reconcile the current checklist before sending.
- Updated the deadline Materials `Send to client` action to open a preview modal
  with recipient state, subject/body, and Outstanding/Received checklist groups.
- Removed the 1-day reminder window from upcoming reminder candidates and the
  scheduled dispatcher, leaving deadline countdown email automation at 30 days
  and 7 days plus overdue in-app handling.
- Renamed the visible default reminder templates to make their purpose explicit:
  30-day client countdown email, 7-day client countdown email, and client
  checklist collection email.
- Reworked the default subject/body copy into fuller professional samples that
  explain the due date, next steps, secure materials link, and practice follow-up.
- Refined the visible `/reminders` template list to the three CPA-editable
  client-facing templates: 30-day countdown email, 7-day countdown email, and
  checklist collection email. The internal team reminder template remains a
  server default, but it is not shown as one of the client email templates.

## Validation

- `pnpm --filter @duedatehq/contracts test -- contracts.test.ts`
- `pnpm --filter @duedatehq/db test -- src/repo/reminders.test.ts`
- `pnpm --filter @duedatehq/server test -- src/procedures/readiness/index.test.ts`
- `pnpm --filter @duedatehq/app test -- src/routes/obligations.test.ts`
- `pnpm check`
- `pnpm --filter @duedatehq/app i18n:extract`

`pnpm --filter @duedatehq/app i18n:compile` remains blocked by the existing
`zh-CN` missing-translation backlog; the new materials preview/template strings
were translated in the catalog.
