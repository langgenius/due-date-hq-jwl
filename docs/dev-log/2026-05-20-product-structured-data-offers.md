---
title: 'Product structured data offer fields'
date: 2026-05-20
area: marketing
---

# Product structured data offer fields

## Context

Google Search Console reported Product and merchant listing issues for the pricing page:
missing `image`, missing `availability`, missing `aggregateRating`, missing `review`, and
incomplete price / currency data inside `offers`.

## Decision

- Keep Product structured data on the pricing page because the page visibly presents paid SaaS
  plans.
- Emit complete `Offer` entries for visible plan prices: `price`, `priceCurrency: USD`, and
  `availability: https://schema.org/OnlineOnly`.
- Emit a crawlable Product `image` using the public pricing page OG image.
- Do not emit `aggregateRating` or `review` until the page displays real ratings or reviews.
  Google allows Search Console to flag these as non-critical improvements, but structured data
  must remain representative of visible page content.

## Validation

- `pnpm --filter @duedatehq/marketing check`
- `pnpm --filter @duedatehq/marketing build`
- Dist smoke check that `/pricing/index.html` Product includes `image`, Product offers include
  price, price currency, and availability, and structured data does not include fake ratings or
  reviews.
