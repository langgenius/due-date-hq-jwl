# Migration Step 2: deterministic name-matcher fallback for the mapper

**Date:** 2026-06-06
**Surface:** Migration Copilot Step 2 Mapping (`/migration/new`, onboarding import)

## Change

When the AI Mapper is unreachable (e.g. no AI gateway key in local dev, or
`AI_BUDGET_EXCEEDED`/`AI_GATEWAY_ERROR` in prod) **and** the user did not pick a
source-tool preset in Step 1, the mapper used to fall straight to
`buildAllIgnoreMappings` — every column set to IGNORE. That blocked Continue and
showed *"We couldn't reach AI and no preset was selected. Please map columns
manually… N columns are currently ignored."* — a dead-end for any plain CSV,
even one with obviously-named columns. It also contradicted the wizard's "any
shape works, we'll figure out the columns" promise.

Added a deterministic name-matcher as an intermediate fallback so a generic CSV
still produces a reviewable draft without AI and without a preset.

- New `'heuristic'` value on `MapperFallbackSchema`
  (`packages/contracts/src/migration.ts`).
- `buildHeuristicMappings` + a curated, source-agnostic `GENERIC_HEADER_MAPPINGS`
  dictionary (`apps/server/src/procedures/migration/_preset-mappings.ts`). It
  recognises the common, unambiguous headers that recur across every tool
  (name, EIN/tax id, client id, state, filing states, entity type, fiscal year
  end, email, phone, city/zip/address, preparer, status, notes). Genuinely
  ambiguous headers ("return type", "contact name", "email address", "type")
  are deliberately excluded and fall to IGNORE. Rows are tagged at confidence
  `0.7` (below the 0.8 review bar) so they surface as "needs review".
- `runMapper` (`apps/server/src/procedures/migration/_service.ts`): on the
  no-AI/no-preset path it now tries the name-matcher first; only when it
  recognises *nothing* does it fall to `all_ignore`.
- Step 2 UI (`apps/app/src/features/migration/Step2Mapping.tsx`): the
  `heuristic` state renders a calm `info` banner ("Matched your columns by name
  — review before continuing"), a "Matched by name" capability badge, and an
  honest step heading ("Review your column mappings" instead of "AI prepared
  your columns") in any fallback state. The destructive all-ignore banner +
  "N columns ignored" warning are unchanged and now only show when nothing
  matched.

Because the name-matcher maps at least one column to a non-IGNORE target, Step 2
Continue (`computeCanContinue`: "at least one column mapped") is naturally
satisfied — the user reviews instead of being blocked.

## Docs Alignment

Behavior sits under `docs/product-design/migration-copilot/02-ux-4step-wizard.md`
§5.4 (mapper fallback banner). No `DESIGN.md` token/visual contract changed —
the new banner reuses the existing `info` Alert variant and the standard
capability-badge pattern. (Step 5.4 fallback enumeration could be extended to
name the `heuristic` channel in a follow-up doc pass.)

## Validation

- `apps/server` migration suite: 116/116 pass — updated the no-preset test to
  assert the `heuristic` path + mapped fields, added a true-`all_ignore` test
  (unrecognised headers `Col A/B/C`), and updated the messy-fixture golden test
  (now `heuristic`; downstream bad-row count unchanged because mappings are
  fully overridden).
- `pnpm check` (whole monorepo typecheck + lint): 0 errors.
- Browser note: this React 19 dev build does not fire `onChange` for
  programmatically-injected events, and local dev has no AI gateway key, so the
  flow was verified at the server/test level rather than driven through the
  preview.
