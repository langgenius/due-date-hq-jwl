# marketing: Product Hunt badge restored (owner instruction)

2026-07-28

## What

Footer PH "featured" badge restored verbatim from git history (removed in 866ed5060, 07-22,
as part of the site audit on the grounds the launch was withdrawn 07-06). Yuqi checked
producthunt.com/products/duedatehq in a browser today, confirmed the product page is live
("在的"), and instructed the restore — the anchor, official embed image, and .footer\_\_ph
styles are back exactly as they were, EN+zh alt text included.

Verified: build OK, badge renders on EN + zh home, 24/24 tests.

## Note

PH blocks server-side fetches (403), so the page state was owner-verified, not curl-verified.
If the PH listing ever comes down, remove the badge again — same only-show-shipped rule.
