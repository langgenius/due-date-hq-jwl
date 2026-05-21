---
title: 'Marketing SEO content completion'
date: 2026-05-21
area: marketing
---

# Marketing SEO content completion

## Context

The marketing site already had production-origin canonical, sitemap, robots, `llms.txt`,
trust pages, pricing `Product` structured data, and initial guide/state pages. The next SEO/GEO
step was to make the public site explain the product category itself: CPA deadline risk operations,
not a generic reminder app or broad practice management suite.

## Changes

- Added a supplemental SEO content catalog for product-aligned public resources:
  weekly CPA deadline triage, Excel deadline migration, extension vs payment deadline review,
  Form 7004 extension deadline, S-Corp deadline operations, Partnership Form 1065 deadline,
  File In Time alternative, TaxDome deadline operations comparison, and Karbon deadline operations
  comparison.
- Expanded public state coverage with Illinois, New Jersey, Pennsylvania, Georgia, Massachusetts,
  North Carolina, Arizona, Colorado, Ohio, and Michigan, each with official-source references and
  source-backed review copy.
- Updated guide structured data from `TechArticle` to Google-supported `Article`, with
  `author`, `publisher`, `datePublished`, `dateModified`, and `image`.
- Kept pricing `Product` structured data representative of visible pricing: numeric plans emit
  `Offer.price`, while custom/from-price Enterprise copy is not emitted as an exact price.
- Updated `llms.txt` and footer links so guide, comparison, and expanded state coverage pages are
  discoverable from the public content map and internal navigation.
- Updated the marketing architecture doc so future content work follows the same boundaries:
  source-backed resource pages over generic blog output, no fake reviews, no thin state pages.

## Boundary

The new pages are public marketing resources. They describe software workflow and product fit; they
do not provide tax advice, determine state applicability for a client, or claim competitor private
capabilities.

## Validation

- `pnpm --filter @duedatehq/marketing check`
- `pnpm --filter @duedatehq/marketing build`
- Sitemap and JSON-LD smoke checks after build.
