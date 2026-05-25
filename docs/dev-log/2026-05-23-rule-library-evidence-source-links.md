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
- The handler no longer falls back to same-tab navigation when `window.open` returns `null`;
  browsers can report `null` for `noopener` even after opening the new tab.
- Added route-level regression tests that click an evidence card, verify the official source URL is
  opened from the source registry, and keep the current Rule Library page in place.

## Validation

- `pnpm --filter @duedatehq/app test -- src/routes/rules.library.test.tsx`
- `pnpm exec vp check apps/app/src/features/rules/rule-detail-drawer.tsx apps/app/src/routes/rules.library.test.tsx docs/dev-log/2026-05-23-rule-library-evidence-source-links.md`
- Local Playwright smoke on
  `/rules/library?rule=fed.1040.return.2025`: clicking the IRS evidence card opened
  `https://www.irs.gov/filing/individuals/when-to-file` in a popup and left the Rule Library URL
  unchanged.
