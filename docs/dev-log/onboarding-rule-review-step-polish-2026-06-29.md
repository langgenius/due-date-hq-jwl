# Onboarding rule-review step — funnel consistency + remove false affordance

**Date:** 2026-06-29
**Files:**

- `apps/app/src/features/onboarding/rule-review-prompt.tsx`
- `apps/app/src/routes/onboarding.tsx`

## Why

Polishing the rule-review step (onboarding step 2 → review) to match the rest of
the funnel. It was the alignment/scale outlier and carried a misleading
affordance.

## What this step is (for the record)

The rule-review fires after practice setup when a **fresh firm is created** and
the selected jurisdictions include source-defined-calendar rules — which is
**most** of them (FED + nearly all states), so it's a common first-run screen,
not a rare one. It is skipped entirely when an **existing firm is reused**
(`activateOrCreateOnboardingFirm` → `kind: 'reused'` → straight to the
post-onboarding target), which is why it never appears when re-testing on a
demo account that already has a firm.

## What changed

- **Left-aligned** the step (heading container + the onboarding wrapper's
  `items-center` dropped) to match the welcome / practice steps — it was the
  funnel's only centered screen.
- **Heading** `text-[28px]` / `tracking-[-0.5px]` → `text-2xl` +
  `leading-tight tracking-[-0.02em]` (the funnel's hero scale; no arbitrary px).
- **Magic numbers** normalized: `px-[22px]` → `px-5`, `size-[42px]` → `size-10`.
- **Subtitle** dropped `font-medium` to match the other steps' non-bold hero copy.
- **Removed the per-row "Review →" box** — it looked like a button but had no
  click handler (the only review action is the footer button). A false
  affordance, against the codebase's real-affordances rule. Rows are now
  badge + jurisdiction + reason.

## Notes

`tsgo --noEmit` clean. The `rule-review-prompt.test.tsx` assertions read only
`<button>` text (the removed element was a `<span>`), so they're unaffected.
