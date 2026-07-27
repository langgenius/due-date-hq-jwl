# cpafieldguide: homepage "Popular comparisons" links (crawl-equity for stranded pages)

2026-07-27

## Why

GSC "Why pages aren't indexed" for cpafieldguide.com (27 not indexed) broke down as:

- **22 · Discovered – currently not indexed** — every one `Last crawled: N/A`. Google found the
  URLs (sitemap) but has not spent crawl budget on them. All 22 are the vs/alternatives long-tail
  (`drake-tax-vs-lacerte`, `xero-vs-sage`, `ultratax-cs-alternatives`, …).
- **3 · Alternate page with proper canonical** — benign, correctly consolidated.
- **2 · Page with redirect** — benign; `vercel.json` has `cleanUrls`+`trailingSlash:false` and no
  explicit redirects, so these are just `.html`/trailing-slash variants resolving to the clean URL.
- **0 · Crawled – currently not indexed** — nothing was crawled and rejected as thin.

So: no code bug, no `noindex`/robots/canonical mistake. The blocker is crawl priority (authority).
One in-repo lever: the vs/alternatives pages were linked only from tool profiles and `/compare` —
2+ clicks from home — while the homepage (most-crawled page) linked **zero** comparison pages.

## What

Added a category-balanced **Popular comparisons** block to the homepage, mirroring the existing
`Guides` pill row (`.guides`/`.guidelinks`), linking straight to 11 high-intent pages weighted
toward the stranded set: 8 head-to-heads (tax prep / practice mgmt / bookkeeping) + 3 alternatives.
`POPULAR_COMPARISONS` in `build.mjs`; rendered right after the Guides block.

Only `index.html` regenerated — no `DATE` bump, so the other 68 pages' `lastmod`/`dateModified`
stay honest (they did not change). `vp check` clean.

## Not this

This is a minor boost — it shortens click depth and passes some crawl equity, but crawl priority is
ultimately earned by authority. The real unlock stays off-page: request-indexing the top pages and
earning referring domains (owner actions). Left cpafieldguide otherwise as-is (demoted supporting
site; DueDateHQ is the canonical entity).
