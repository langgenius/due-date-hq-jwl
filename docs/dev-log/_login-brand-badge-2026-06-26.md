# Login — new plaque lockup (BrandBadge)

**Date:** 2026-06-26

Yuqi supplied a new login lockup: the "DueDateHQ" wordmark in ivory on a solid
brand-navy rounded plaque (no bars mark). Added it as a reusable component.

**Update (same day):** trialed it on /login, then Yuqi asked to revert the page but
**keep the badge**. So login is back on the bars `AuthBrandAnchor`; `BrandBadge`
stays in the library, ready for use.

## Changes

- **`components/primitives/brand-wordmark.tsx`** — new `BrandBadge` export: viewBox
  `0 0 569 123`, a `rx-24` `fill-brand-ink` plaque + the 9 DueDateHQ letterforms in
  `fill-brand-ivory`. Tokenized (brand-ink / brand-ivory) like the other lockups, so
  it's theme-invariant and swappable in one place. Default `h-8`. **Kept** (exported,
  currently unused — available for any future lockup need).
- **`routes/login.tsx`** — lockup reverted to `<AuthBrandAnchor markClassName="h-3.5">`
  (bars lockup). The brief `BrandBadge` swap is undone.

## Verify

`pnpm check` 0 errors; `build` clean. Live /login: bars lockup restored above "Sign in".
