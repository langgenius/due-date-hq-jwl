# 2026-05-29 · Rule Evidence Hide Source Timestamps

## Summary

Removed source retrieval/update timestamp metadata from Rule Library evidence cards.

## Shipped

- Kept evidence title, authority role, locator, excerpt, and official-source link visible.
- Removed the CPA-facing `retrieved ...` and `updated ...` footer from rule detail evidence cards.
- Added a route-level regression test for selected rule details with both timestamp fields present.

## Validation

- `pnpm --filter @duedatehq/app test -- src/routes/rules.library.test.tsx`
- `pnpm --filter @duedatehq/app build`
- Browser smoke on
  `/rules/library?rule=al.individual_income_return.candidate.2026`: opened the Alabama rule detail,
  confirmed the official source title still renders, and confirmed `retrieved` / `updated 2026-04-27`
  are absent from the page text.
