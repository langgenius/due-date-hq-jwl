---
title: 'Deadlines route URL'
date: 2026-05-24
area: deadlines
---

# Deadlines Route URL

## Change

The user-facing deadlines workbench now uses `/deadlines` instead of `/obligations`.
The legacy `/obligations` and `/obligations/calendar` URLs remain available as redirects so
old shared links keep working.

## Implementation

- Added canonical `/deadlines` and `/deadlines/calendar` routes while keeping the existing
  obligations route module and domain model names unchanged.
- Updated navigation, command palette entries, workload deep links, client deep links, reminders,
  dashboard links, and rule preview links to generate `/deadlines`.
- Updated route title metadata and current product/design docs that described the old canonical URL.

## Validation

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/app test -- router.test.ts login.test.tsx onboarding-firm-flow.test.ts app-shell-user-menu.test.ts types.test.ts ClientPeekHoverCard.test.tsx generation-preview-tab.test.tsx`
- `pnpm --filter @duedatehq/app test -- router.test.ts`
- `pnpm --filter @duedatehq/app exec tsc --noEmit --pretty false`
- `pnpm exec vp check DESIGN.md apps/app/src/router.tsx apps/app/src/router.test.ts apps/app/src/routes/route-summary.ts apps/app/src/components/patterns/app-shell-nav.tsx apps/app/src/components/patterns/app-shell-user-menu.test.ts apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx apps/app/src/components/patterns/keyboard-shell/navigation-shortcuts.ts apps/app/src/components/patterns/keyboard-shell/types.test.ts apps/app/src/features/audit/audit-log-page.tsx apps/app/src/features/calendar/calendar-page.tsx apps/app/src/features/clients/ClientDetailDrawer.tsx apps/app/src/features/clients/ClientFactsWorkspace.tsx apps/app/src/features/clients/ClientPeekHoverCard.tsx apps/app/src/features/clients/ClientPeekHoverCard.test.tsx apps/app/src/features/clients/ClientSummaryStrip.tsx apps/app/src/features/dashboard/actions-list.tsx apps/app/src/features/dashboard/exposure-strip.tsx apps/app/src/features/members/members-page.tsx apps/app/src/features/migration/Wizard.tsx apps/app/src/features/obligations/ObligationDrawerProvider.tsx apps/app/src/features/pulse/components/AffectedClientsTable.tsx apps/app/src/features/reminders/reminders-page.tsx apps/app/src/features/rules/generation-preview-tab.tsx apps/app/src/features/rules/generation-preview-tab.test.tsx apps/app/src/features/workload/workload-links.ts apps/app/src/features/workload/workload-page.tsx apps/app/src/i18n/locales/en/messages.po apps/app/src/i18n/locales/en/messages.ts apps/app/src/i18n/locales/zh-CN/messages.po apps/app/src/i18n/locales/zh-CN/messages.ts apps/app/src/routes/billing.tsx apps/app/src/routes/dashboard.tsx apps/app/src/routes/login.test.tsx apps/app/src/routes/obligations.tsx apps/app/src/routes/onboarding-firm-flow.test.ts apps/app/src/routes/rules.library.tsx apps/app/src/routes/settings.tsx docs/Design/DueDateHQ-DESIGN.md docs/Design/clients-list-and-detail-critique-2026-05-22.md docs/Design/unified-table-surface-vocabulary.md docs/IA/obligation-row-IA.md docs/PRD/DueDateHQ-PRD-v2.0-Part2B.md docs/dev-file/05-Frontend-Architecture.md docs/dev-log/2026-05-24-deadlines-route-url.md docs/project-modules/01-app-spa.md e2e/pages/app-shell-page.ts e2e/pages/obligations-page.ts e2e/pages/workload-page.ts e2e/tests/authenticated-shell.spec.ts e2e/tests/obligations.spec.ts e2e/tests/workload.spec.ts`
- `pnpm exec vp check apps/app/src/router.tsx apps/app/src/features/calendar/calendar-page.tsx apps/app/src/features/workload/workload-page.tsx apps/app/src/features/clients/ClientDetailDrawer.tsx docs/dev-log/2026-05-24-deadlines-route-url.md`
- `git diff --check -- DESIGN.md apps/app/src/router.tsx apps/app/src/router.test.ts apps/app/src/routes/route-summary.ts apps/app/src/components/patterns/app-shell-nav.tsx apps/app/src/components/patterns/app-shell-user-menu.test.ts apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx apps/app/src/components/patterns/keyboard-shell/navigation-shortcuts.ts apps/app/src/components/patterns/keyboard-shell/types.test.ts apps/app/src/features/audit/audit-log-page.tsx apps/app/src/features/calendar/calendar-page.tsx apps/app/src/features/clients/ClientDetailDrawer.tsx apps/app/src/features/clients/ClientFactsWorkspace.tsx apps/app/src/features/clients/ClientPeekHoverCard.tsx apps/app/src/features/clients/ClientPeekHoverCard.test.tsx apps/app/src/features/clients/ClientSummaryStrip.tsx apps/app/src/features/dashboard/actions-list.tsx apps/app/src/features/dashboard/exposure-strip.tsx apps/app/src/features/members/members-page.tsx apps/app/src/features/migration/Wizard.tsx apps/app/src/features/obligations/ObligationDrawerProvider.tsx apps/app/src/features/pulse/components/AffectedClientsTable.tsx apps/app/src/features/reminders/reminders-page.tsx apps/app/src/features/rules/generation-preview-tab.tsx apps/app/src/features/rules/generation-preview-tab.test.tsx apps/app/src/features/workload/workload-links.ts apps/app/src/features/workload/workload-page.tsx apps/app/src/i18n/locales/en/messages.po apps/app/src/i18n/locales/en/messages.ts apps/app/src/i18n/locales/zh-CN/messages.po apps/app/src/i18n/locales/zh-CN/messages.ts apps/app/src/routes/billing.tsx apps/app/src/routes/dashboard.tsx apps/app/src/routes/login.test.tsx apps/app/src/routes/obligations.tsx apps/app/src/routes/onboarding-firm-flow.test.ts apps/app/src/routes/rules.library.tsx apps/app/src/routes/settings.tsx docs/Design/DueDateHQ-DESIGN.md docs/Design/clients-list-and-detail-critique-2026-05-22.md docs/Design/unified-table-surface-vocabulary.md docs/IA/obligation-row-IA.md docs/PRD/DueDateHQ-PRD-v2.0-Part2B.md docs/dev-file/05-Frontend-Architecture.md docs/project-modules/01-app-spa.md e2e/pages/app-shell-page.ts e2e/pages/obligations-page.ts e2e/pages/workload-page.ts e2e/tests/authenticated-shell.spec.ts e2e/tests/obligations.spec.ts e2e/tests/workload.spec.ts`
- Playwright browser smoke on `localhost:5173`: `/deadlines?status=review` loaded the
  Deadlines heading; `/obligations?status=review` redirected to `/deadlines?status=review`;
  `/obligations/calendar?scope=mine` redirected to `/deadlines/calendar?scope=mine`; sidebar
  and calendar back links both point to `/deadlines`; console warnings/errors: none.
