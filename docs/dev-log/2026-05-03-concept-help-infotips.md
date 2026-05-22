---
title: 'Concept Help Infotips'
date: 2026-05-03
author: 'Codex'
---

# Concept Help Infotips

## Context

DueDateHQ now has several product-specific operating terms, such as Smart Priority, Deadline Radar,
Evidence gap, and Migration Copilot. New users need short in-product explanations without turning
dense tables and work queues into onboarding copy.

## Change

- Added `apps/app/src/features/concepts/concept-help.tsx` as the centralized frontend glossary.
- Exposed `ConceptHelp` for standalone question-mark infotips and `ConceptLabel` for inline labels,
  table headers, section headings, and compact card titles.
- Used the existing Base UI `Popover` primitive with hover, focus, and click/tap support instead of
  plain tooltip semantics.
- Applied first-appearance infotips across Dashboard, Obligations, Practice, Rules, Migration, Pulse,
  and Audit surfaces.
- Added Lingui-backed English and zh-CN labels and short definitions for the initial concept list.

## Design Notes

The new pattern reuses the existing popover primitive and neutral icon-button styling. No new design
tokens, API contracts, database schema, or server behavior were introduced.

## Validation

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/app test`
- `pnpm --filter @duedatehq/app build`
- `pnpm check`

## Browser Check

Attempted the affected seeded Playwright route set with existing local worker reuse:
`E2E_REUSE_EXISTING_SERVER=true pnpm test:e2e e2e/tests/obligations.spec.ts e2e/tests/rules-console.spec.ts e2e/tests/migration-wizard.spec.ts e2e/tests/audit-log.spec.ts e2e/tests/pulse.spec.ts e2e/tests/practice-switch.spec.ts --project=chromium`.

Result: 13 passed, 3 failed, 1 skipped. The failures were existing route/test-data drift outside the
infotip change: `pulse.spec.ts` still expected the removed `Next deadlines` surface,
`obligations.spec.ts` expected a seeded Dashboard row that was not present after current triage data,
and `migration-wizard.spec.ts` timed out waiting for AI normalization.

## Follow-up

- `ConceptLabel` now uses string children as the popover trigger accessible label, so inline copy
  like `Exposure` can remain distinct from the glossary title `Legacy penalty estimate`.
- Validation: `pnpm --filter @duedatehq/app exec vp test src/features/concepts/concept-help.test.tsx`;
  `pnpm exec vp run ci`.
