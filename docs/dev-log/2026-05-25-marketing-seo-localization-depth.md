---
title: 'Marketing SEO localization and content depth'
date: 2026-05-25
area: marketing
---

# Marketing SEO localization and content depth

## Context

The SEO audit found that the public marketing surface was technically sound, but the Chinese content
still had three release-blocking quality gaps:

- Several zh-CN meta descriptions were too short for a useful search snippet.
- Generated zh-CN rule, state, guide, and comparison pages reused English title templates, which
  created duplicate-title pairs with the English pages.
- Some zh-CN page copy exposed English implementation labels instead of user-facing Chinese
  product language.

This pass also rechecked current product docs and app surfaces before adding depth. The marketing
content should explain DueDateHQ as a CPA deadline operations workbench, not tax advice, filing
software, a live sync engine, or a generic practice-management replacement.

## Changes

- Added localized Chinese fields for generated state, rule, and comparison specs so zh-CN pages no
  longer inherit English SEO templates.
- Deepened the existing public guide pages around current product surfaces:
  - weekly triage maps to Today/Dashboard, Deadlines, Audit, and Evidence;
  - Excel migration maps to Migration Copilot's Intake, Mapping, Normalize, and Preview & apply
    flow;
  - extension vs payment maps to Readiness, Extension, Risk, Evidence, and Audit in deadline detail.
- Added product-surface sections to generated rule and comparison pages so public SEO content points
  back to real app capabilities instead of generic keyword copy.
- Expanded zh-CN meta descriptions across home, pricing/rules/state coverage, trust pages, guides,
  states, rules, and comparisons.
- Localized visible zh-CN section labels on generated state detail and trust pages.

## Method

- Start from product facts in `README.md`, `docs/project-modules/01-app-spa.md`, and the current app
  routes before writing public SEO copy.
- Treat every SEO page as a product-boundary page: say what DueDateHQ does not do before implying
  fit.
- Keep generated content data structured enough that English and Chinese pages can diverge where
  language needs diverge, without creating route or component forks.
- Validate built HTML, not only source text: title uniqueness, description length, canonical,
  hreflang, JSON-LD, sitemap URLs, robots, app noindex, and internal links.

## Boundary

The content does not claim automatic tax judgment, e-file transmission, OAuth/webhook live sync,
automatic state-deadline changes, or replacement of all practice-management software. AI is framed
as mapping, summary, and review assistance; official sources and human review remain the control
points.

## Validation

- `pnpm format -- apps/marketing/src/lib/seo-content.ts apps/marketing/src/i18n/zh-CN.ts apps/marketing/src/lib/trust-pages.ts apps/marketing/src/components/StateDetailPage.astro`
- `pnpm --filter @duedatehq/marketing check`
- `pnpm --filter @duedatehq/marketing build`
- Static SEO smoke: 71 HTML files, 70 sitemap URLs, no duplicate titles, no short descriptions,
  expected canonical/hreflang/JSON-LD, no broken internal links, marketing sitemap excludes app
  domain, and app dist remains `noindex,nofollow`.
