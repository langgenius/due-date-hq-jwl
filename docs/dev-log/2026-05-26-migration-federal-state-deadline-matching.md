# 2026-05-26 · Migration Federal + state deadline matching

Migration import now keeps Federal and state rule previews as independent generated deadlines.
Previously the commit plan treated a matching state workflow as a replacement for the Federal
counterpart, which meant imports could hide Form 1040 / 1120-S style Federal deadlines once a state
return rule was available.

Changes:

- Removed the state-first suppression helper from the migration commit plan.
- Kept the existing concrete-preview de-dupe key so duplicated Federal previews across multi-state
  filing profiles collapse to one deadline.
- Updated migration service tests for state-review warnings, active Federal + state generation, and
  multi-state filing profile behavior.
- Documented that `/migration/new` and onboarding migration inherit the same Federal + state
  matching pipeline; no separate selector or contract change is needed.

Validation:

- `pnpm --filter @duedatehq/server test --run src/procedures/migration/_service.test.ts`
- `pnpm check`
- `/migration/new` local spot check with system Chrome: server returned 200 and redirected the
  unauthenticated headless session to `/login?redirectTo=%2Fmigration%2Fnew`.
