---
title: 'Rule concrete draft AL franchise fallback'
date: 2026-05-22
author: 'Codex'
area: rules
---

# Rule concrete draft AL franchise fallback

## Context

`al.franchise_or_entity_tax.candidate.2026` could return a 400 from
`draftConcreteRule` when official Alabama source text was unavailable or when
the fetched due-date table rendered ordinal text such as `15^{th}` in a shape
that made excerpt matching brittle. The frontend also let TanStack Query retry
the failing draft query, delaying the visible error.

## Change

- Added a source-backed Alabama business privilege tax due-date excerpt to the
  generated state candidate rule while keeping the rule bound to `al.due_dates`.
- Normalized source-text ordinals such as `15^{th}` and `15 th` to `15th` before
  AI excerpt validation.
- Disabled retry for the two `draftConcreteRule` queries that generate the
  selected rule's concrete draft, so the user sees the first failure immediately.

## Verification

- `pnpm --filter @duedatehq/core test -- rules`
- `pnpm --filter @duedatehq/server test -- source-text concrete-draft`
- `pnpm --filter @duedatehq/app test -- coverage-tab`
- `pnpm check` passes with existing warnings in breadcrumb, kbd, obligations,
  dashboard actions, and obligation queue facets.
