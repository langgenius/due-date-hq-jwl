# Onboarding StepDots — accurate states, named steps, one primitive (2026-07-31)

Yuqi directive: "你要确保 steps 和 substeps 的显示是准确和 user friendly 的".

Problems found:

1. **Completed steps looked identical to future steps** — StepDots rendered
   only the current dot in accent; dot 1 on step 2 was the same gray hairline
   as dot 3, so the indicator showed position but not progress.
2. **The rule-review interstitial repeated a bare "STEP 2 OF 3"** — same
   eyebrow as practice setup, reading as a stuck indicator rather than a
   named sub-step.
3. **`migration.new.tsx` carried a near-duplicate local `OnboardingStepDots`**
   (11px/1.4px tracking vs the canonical text-caption/tracking-eyebrow) —
   a primitive-vocabulary violation waiting to drift.

Changes (all through the ONE shared `features/onboarding/step-dots.tsx`):

- **Three dot states**: completed = accent solid round · current = accent
  ELONGATED pill (w-4) · future = hairline. Progress is now visible, not
  just position.
- **Named steps** via a new optional `label` slot in the eyebrow:
  "STEP 1 OF 3 · WELCOME" → "STEP 2 OF 3 · YOUR PRACTICE" →
  (conditional) "STEP 2 OF 3 · RULES CHECK" → "STEP 3 OF 3 · IMPORT CLIENTS".
  The review keeps step 2 (it happens inside step 2, after firm creation) but
  the label makes the repeat legible instead of silent.
- **Deduped** the migration importer onto the shared component (`className`
  passthrough for its mb-3); local copy deleted. The wizard's own 4-step
  labeled pill Stepper (Upload → Match columns → Check values → Confirm)
  stays as the SUB-progress of step 3 — different visual grammar (numbered
  pills vs dots), and the macro eyebrow naming "IMPORT CLIENTS" ties the two
  levels together.
- Eyebrow tracking moved from arbitrary `tracking-[0.08em]` to the canonical
  `tracking-eyebrow` token.

Verified live through the funnel (steps 1, 2, and the importer's step 3 with
completed dots + sub-stepper). 3 new messages translated in zh-CN (欢迎 /
您的事务所 / 规则核对; "Import clients" already existed).
