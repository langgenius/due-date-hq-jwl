# Marketing site — IA audit + Phase B chrome unification

**Date:** 2026-06-22 · `docs/marketing/site-information-architecture.md` (audit), `apps/marketing/src/components/home/{TopNav,Footer}.astro` + 8 EN routes (Phase B).

## The audit (full doc: `site-information-architecture.md`)

Mapped the whole `apps/marketing` site, not just the home. It's already a mature programmatic-SEO + GEO site (state / rule / comparison / guide pages, `llms.txt` + `llms-full.txt` AI-answer-engine feed, full `zh-CN/` mirror). The problem is **cohesion, not missing pages**. Framed it as a **two-tier model**: a small high-craft **core spine** (Home · Pricing · Security · About) + a broad **long-tail** for SEO/AEO/GEO, bound together by one shared nav/footer, one design language, one positioning sentence.

Ranked findings: (P0) **pricing contradiction** — home says "free during beta" but `/pricing` + `llms.txt` sell four tiers to humans _and_ answer engines; (P0) **two design systems** — `/` was the only route on the new `--m-*` design, the other 9 templates still old; (P1) **dead long-tail on-ramp** — new home footer links were all `href="#"`; (P1) **positioning drift** across home / `llms.txt` / meta. Owner decided pricing = **free during beta, coming soon** (tiers come out).

## Phase B — unify the chrome (this commit)

The long-tail is template-driven (5 renderers cover everything below the core), and old + new chrome share the same `t.nav`/`t.footer`, and the `zh-CN/` home isn't migrated — so the clean cut is **EN this pass**: keep the new chrome self-contained English (like the home already is), repoint EN routes, leave zh-CN + `/legacy` on the old chrome (each locale stays internally consistent). Full i18n of the new surface lands together in a later pass.

- **`home/TopNav`** gained `pageMode` (solid bg + hairline for content pages, vs transparent over the hero) and a `current` active-link prop; `ctaHref`/`signInHref` now default internally (`getCtaHref`/`getAppHref`) so routes pass almost nothing. On content pages the "How it works" anchor becomes `/#how` (returns to home).
- **`home/Footer`** wired its real hrefs — the **Resources column is the SEO on-ramp** (Rule library, State coverage, Compare: File In Time, Weekly triage guide); Product + Company columns point at the trust pages. (Was all `href="#"`.)
- **Repointed 8 EN routes** (`pricing`, `state-coverage`, `rules`, `states/[state]`, `rules/[rule]`, `compare/[comparison]`, `guides/[guide]`, `[trustPage]`) to the new chrome. Active map: `pricing`→Pricing, `state-coverage` + `states/*`→Coverage, `security` trust page→Security, the rest→none.

## Verification

`pnpm --dir apps/marketing build` → **74 pages, 0 errors** (EN new chrome + zh-CN old chrome both compile). Dev server: every EN template type 200, new nav + new footer present, no error overlay. Screenshotted `/rules`: solid pageMode nav, "Coverage" inactive (correctly — rules isn't Coverage), footer links resolve. The old page bodies still render their old style underneath — harmonizing those is **Phase C** (restyle the 5 templates to `--m-*`).

## Next

Task 2: pricing → beta-free coming-soon on `/pricing` + strip tiers from `llms.txt`/`llms-full`/meta. Task 3 (Phase C): restyle `GeoResourcePage`, `StateCoveragePage`, `StateDetailPage`, `TrustPage`, `Pricing`. Then zh-CN + i18n of the new surface; then home interactions.
