# Login — new plaque lockup (BrandBadge)

**Date:** 2026-06-26

Yuqi supplied a new login lockup: the "DueDateHQ" wordmark in ivory on a solid
brand-navy rounded plaque (no bars mark). Added it as a reusable component and
swapped it onto the /login card.

## Changes

- **`components/primitives/brand-wordmark.tsx`** — new `BrandBadge` export: viewBox
  `0 0 569 123`, a `rx-24` `fill-brand-ink` plaque + the 9 DueDateHQ letterforms in
  `fill-brand-ivory`. Tokenized (brand-ink / brand-ivory) like the other lockups, so
  it's theme-invariant and swappable in one place. Default `h-8`.
- **`routes/login.tsx`** — the header lockup is now `<BrandBadge h-8>` (with a calm
  fade+zoom entrance) instead of `<AuthBrandAnchor>` (the bars lockup). Dropped the
  now-unused `AuthBrandAnchor` import.

## Scope

Login only. The other auth surfaces (splash / 2FA / accept-invite / error) still use
`AuthBrandAnchor` (bars lockup) — left as-is unless we decide to unify.

## Verify

`pnpm check` 0 errors; `build` clean. Live /login: plaque present (viewBox 569×123,
32×148px, `rgb(31,49,92)` navy fill), ivory wordmark, above "Sign in".
