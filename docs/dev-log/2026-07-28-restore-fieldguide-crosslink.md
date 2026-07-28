# marketing: restore lost duedatehq → cpafieldguide Tier-3 cross-link

2026-07-28

## Why

While answering "besides sending the pitches, what else?", live-verified the 07-22 Tier-3
structural backlink (works-with-your-stack → cpafieldguide.com/cpa-software-with-open-api,
per the 07-16 backlink kit) and found it GONE — from source and from prod.

Forensics: shipped in `b4dad21b1` (07-22 morning), then silently dropped the same afternoon
by `b13854045` ("deep audit — seo-content vocabulary"), which rewrote the whole
works-with-stack content object and lost the `fieldGuide*` props + render block. No dev-log
or commit message mentions the removal — collateral damage, not a decision.

## What

Re-added the original 07-22 paragraph verbatim to `WorksWithStackPage.astro`: `fieldGuide*`
props in both locales + the second `<p>` in `.wws-note`, linking
`/cpa-software-with-open-api` with affiliation disclosed ("our team also maintains") and the
no-pay-to-list line.

Verified in this session's own dev server (marketing-4331): EN + zh-CN both render the note
with the correct href and `rel="noopener"`, zero console errors.

## Lesson

Vocabulary/content-object rewrites can silently drop sibling props. When a "deep audit"
commit replaces a whole content object, diff the dropped keys, not just the changed copy.

## Still needs Yuqi

Prod deploy is manual (`pnpm deploy` + wrangler login) — committed ≠ live; verify with
`curl -s https://duedatehq.com/works-with-your-stack | grep cpafieldguide` after deploying.
