---
title: 'Coverage expanded rule rows show pointer cursor'
date: 2026-05-21
author: 'Codex'
area: rules
---

# Coverage expanded rule rows show pointer cursor

## Change

- Expanded coverage rule rows now use a pointer cursor and select the rule when
  clicking the row surface, while source links and bulk-selection checkboxes
  keep their own click behavior.

## Verification

- `pnpm --filter @duedatehq/app test -- coverage-tab` - pass, 7 tests.
