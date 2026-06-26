# Login polish — wordmark2 lockup, left-align, "Sign in", firm-hint tooltip

**Date:** 2026-06-26

Per Yuqi's review of the live login:

- **New lockup (`wordmark2`).** `BrandWordmark` is now the supplied framed lockup — navy
  app-icon tile (ivory bars) + "DueDateHQ" — as one svg (viewBox `1165×154`), two-tone via
  brand-ink/brand-ivory tokens. `AuthBrandAnchor` renders it (login/splash/2FA/invite/error).
  `BrandLogotype` (letters-only) kept for the entry-shell header.
- **Left-aligned** the login card head — lockup, title, subhead now `items-start text-left`
  (were centered).
- **Title → "Sign in"** (was "Sign in to DueDateHQ" — the wordmark already says the name).
- **Firm hint → (i) tooltip.** "we look up your firm automatically" moved off the field label
  into an `InfoIcon` + `Tooltip` next to "Work email" (hover reveals "We look up your firm
  automatically.").
- Updated standalone `brand-wordmark.svg` → wordmark2.

## Process note (why the last two deploys didn't ship)

The prior brand commits red-CI'd: first on markdown `vp fmt`, then on eslint
`no-unused-vars` (a leftover `markClassName` param). Both skipped `deploy-staging` (it
`needs: ci`). Fixed the unused param; this time ran the **full** gate before pushing —
`pnpm check` (eslint + types) **0 errors**, `build` clean, `vp fmt --check` clean — so CI
passes and the deploy fires.

## Verify

Live `/login` confirmed: lockup viewBox `0 0 1165 154`, h1 "Sign in", inline firm-hint gone,
(i) tooltip present, all left-aligned.
