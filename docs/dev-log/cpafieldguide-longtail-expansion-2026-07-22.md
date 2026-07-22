# cpafieldguide long-tail expansion + duedatehq cross-link — 2026-07-22

**Ask (Yuqi):** "cpafieldguide 这个网站你可以再往上推一下吗" — push the ranking site further.

**Context:** the 07-16 strategy doc says cpafieldguide's bottleneck is domain authority,
not on-page — the two levers are backlinks and long-tail query surface. Verified first
that the 07-16 build (shared WebSite schema, vs/alt cross-links) IS live on
cpafieldguide.com (local and live JSON-LD on /compare are identical), so the pending
redeploy from that session was done. This session pushes both levers that are pushable
from code.

## 1. Long-tail page expansion (16 new pages, 46 → 62 sitemap URLs)

`deploy/build.mjs` — extended the hoisted cross-link data; everything downstream
(pages, sitemap, llms.txt/llms-full.txt, tool-profile backlinks) regenerates from it.

**VS_PAIRS +10** (all real head-to-head queries, all data already in toolData):
proconnect–proseries, lacerte–proconnect, drake-tax–lacerte, drake-tax–proseries,
ultratax-cs–cch-axcess, atx–drake-tax, taxdome–financial-cents,
karbon–financial-cents, xero–sage, quickbooks-online–sage.

**ALT_SLUGS +6:** lacerte, proseries, ultratax-cs, financial-cents, xero, ignition.

Also bumped `DATE` to 2026-07-22 (dateModified across pages — legitimate, the
cross-link graph on tool profiles changed).

Verified: 16 new HTML files generated, all in sitemap (62 `<url>`), all in llms.txt,
tool profiles auto-link the new vs pages (e.g. tools/proconnect.html →
/proconnect-vs-proseries + /lacerte-vs-proconnect).

## 2. Tier-3 structural backlink (from the 07-16 backlink kit)

The kit's Tier-3 item — an editorially honest duedatehq.com → cpafieldguide.com
link — was never shipped (zero cpafieldguide references existed in apps/).
Added to `WorksWithStackPage.astro` (EN + zh-CN), in the wws-note section next to
"don't see your tool?": one in-context link to /cpa-software-with-open-api with the
affiliation disclosed ("our team also maintains") and the no-pay-to-list line.
Verified live in this session's dev server, both locales, no console errors.

## 3. Deploy hygiene

`deploy/.env.local` exists (holds only a Vercel CLI OIDC token) and the folder is
deployed as raw static files — added `deploy/.vercelignore` with `.env*` so it can
never be uploaded. Checked live: https://cpafieldguide.com/.env.local is 404 (never
leaked).

## Not done here (needs Yuqi)

- **Production deploy** — permission-gated in-session. One command:
  `cd docs/integrations/cpa-tools/deploy && npx vercel --prod` (CLI already logged in
  as wuyuqi827-3645, project already linked).
- After deploy: GSC → request indexing for the new URLs (or just resubmit sitemap.xml).
- Backlink kit Tiers 1–2 (community answers + writer pitches) still need a human —
  paste-ready copy is in `docs/marketing/cpafieldguide-backlink-kit-2026-07-16.md`.
