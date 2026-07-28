# duedatehq: kill the 9 GSC 404s — EN-only sections no longer emit zh links

2026-07-28

## Why

GSC Coverage export (07-28) showed 9 hard 404s + bad hreflang: every EN-only page
(`/irs-disaster-relief/*`, `/widget`) emitted a `hreflang="zh-CN"` head link and a footer
language-switcher link to its nonexistent `/zh-CN/...` twin, and the two zh category pillars
linked `/zh-CN/irs-disaster-relief` (blind `${base}` prefixing). Dist scan found 16 broken
targets sitewide.

## What

- `lib/locale-paths.ts`: `EN_ONLY_PREFIXES` (`/irs-disaster-relief`, `/widget`) +
  `hasZhMirror()`; `buildLocaleHrefPair` now sends the switcher to `/zh-CN` (home) for
  EN-only pages instead of a 404.
- `BaseLayout.astro`: skips the zh hreflang link when the page has no zh mirror.
- `CategoryExplainer.astro`: `loc()` helper — only prefixes `${base}` when the target has a
  zh twin.

Verified: dist rescan (script bodies excluded) = **0 broken internal links** (was 16 targets);
24/24 marketing tests; EN disaster/widget pages emit no zh head-hreflang.

## Ship

Needs a marketing prod deploy; after deploy, GSC "Page with redirect / 404" rows should drain
on next crawl.
