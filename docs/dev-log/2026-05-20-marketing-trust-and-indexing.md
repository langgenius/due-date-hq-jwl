---
title: 'Marketing trust pages and app indexing boundary'
date: 2026-05-20
area: marketing
---

# Marketing trust pages and app indexing boundary

## Changes

- Added static public trust pages for `/about`, `/security`, `/privacy`, `/terms`, and
  `/status`, with matching `/zh-CN/*` pages.
- Updated marketing nav, footer, and `llms.txt` so Privacy, Terms, Status, Security,
  and About are crawlable public pages instead of mail-only placeholders.
- Added shared content metadata for visible `Last reviewed` dates and state official
  source references.
- Added `dateModified`, `BreadcrumbList`, and guide `TechArticle` structured data while
  keeping JSON-LD aligned with visible page content.
- Added `apps/app/public/robots.txt` and `noindex, nofollow` to the app SPA shell so
  `app.due.langgenius.app` remains outside the marketing SEO surface.
- Added an E2E smoke assertion that the app workspace serves a plain-text robots file.

## Boundary

The marketing site remains the only public SEO/GEO surface. The SaaS app domain is still
for authenticated workspace operations and must not enter the marketing sitemap. Trust
pages are public summaries; formal privacy, legal, and security reviews still happen
through the corresponding contact channels.

## Validation

- `pnpm --filter @duedatehq/marketing check`
- `pnpm --filter @duedatehq/marketing build`
- `pnpm --filter @duedatehq/app build`
- `pnpm --filter @duedatehq/server test -- src/app.test.ts`
- Dist smoke checks for trust page canonical URLs, visible review dates, sitemap
  inclusion, `llms.txt`, app `robots.txt`, and app `noindex`.
