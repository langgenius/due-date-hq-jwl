# 2026-06-16 Onboarding review list scroll

## What changed

- Kept the onboarding rule-review prompt within the entry-screen viewport by
  making the step-2 prompt fill the remaining height below the step dots.
- Changed the jurisdictions card to a fixed flex column: header and helper
  footer stay visible, while the jurisdiction rows scroll internally.
- Capped the review CTA label after three jurisdictions so it switches to a
  count-based label instead of listing every state code.
- Applied the same cap to the activated-rules intro copy: short review sets
  still name the jurisdiction codes, while longer sets use the jurisdiction
  count so the paragraph does not wrap into a full state-code list.

## Verification

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --dir apps/app test --run src/features/onboarding/rule-review-prompt.test.tsx`
- `pnpm exec vp check apps/app/src/features/onboarding/rule-review-prompt.tsx apps/app/src/features/onboarding/rule-review-prompt.test.tsx apps/app/src/routes/onboarding.tsx docs/dev-log/2026-06-16-onboarding-review-list-scroll.md apps/app/src/i18n/locales/en/messages.po apps/app/src/i18n/locales/en/messages.ts apps/app/src/i18n/locales/zh-CN/messages.po apps/app/src/i18n/locales/zh-CN/messages.ts`
- `pnpm --dir apps/app test --run src/features/onboarding/rule-review-prompt.test.tsx src/features/onboarding/state-rule-activation-selector.test.tsx src/routes/onboarding-firm-flow.test.ts`
