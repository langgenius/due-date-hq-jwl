# 2026-06-03 · Rule Library evidence placement

Yuqi flagged the pending-rule detail dialog on
`/rules/library?rule=ak.business_income_return.candidate.2026`:

- Evidence was below due-date and extension copy, making the official source feel like a later
  appendix.
- The sticky Practice review footer showed `Coverage manual`, which repeated an internal draft
  status that is not useful in the final accept surface.

Changes:

- Moved the full Rule Detail evidence section directly under Applicability, before due-date and
  extension sections.
- Removed the AI concrete draft `Coverage` row from the Practice review footer. The footer still
  shows Confidence because it is the user-facing AI quality signal.
- Updated the Rules Console product-design Rule Detail outline so docs match the new section order.

Validation:

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/app build`
- Browser DOM check at `/rules/library?rule=ak.business_income_return.candidate.2026`: headings
  render as `Applicability → Evidence → When it's due → Extension → Version history → Practice
review`; dialog text no longer contains `Coverage`.
- `pnpm check` still fails on pre-existing formatting issues in:
  `apps/server/src/procedures/obligations/index.ts`,
  `packages/core/src/federal-holidays/index.ts`, and `packages/db/src/repo/obligations.ts`.
