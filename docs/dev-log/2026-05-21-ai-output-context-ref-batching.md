# AI Output Context Ref Batching

## Change

`rules.listConcreteDrafts` could pass hundreds of concrete draft cache keys into
`findSuccessfulRunsByContextRefs`, which produced one oversized
`ai_output.input_context_ref in (...)` query. Cloudflare D1 rejected that query
with `D1_ERROR: too many SQL variables`.

`packages/db/src/repo/ai.ts` now deduplicates requested context refs and queries
them in D1-safe batches before merging, sorting by `generatedAt desc`, and
returning the latest successful run per context ref.

## Scope

- `packages/db/src/repo/ai.ts`
- `packages/db/src/repo/ai.test.ts`

## Verification

- `pnpm --filter @duedatehq/db test -- ai`
- `pnpm --filter @duedatehq/server test -- rules`
- `pnpm check`

## Design / Docs Alignment

No `DESIGN.md` update is required. This changes only repository query shape for
AI output cache reads and does not affect product IA, UI copy, or design tokens.
