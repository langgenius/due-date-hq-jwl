---
title: 'Rule concrete drafts use official source text'
date: 2026-05-20
author: 'Codex'
area: rules
---

# Rule concrete drafts use official source text

## Context

After resetting active practice rules for re-review, source-defined candidate
rules such as `al.individual_income_return.candidate.2026` were opening the
AI concrete draft panel and returning 400s from `/rpc/rules/draftConcreteRule`.
The draft source context only contained registry metadata like "official source
registered", not the official page body, so the AI either failed source-excerpt
guarding or risked drafting from placeholder text.

## Change

- `draftConcreteRule` / `verifyCandidate` now add a live official source text
  snapshot from the selected source URL when HTML/text is available.
- Official source extraction now preserves readable page body text, FAQPage
  JSON-LD, and accordion/hidden FAQ answers that are present in the HTML, so
  AI draft generation can summarize source page copy instead of registry
  metadata.
- Placeholder source-watch metadata is filtered out before prompting and is
  rejected by both server validation and the AI guard if returned as evidence.
- The rule detail review panel only enables the draft query for fetchable
  HTML/manual-review sources or source evidence that already contains concrete
  basis/cross-check text.
- The AI guard keeps allowing non-contiguous but source-backed excerpts while
  continuing to reject made-up or placeholder excerpts.
- `rule-concrete-draft@v1` prompt now explicitly tells the model to read the
  extracted page copy, including FAQ answers, and summarize it into compact
  source-backed rule fields.

## Verification

- `pnpm --filter @duedatehq/ai test` — pass, 20 tests.
- `pnpm --filter @duedatehq/server test` — pass, 196 tests.
- `pnpm --filter @duedatehq/app test` — pass, 231 tests.
- `pnpm check` — pass.
