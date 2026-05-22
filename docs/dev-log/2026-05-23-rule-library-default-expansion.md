---
title: 'Rule library: default to Federal-only expansion'
date: '2026-05-23'
---

# Rule library: default to Federal-only expansion

The Rule Library V3 table was auto-expanding every jurisdiction with pending review or coverage
gaps. Because most state candidate rules are pending review, the first load looked noisy and made it
hard to scan the state list.

## Fix

- `apps/app/src/routes/rules.library.tsx`
  - Changes the initial expansion set to include only `FED` when Federal is present.
  - Updates the route-level notes to describe Federal as the default orientation row and states as
    collapsed by default.
- `apps/app/src/routes/rules.library.test.tsx`
  - Adds coverage that Federal rule rows render on first load while a state rule row remains hidden
    until that state is expanded.
  - Updates the missing-gap positive case to expand a state before asserting its add-rule rows.

## Validation

- `pnpm --filter @duedatehq/app test -- --run src/routes/rules.library.test.tsx`
