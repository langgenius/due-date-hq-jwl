---
title: 'Marketing SEO/GEO production origin'
date: 2026-05-19
area: marketing
---

# Marketing SEO/GEO production origin

The production public site is `https://due.langgenius.app`; the SaaS app is
`https://app.due.langgenius.app`. The marketing build previously emitted canonical,
sitemap, JSON-LD, Open Graph, robots, and `llms.txt` URLs for `https://duedatehq.com`.
That made the live public pages self-identify as duplicates of a different host.

## Changes

- Added a single marketing/app URL source in `apps/marketing/src/lib/site.ts`.
- Updated Astro `site` to `https://due.langgenius.app` so sitemap output uses the
  live production origin.
- Updated `BaseLayout` and JSON-LD helpers so canonical, hreflang, OG, Twitter,
  Organization, WebSite, SoftwareApplication, WebPage, Product, and FAQ URLs all
  use the same production origin.
- Replaced static `public/robots.txt` and `public/llms.txt` with prerendered Astro
  endpoints that reuse the same URL helper.
- Updated deployment and marketing architecture docs with the Google discovery
  chain and the current production domains.

## Google discovery contract

Google should discover the public site through this path:

1. `https://due.langgenius.app/robots.txt` allows Googlebot and points to
   `https://due.langgenius.app/sitemap-index.xml`.
2. `https://due.langgenius.app/sitemap-index.xml` lists only public marketing URLs.
3. Each listed page returns anonymous `200 text/html` with a matching HTTPS canonical.
4. Localized English and Chinese pages declare reciprocal `hreflang` plus `x-default`.
5. `404.html` returns HTTP 404 through Workers Static Assets and carries
   `noindex, nofollow`.

The remaining edge-setting check is HTTP-to-HTTPS canonicalization:
`curl -I http://due.langgenius.app/` should return 301 or 308 to HTTPS. If it returns
200, enable Cloudflare Always Use HTTPS or a Redirect Rule for the zone/route.

## Validation

- `pnpm --filter @duedatehq/marketing check`
- `pnpm --filter @duedatehq/marketing build`
- Dist smoke checks for canonical, hreflang, JSON-LD, sitemap, robots, `llms.txt`,
  404 `noindex`, and absence of `app.due.langgenius.app` from sitemap.
