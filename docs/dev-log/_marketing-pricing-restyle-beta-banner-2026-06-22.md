# Marketing — Pricing template restyle + beta banner (EN visual unification complete)

**Date:** 2026-06-22 · `apps/marketing/src/components/Pricing.astro`. The 5th and last long-tail template. With it, the entire EN marketing site (home + chrome + all long-tail templates) is on the `--m-*` design.

## Decision context

Owner: pricing is **real but free during beta**. The team had just pushed "align pricing plans with latest in-app billing" — the live tiers are now **Free $0 · Solo $39 · Pro $79 (Recommended) · Team $149** (Enterprise removed, a Free tier added), monthly/yearly toggle wired to in-app checkout. So this is a **restyle + reframe**, not a strip: keep every tier, toggle, checkout href, and `data-*` hook; add a beta banner that reconciles "free now" with "here are the launch plans."

## What changed

- **Beta banner** at the top: an accent-tinted note — "Every plan is **free while we're in beta** — nothing to pay today. Here's how pricing will work once we launch." Worded to fit the new Free tier (doesn't imply every plan costs money).
- **Restyled to the shared kit + `--m-*`:** hero uses `.m-page-hero/.m-eyebrow/.m-page-title/.m-page-lead`; faq uses `.m-page-grid-3 + .m-card`. Plan cards, billing toggle, and price block are scoped `.pr__*` on `--m-*` tokens (white cards, hairline borders, mono prices, accent recommended card).
- **Billing toggle script preserved, restyled:** the script set both `aria-pressed` *and* toggled Tailwind utility classes. Moved the active styling to `[aria-pressed="true"]` CSS and removed the class-toggling, keeping the price/cadence/savings/cta data-driven updates. All `data-pricing-*` hooks and checkout hrefs are untouched.

## Verification

`pnpm --dir apps/marketing build` → 74 pages, 0 errors. Live `/pricing`: beta banner renders, "Pricing" active in nav, 4 cards (Free/Solo/Pro/Team), Pro shows the recommended accent border. Toggle test: Monthly→Yearly flips prices ($39→$31, $79→$63, $149→$119), `aria-pressed` updates, savings line appears, then resets — billing logic intact.

## EN visual unification: complete

Home, chrome (nav/footer), and all 5 long-tail templates (Geo, StateCoverage, StateDetail, Trust, Pricing) now share the `--m-*` language. Remaining: zh-CN repoint + i18n of the new surface; home interactions (nav-on-dark, hero filter/apply, map jump); utility pages (404).
