# 2026-05-21 · AI fair-use test bypass

## Change

- Scoped AI fair-use budget enforcement to production. `ENV=development` and `ENV=staging`
  now skip KV budget reads/writes and cannot return `AI_BUDGET_EXCEEDED`.
- Kept the previous default for package-level callers that do not pass `ENV`: budget enforcement
  still applies when a firm id and KV budget binding are provided.
- Added AI facade coverage proving development and staging continue to call the gateway even when
  the KV counter is already above the plan cap.

## Validation

- `pnpm --filter @duedatehq/ai test -- src/ai.test.ts`
- `pnpm --filter @duedatehq/ai test`
- `pnpm exec vp check packages/ai/src/index.ts packages/ai/src/ai.test.ts docs/dev-file/04-AI-Architecture.md docs/project-modules/09-ai-engine.md docs/product-design/billing/01-practice-entitlement-pricing.md docs/dev-log/2026-05-21-ai-fair-use-test-bypass.md`

## Docs

- `docs/dev-file/04-AI-Architecture.md` now states that fair-use budget counters are production-only.
