---
title: 'Rule concrete draft source-domain guard'
date: 2026-05-21
author: 'Codex'
area: rules
---

# Rule concrete draft source-domain guard

## Context

Alabama due-date review exposed two edge cases in AI concrete rule drafting:

- A user can reason from a source page that contains complete due-date rows, but
  the selected rule template may belong to a different source domain.
- Table-based official pages need a stable single-line row in `sourceText` so
  the AI can copy a verbatim `sourceExcerpt` that the guard can locate.

## Change

- `draftConcreteRule` and `verifyCandidate` now reject selected sources that do
  not match the rule template's source domain or explicit template `sourceIds`.
- Concrete draft generation now fails before calling AI when no source-backed
  text is available from a source signal, concrete evidence, or fetched official
  source page.
- Official source extraction now adds normalized table rows, preserving rows
  such as Alabama's `Individual Income Tax` and `S-Corporation` due-date lines
  as copyable excerpt text.
- The concrete draft prompt now tells the model to copy the relevant due-date
  table row exactly when a table supports the rule.

## Verification

- `pnpm --filter @duedatehq/core test`
- `pnpm --filter @duedatehq/server test -- source-text`
- `pnpm --filter @duedatehq/server test`
- `pnpm --filter @duedatehq/ai test`
- `pnpm --filter @duedatehq/server build`
- `pnpm check` reports pre-existing formatting issues in
  `apps/app/src/routes/migration.new.tsx` and
  `docs/product-design/rules/02-rules-console-product-design.md`.
