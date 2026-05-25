---
title: 'Rule library: default verified Federal rules to active'
date: '2026-05-23'
---

# Rule library: default verified Federal rules to active

Verified Federal template rules were appearing as `pending_review` in the Rule Library when the
practice had no explicit rule override. The server was wrapping every unreviewed template in a
pending-review contract rule, which was correct for candidate/state coverage but wrong for the
Federal baseline.

## Fix

- `apps/server/src/procedures/rules/index.ts`
  - Adds a default-active rule gate for verified `FED` templates.
  - Returns verified Federal templates as active when there is no practice override.
  - Treats historical `pending_review` practice rows for verified Federal templates as active.
  - Keeps Federal candidate rules, such as disaster-relief watch rules, in pending review.
  - Suppresses stale open `new_template` review tasks for verified Federal templates.
  - Includes verified Federal templates in active rule generation unless the practice explicitly
    rejected or archived them.
- `apps/server/src/procedures/rules/onboarding-activation.test.ts`
  - Adds coverage for the default-active Federal helper, including verified source-defined Federal
    templates, and confirms candidates still require review.

## Validation

- `pnpm --filter @duedatehq/server test -- src/procedures/rules/onboarding-activation.test.ts`
- `pnpm --filter @duedatehq/app test -- --run src/routes/rules.library.test.tsx`
- `pnpm check`
- Chrome at `http://localhost:5173/rules/library`: Federal showed `ACTIVE 13`;
  only the Federal disaster-relief candidate remained in `NEEDS REVIEW 1`.
