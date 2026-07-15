# Google indexing report follow-up — 2026-07-15

## Context

Search Console validation reports showed three exclusion groups: historical `.html` URLs that
redirect, a referral-query homepage with an appropriate canonical, and seven recently crawled pages
that Google had not yet selected for indexing.

Production checks found the extensionless page examples healthy: they return `200`, remain crawlable,
use self-referencing canonical URLs, publish reciprocal EN / zh-CN hreflang, and appear in the sitemap.
The referral-query homepage also correctly canonicals to the clean homepage, so that exclusion is
intentional. The actionable defects were the temporary `307` status on historical `.html` paths and
publication metadata that predated the June 25 page batches.

## Changes

- Added relative Cloudflare Static Assets redirect rules so historical root, nested, and localized
  `.html` URLs permanently redirect with `301` to the extensionless canonical path.
- Corrected June 25 publication/review dates for the two state-page batches and the first high-intent
  federal-rule batch. This aligns visible review dates, JSON-LD, and sitemap `lastmod` with Git history.
- Added focused tests for the Search Console example slugs and for the redirect contract.
- Clarified the current architecture boundary: repository `_redirects` handles path normalization;
  host-level redirects remain Cloudflare zone configuration.

## Expected Search Console behavior

- Historical `.html` URLs remain excluded because they redirect, but Google now receives a permanent
  move signal and should consolidate them into the extensionless canonical URLs.
- Referral-query URLs remain intentionally excluded as alternate URLs with the clean homepage canonical.
- The healthy `200` pages can be submitted for revalidation after deployment; indexing remains a Google
  selection decision rather than an application availability guarantee.
