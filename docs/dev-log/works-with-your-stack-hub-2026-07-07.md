# "Works with your stack" — complement-not-replace hub

**Date:** 2026-07-07 · marketing SEO/GEO + sales

New page at `/works-with-your-stack` (+ `/zh-CN/works-with-your-stack`): a
"reverse directory" that lists the tools a US CPA practice already runs — grouped
by job — and the single layer DueDateHQ adds on top of each: source-backed
monitoring of IRS/state deadline & rule changes, routed to the clients it
affects. Doubles as long-tail content and a sales page, and it reads honestly
because the whole framing is complement, not replacement.

## What shipped

- `lib/stack-tools.ts` — bilingual data: 4 groups, 15 tools (practice-management
  suites, tax-prep software, bookkeeping/GL, narrow deadline trackers). 10 of 15
  cards deep-link to existing `/compare/*` or `/guides/*` pages; the rest are
  plain cards (no fabricated destinations).
- `components/WorksWithStackPage.astro` — shared EN/zh render (hero → one-line
  promise → per-group cards with an accent-tint "How it layers on" panel → FAQ →
  CTA). Uses `--m-*` tokens only.
- `pages/works-with-your-stack.astro` + `pages/zh-CN/works-with-your-stack.astro`
  — thin BaseLayout wrappers.
- `lib/stack-structured-data.ts` — self-contained JSON-LD (CollectionPage +
  BreadcrumbList + FAQPage). Deliberately NOT added to `lib/structured-data.ts`,
  which is co-edited by other in-flight marketing work — this page owns its own
  small graph so the commit touches no shared, entangled file.
- OG: new `stack` category in `scripts/generate-og.mjs` → `public/og/stack.en.png`
  - `stack.zh-CN.png`, wired via each page's `ogImage`.
- `lib/seo-content.ts` — new "Works with your stack" section in
  `getResourceIndex()` so the hub is reachable from `/resources`.
- `components/home/Footer.astro` — Resources-column link (EN + zh).

## Integrity guardrails (only-show-shipped + compare-page policy)

- Each tool's description states its PUBLIC positioning only — never a claim
  about a competitor's private capability.
- The per-group "gap" uses the site's hedged phrasing ("…is not their focus") —
  a category statement, not "tool X can't do this."
- The DueDateHQ side ("How it layers on") states SHIPPED capability only: watch
  official IRS/state sources → route each change to affected clients, source
  attached. No fiction.

## Verified live (dev server)

Both locales 200; 15 tool cards each; 4 FAQ items; JSON-LD parses to
[CollectionPage, BreadcrumbList, FAQPage]; OG meta points at `/og/stack.*.png`;
all 10 linked compare/guide pages resolve 200; `/resources` shows the new
section; zero console errors; `astro check` clean (0 errors).

## Follow-up

Freshness date: intentionally did NOT add a `works-with-your-stack` entry to
`lib/content-metadata.ts` (that file currently carries another track's
uncommitted IRS-disaster-relief + cpa-response-playbook lines). The page's
JSON-LD `dateModified` is set correctly (2026-07-07) inside
`lib/stack-structured-data.ts`; only the sitemap `lastmod` falls back to the
site-wide review date until a `content-metadata.ts` entry is added later.
