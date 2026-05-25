---
title: 'Rule library: default to collapsed jurisdiction groups'
date: '2026-05-23'
---

# Rule library: default to collapsed jurisdiction groups

The Rule Library V3 table previously auto-expanded Federal on first load. That still made the first
paint read as partially open, so the page now starts with every jurisdiction group collapsed.

## Fix

- `apps/app/src/routes/rules.library.tsx`
  - Changes the initial expansion set to empty, including `FED`.
  - Updates the route-level notes to describe all jurisdictions as collapsed by default.
- `apps/app/src/routes/rules.library.test.tsx`
  - Updates coverage so Federal and state rule rows are both hidden on first load.
  - Confirms expanding Federal still reveals its rule rows.

## Validation

- `pnpm --filter @duedatehq/app test -- --run src/routes/rules.library.test.tsx`
