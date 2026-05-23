---
title: '2026-05-23 · Rule library evidence source links'
date: 2026-05-23
author: 'Codex'
---

# Rule library evidence source links

## Context

Evidence cards in the Rule Library detail modal displayed an external-link affordance but clicking
the card did not reliably navigate to the official source in the in-app browser.

## Change

- Evidence source cards now keep their native `href` and also handle click explicitly with
  `window.open`.
- If the browser blocks opening a new tab, the handler falls back to same-tab navigation with
  `window.location.assign`.
- Added a route-level regression test that clicks an evidence card and verifies the official source
  URL is opened from the source registry.

## Validation

- `pnpm --filter @duedatehq/app test -- src/routes/rules.library.test.tsx`
- `pnpm exec vp check apps/app/src/features/rules/rule-detail-drawer.tsx apps/app/src/routes/rules.library.test.tsx docs/dev-log/2026-05-23-rule-library-evidence-source-links.md`
