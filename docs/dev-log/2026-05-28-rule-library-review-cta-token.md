# 2026-05-28 · Rule Library review CTA token

Yuqi flagged the floating Rule Library bulk-review CTA: `Review N` was inheriting the
floating-action-bar text color instead of the primary-button white text.

Updated the `BulkReviewBar` CTA in `apps/app/src/routes/rules.library.tsx` to pin normal and
hover text back to `text-components-button-primary-text`, and keep hover background on the
primary-button hover token.

Validation:

- `pnpm exec vp check apps/app/src/routes/rules.library.tsx`
- Playwright computed-style probe against the local Vite app: normal and hover text both resolve
  to `rgb(255, 255, 255)`.

DESIGN.md remains aligned; this uses the existing primary-button token contract.
