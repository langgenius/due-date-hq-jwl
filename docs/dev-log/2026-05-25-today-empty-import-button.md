# 2026-05-25 — Today empty import CTA button

## Change

Yuqi flagged the empty `Actions this week` import affordance on Today: it
looked and behaved like an inline link, while the Deadlines empty state uses a
real small CTA button.

Updated `DashboardActionsList` so the zero-deadlines branch uses the shared
`EmptyState` pattern and renders `Import clients` as the normal small button
CTA. The non-empty "Nothing due this week" branch still keeps its inline
navigation link because it points to existing deadlines instead of starting an
import workflow.

## Design alignment

No `DESIGN.md` change is needed. This reuses the existing shared empty-state
chrome and button primitive; no tokens, component contracts, or IA changed.

## Verification

- `pnpm --filter @duedatehq/app test -- actions-list`
- `pnpm --filter @duedatehq/app exec tsc --noEmit`
- `pnpm exec vp check apps/app/src/features/dashboard/actions-list.tsx apps/app/src/features/dashboard/actions-list.test.tsx docs/dev-log/2026-05-25-today-empty-import-button.md`
- `git diff --check -- apps/app/src/features/dashboard/actions-list.tsx apps/app/src/features/dashboard/actions-list.test.tsx`
