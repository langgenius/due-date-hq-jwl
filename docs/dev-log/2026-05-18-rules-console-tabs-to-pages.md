---
title: 'Rules Console Tabs → Dedicated Pages'
date: 2026-05-18
author: 'Claude'
area: rules
---

# Rules Console Tabs → Dedicated Pages

## Context

The Rules Console mounted six unrelated workflows (Coverage, Sources, Rule
library, Pulse changes, Temporary rules, Obligation preview) behind a single
`/rules` route with a `?tab=` query param. The tab rib hid every workflow
behind one extra click and made deep-linking awkward (Pulse banner had to
stamp `/rules?tab=pulse&sourceReview=1#pulse-source-health`).

Each former tab is now its own page reachable directly from a dedicated
sidebar entry under a new top-level "Rules" group.

## Change

- Added routes `/rules/coverage`, `/rules/sources`, `/rules/library`,
  `/rules/pulse`, `/rules/temporary`, `/rules/preview` in [router.tsx](apps/app/src/router.tsx),
  each lazily importing a thin route component that wraps the existing tab
  panel in a new `RulesPageShell` (24 px padding · single scroll region ·
  per-page title + description).
- Replaced the `RulesRoute` index component with `rulesIndexLoader`
  ([rules.tsx](apps/app/src/routes/rules.tsx)) which redirects `/rules` to
  `/rules/coverage` and preserves any legacy `?tab=` deep-link onto the
  matching sub-route (so the Pulse banner pre-refactor URLs still resolve).
- Restructured the sidebar in [app-shell-nav.tsx](apps/app/src/components/patterns/app-shell-nav.tsx)
  to add a "Rules" group between Operations and Clients containing the six
  direct entries. The Pulse alert count badge now sits on the Pulse changes
  entry instead of the rolled-up Rules entry.
- Updated the [Command Palette](apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx)
  to expose all six sub-pages as independent navigate actions.
- Pointed the Pulse banner deep-link and Pulse drawer pathname check at the
  new `/rules/pulse` route ([PulseAlertsBanner.tsx](apps/app/src/features/pulse/PulseAlertsBanner.tsx),
  [DrawerProvider.tsx](apps/app/src/features/pulse/DrawerProvider.tsx)).
- Removed the `RulesConsole` component plus the tab-only model exports
  (`RULES_TABS`, `RULES_TAB_VALUES`, `DEFAULT_RULES_TAB`,
  `rulesConsoleSearchParamsParsers`, `RulesConsoleSearchParams`, `RulesTab`,
  `isRulesTab`) from [rules-console-model.ts](apps/app/src/features/rules/rules-console-model.ts);
  pruned the matching `rules-console-model.test.ts` assertion.
- Rewrote the e2e fixture/spec in [rules-console-page.ts](e2e/pages/rules-console-page.ts)
  and [rules-console.spec.ts](e2e/tests/rules-console.spec.ts) to navigate via
  the new sidebar links and assert on the new sub-route URLs.

## Docs Check

No DESIGN.md update needed — this is a navigation/IA reshuffle that keeps the
existing layout invariants (24 px padding, single scrollable content column)
intact. The inline layout commentary that lived in `rules-console.tsx` is now
encoded in `RulesPageShell` inside [rules-console-primitives.tsx](apps/app/src/features/rules/rules-console-primitives.tsx).

## Validation

- `pnpm check`
- `pnpm test`
