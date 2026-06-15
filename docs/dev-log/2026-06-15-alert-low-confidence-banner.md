# Alert detail — hoist + sharpen the low-confidence banner (Pencil gsl8K)

_2026-06-15_

For very-low-confidence extractions (AI confidence < 50%, e.g. the FL DOR
bulletin at 46%), the "double-check this" banner used to sit **buried inside
the Source section** — the CPA had to scroll past the Change grid to learn the
model was unsure. Pencil gsl8K makes the uncertainty the first thing they see.

## What

- **Hoisted** the `isLowAiConfidence` banner to the TOP of the detail body
  (first children, above the numbered Change section — same slot as the
  c5ArV1 source-health banner), so low confidence reads before any parsed
  value the CPA might otherwise trust.
- **Sharpened** it from one prose sentence into a scannable checklist:
  title "Low AI confidence (N%) — verify before you act" + a verify list
  ("the parsed fields match the source excerpt below", "the structured scope
  is right for your clients"). Lead sentence still branches on firmImpact
  (mark-reviewed vs push-to-clients).
- Added the `TriangleAlertIcon` for the warning icon treatment, matching the
  source-health banner.

Real data only: the % is `alert.confidence`; the checklist is verification
guidance, not fabricated findings.

## Verified

Live on alert 3004 (FL DOR, 46%): banner sits at the top above Change, shows
the real 46%, the two checklist items render. tsgo + vp check clean; lingui
compile --strict 0 missing (5 new strings translated to zh-CN).
