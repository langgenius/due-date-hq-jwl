# 2026-06-12 — Penalty exposure computes honestly; priority score bands itself

From the full-app UX critique (P0 #3): the deadline detail's Penalty
exposure card showed "$245 x 3 x 3 months = $2,400" — arithmetic that
doesn't compute (245×9 = $2,205) and the wrong statute besides (the
per-partner 1065 flat rate displayed on a Form 1040). Next to it,
"PRIORITY SCORE 94/100 — Moderate risk" paired the smart-priority score
with the unrelated seeded `riskLevel` field, reading as a broken scale.
A CPA recomputes any dollar figure in their head; one wrong number
poisons every other number on the page.

## Change

1. **Seed generator computes exposure from facts**
   (`packages/db/seed/generate-demo.ts` → regenerated `mock/demo.sql`):
   - `exposure()` now takes breakdown items and derives
     `estimated_exposure_cents` as their sum — a total can never disagree
     with its formula again.
   - `overdue_penalty` (the Riverside 1040): §6651 on the client's real
     seeded balance ($18,000), projected 3 months — late filing 4.5%/mo
     net of the failure-to-pay offset ($2,430) + failure-to-pay 0.5%/mo
     ($270) = $2,700.
   - `extended_auto` rows: failure-to-pay §6651(a)(2) computed from each
     client's actual balance (1120 $162,000 → $2,430; 1041 $26,000 →
     $390), and ONLY on rows that really carry a federal payment date —
     the FBAR (information return) and CA 568 no longer carry a
     fabricated failure-to-pay exposure.

2. **Canonical priority banding** (`packages/core/src/priority/index.ts`):
   new `smartPriorityBand(score)` → `high (≥75) / elevated (≥45) / normal`.
   `PenaltyExposureCard` derives the label from the score itself
   ("High / Elevated / Normal priority") instead of juxtaposing
   `riskLevel`. 94/100 now reads "High priority".

## Verify

- `packages/core` vitest 22 files / 299 tests pass; `tsgo --noEmit -p apps/app` clean.
- Regenerated `mock/demo.sql` diff touches only penalty fields; amounts
  cross-check by hand (18,000 × 4.5% × 3 = 2,430 ✓).
- Live (5177): `/deadlines/000000000003` panel reads "94/100 · High
  priority"; "Moderate risk" gone. The new dollar breakdowns appear after
  the next `seed:demo` (batched in the Phase 1e seed-truthing pass).
