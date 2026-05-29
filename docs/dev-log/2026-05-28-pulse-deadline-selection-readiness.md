# Pulse Deadline Selection Readiness

## Context

Due-date Pulse candidates should not ask CPAs to hand-fill the AI's full structured scope. The CPA
decision is simpler and safer: confirm the new due date, choose the existing deadlines that should
receive it, then explicitly Apply.

## Change

- Changed `pulse.reviewDueDateOverlayDetails` to accept only `newDueDate`, selected deadline IDs,
  optional confirmed/excluded IDs, and an optional review note.
- Kept incomplete due-date candidates as `due_date_overlay` Alerts. Missing forms, entity types,
  original due date, or counties no longer force `review_only`; they only influence candidate
  ordering when available.
- Added selection-backed readiness: an Alert is ready to Apply only after a new due date exists and
  the CPA has confirmed at least one compatible open deadline.
- Changed Apply guards so deadline changes still require explicit user-selected obligation IDs,
  compatible jurisdiction, open obligations, no active duplicate application, and no due-date drift
  since the CPA selection snapshot.
- Derived Apply evidence from the selected obligations: original dates come from each obligation's
  current due date at application time, while forms/entity types come from the selected deadlines.
- Updated the Pulse drawer to show a “Confirm deadline change” panel with only the new due date,
  deadline selector, and review note. Review-only Alerts still do not expose Apply.
- Added a reminder under the new due date input so the CPA confirms the entered date against the
  source notice before saving the deadline selection.
- Wired `pulse.reviewDueDateOverlayDetails` into the root oRPC router. The handler existed in the
  Pulse procedure module, but the root router had not exposed it, causing `/rpc/pulse/reviewDueDateOverlayDetails`
  to return 500 before the handler ran.

## Validation

- `pnpm --filter @duedatehq/contracts test -- src/contracts.test.ts`
- `pnpm --filter @duedatehq/db test -- src/repo/pulse.test.ts`
- `pnpm --filter @duedatehq/server test -- src/jobs/pulse/extract.test.ts src/procedures/pulse/index.test.ts`
- `pnpm --filter @duedatehq/server test -- src/procedures/index.test.ts src/procedures/pulse/index.test.ts`
- `pnpm --filter @duedatehq/app test -- src/features/pulse`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm exec vp check apps/app/src/features/pulse/PulseDetailDrawer.tsx apps/app/src/features/pulse/PulseDetailDrawer.test.ts apps/app/src/features/pulse/__dev__/mock-pulse.ts apps/app/src/i18n/locales/en/messages.po apps/app/src/i18n/locales/en/messages.ts apps/app/src/i18n/locales/zh-CN/messages.po apps/app/src/i18n/locales/zh-CN/messages.ts apps/server/src/procedures/pulse/index.ts packages/contracts/src/pulse.ts packages/contracts/src/contracts.test.ts packages/db/src/repo/pulse.ts packages/db/src/repo/pulse.test.ts packages/ports/src/pulse.ts docs/dev-log/2026-05-28-pulse-deadline-selection-readiness.md`
- Browser: `/rules/pulse?alert=41000000-0000-4000-8000-00000000d101` rendered “Confirm
  deadline change” with only New due date, deadline selector, and Review note inputs; the old
  Forms, Entity types, Original due date, and Affected rule IDs inputs were absent.
- Browser: saving the same alert now sends `/rpc/pulse/reviewDueDateOverlayDetails` and receives
  HTTP 200 with the selected deadline persisted into the returned Pulse detail.

## 2026-05-29 Alert Readiness And Duplicate Aggregation

- Added CPA-facing `applyReadiness` to public Pulse alert rows, not just detail rows. Alert list,
  history, and priority queue rows now use the same semantics as the drawer: `review_only` is
  `not_applicable`, incomplete due-date candidates are `needs_details`, and confirmed deadline
  selections are `ready`.
- Added `duplicateSourceSnapshotCount` to public alert rows. The count is derived from
  `pulse_source_snapshot` rows with `parse_status = duplicate` and `pulse_id` pointing back to the
  original Pulse.
- Kept duplicate suppression behavior unchanged: duplicate source snapshots do not create a second
  Alert. The UI only says that similar source updates were merged and does not expose hidden source
  names, source IDs, or source families.
- Added a shared `PulseReadinessChip` plus a drawer decision-status notice so CPAs can distinguish
  `Review only`, `Needs deadline selection`, and `Ready to apply` before they start the Apply flow.

## Validation 2026-05-29

- `pnpm --filter @duedatehq/contracts test -- src/contracts.test.ts`
- `pnpm --filter @duedatehq/db test -- src/repo/pulse.test.ts`
- `pnpm --filter @duedatehq/server test -- src/procedures/pulse/index.test.ts src/jobs/pulse/extract.test.ts`
- `pnpm --filter @duedatehq/app test -- src/features/pulse`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm exec vp check packages/contracts/src/index.ts packages/contracts/src/pulse.ts packages/contracts/src/contracts.test.ts packages/ports/src/pulse.ts packages/db/src/repo/pulse.ts packages/db/src/repo/pulse.test.ts apps/server/src/procedures/pulse/index.ts apps/server/src/procedures/pulse/index.test.ts apps/app/src/features/pulse/PulseDetailDrawer.tsx apps/app/src/features/pulse/__dev__/mock-pulse.ts apps/app/src/features/pulse/components/PulseAlertCard.tsx apps/app/src/features/pulse/components/PulseAlertCard.test.tsx apps/app/src/features/pulse/components/PulseReadinessStatus.tsx apps/app/src/features/pulse/components/PulseReadinessStatus.test.tsx apps/app/src/features/pulse/components/PulseStructuredFields.tsx apps/app/src/features/pulse/components/PulseStructuredFields.test.tsx apps/app/src/features/pulse/lib/impact-filter.test.ts apps/app/src/features/pulse/lib/revert-window.test.ts apps/app/src/features/clients/client-detail-model.test.ts apps/app/src/i18n/locales/en/messages.po apps/app/src/i18n/locales/zh-CN/messages.po docs/dev-log/2026-05-28-pulse-deadline-selection-readiness.md`
- Browser automation against `http://localhost:5173/rules/pulse` confirmed the list renders
  `Ready to apply`, `Needs deadline selection`, and `Review only`; duplicate copy renders as an
  aggregate similar-source count; and no `policy-watch` source name leaks into the list or drawer.
