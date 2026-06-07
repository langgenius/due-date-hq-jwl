# Migration SuccessModal — real rules-active + upcoming counts

Date: 2026-06-07

Backend data pass, item 2. The Applied SuccessModal (Pencil uoNwI) showed two
static-zero stats; both are now computed from the commit plan at apply time.

## What shipped (no DB migration)

- `packages/contracts/src/migration.ts` — `ApplyResultSchema` gains
  `rulesActiveCount` + `upcomingCount`.
- `apps/server/src/procedures/migration/_service.ts` — `apply()` derives them
  from `plan.obligations`: `rulesActiveCount` = distinct `ruleId`;
  `upcomingCount` = obligations whose `baseDueDate` falls within 30 days of
  `plan.appliedAt`. No extra query.
- `apps/app/src/features/migration/SuccessModal.tsx` — the "deadlines" stat
  sub-line now reads "from N active rules"; the "upcoming · 30 days" stat shows
  the real count. Removed the three `TODO(data)` fallbacks.
- `apps/app/src/features/migration/Wizard.tsx` — passes the two fields through.

"Emails sent" stays 0 by design (DueDateHQ never emails a client until the rule
is turned on).

## Verify

- tsgo (app + server + contracts) → 0
- migration: app 66/66, server 59/59; contracts 29/29
- `vp check` → 0 errors
