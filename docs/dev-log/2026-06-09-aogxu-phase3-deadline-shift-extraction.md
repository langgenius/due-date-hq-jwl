# Alert detail → Aogxu Phase 3 — AI-extracted relief facts (deadline shift)

Date: 2026-06-09

Pencil Aogxu: the Extracted-facts grid's RELIEF TYPE / DEADLINE TYPES (Filing +
Payment) / OPT-IN cells + the "no penalties accrue" practice-impact bullet need
AI-extracted facts. Built via the existing freeform `structuredChange` JSON — NO
migration, fully backward-compatible, behind the "AI parsed — verify before Apply"
gate. (Yuqi chose "build it (plumbing + gate)".)

## Changes

- **packages/ai/src/pulse.ts**: `PulseDeadlineShiftFactsSchema`/type (reliefType,
  deadlineTypes: ('filing'|'payment')[], optInRequired, penaltyRelief — all
  optional/nullable). `structuredChange` stays `unknown` (freeform → graceful old-row degrade).
- **packages/ai/src/prompter.ts**: pulse-extract prompt asks for a
  `structuredChange.deadlineShift` block on deadline_shift alerts ONLY when the
  source clearly states each fact (F-041 no-guessing; penaltyRelief/optInRequired
  only when supported). Prompt version unchanged.
- **packages/contracts/src/pulse.ts**: exported `PulseDeadlineShiftFactsSchema`
  for safe UI parsing; `PulseDetail.structuredChange` stays `unknown`.
- **packages/db/.../ops.ts**: no change — write path stores structuredChange as-is.
- **AlertStructuredFields.tsx**: `deadlineShiftFacts(detail)` reader (mirrors
  `protectiveClaimFacts`); deadline_shift alerts WITH facts show RELIEF TYPE /
  DEADLINE TYPES / OPT-IN; per-cell fallback to CHANGE TYPE / ENTITY TYPES / APPLY
  MODE when absent (old alerts render unchanged).
- **AlertDetailDrawer.tsx**: PracticeImpactSection's payments bullet ("…postponed
  — no penalties accrue") renders only when deadlineTypes includes payment AND
  penaltyRelief; else omitted.
- **packages/ai/src/ai.test.ts**: schema/shape tests (pass-through + partial).

## Verify

app + server tsgo clean; packages/ai (33) + packages/db (146) tests pass. Injected
a deadlineShift blob into a local pulse → the grid rendered RELIEF TYPE "Disaster
(auto-applied)" / DEADLINE TYPES "Filing + Payment" / OPT-IN "Not required"
(screenshot), then reverted the demo data. Old alerts fall back cleanly (no
regression, no error boundary). FLAG: live LLM extraction quality is NOT verifiable
locally — needs a real extraction run + prompt review before relying on these
claims (the verify-before-apply gate covers the interim).
