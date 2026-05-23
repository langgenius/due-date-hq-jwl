---
title: '2026-05-23 · Arkansas source-backed rule excerpts'
date: 2026-05-23
author: 'Codex'
---

# Arkansas source-backed rule excerpts

## Context

Opening `ar.fiduciary_income_return.candidate.2026` in Rule Library could show
`Official source text could not be fetched for the selected source.`

The rule was still backed by a placeholder source excerpt. Concrete draft generation intentionally
rejects those placeholders and falls back to live official-source fetching; when the official source
cannot be fetched in the local environment, the drawer surfaces the fetch failure.

## Change

- Moved Arkansas fiduciary candidate coverage from the generic income-tax deadlines source to a
  dedicated `ar.fiduciary_income_tax` PDF source.
- Updated Arkansas estimated tax, corporation income tax, sales/use tax, and withholding sources to
  current focused official URLs.
- Added source-backed excerpts for all Arkansas state candidate domains so the concrete draft path
  has deterministic official text without relying on live fetches.
- Added a core regression test that checks Arkansas candidate source ids and rejects placeholder
  excerpts.

## Validation

- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
