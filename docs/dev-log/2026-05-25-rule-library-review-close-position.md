# 2026-05-25 — Rule Library review close button position

## Change

Yuqi flagged the Rule Library review modal header: the default absolute
top-right close button overlapped the progress count (`1 / N`) in the compact
header.

Updated `BatchReviewModal` so it disables the default `DialogContent` close
button and renders an inline header action cluster instead: progress count
first, close icon second. This keeps the close affordance in the header while
reserving layout space for the count.

## Design alignment

No `DESIGN.md` change is needed. This is modal chrome positioning only and
does not change the Rule Library review flow, accept/skip semantics, tokens, or
component contracts.

## Verification

- `pnpm --filter @duedatehq/app test -- rules.library`
- `pnpm --filter @duedatehq/app exec tsc --noEmit`
- `pnpm exec vp check apps/app/src/routes/rules.library.tsx docs/dev-log/2026-05-25-rule-library-review-close-position.md`
- `git diff --check -- apps/app/src/routes/rules.library.tsx docs/dev-log/2026-05-25-rule-library-review-close-position.md`
