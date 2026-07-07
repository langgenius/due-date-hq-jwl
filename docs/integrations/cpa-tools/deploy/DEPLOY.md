# Deploy CPA Field Guide to Vercel (personal account)

Static single-page site. The `deploy/` folder is the entire site — nothing to build.

Files:
- `index.html` — full standalone document (head + meta/OG/JSON-LD + favicon). This is the built page; edit the Artifact source `../cpa-tools-directory.html` and re-run the build if you change content.
- `robots.txt`, `sitemap.xml` — SEO/crawl.
- `vercel.json` — clean URLs + security headers + HTML revalidation.

## Option A — Vercel CLI (fastest)

```bash
npm i -g vercel          # or use: npx vercel
cd docs/integrations/cpa-tools/deploy
vercel login             # log into YOUR personal account
vercel --prod            # deploys this folder; accept the defaults (no framework, root = .)
```

## Option B — Vercel dashboard

1. vercel.com → **Add New… → Project**.
2. Either drag-drop the `deploy/` folder, or **Import** a Git repo and set **Root Directory** = `docs/integrations/cpa-tools/deploy`.
3. Framework preset: **Other** (static). Build command: none. Output dir: `.`.
4. Deploy.

## Point cpafieldguide.com at it

In the Vercel project → **Settings → Domains → Add** `cpafieldguide.com` (and `www.cpafieldguide.com`). Vercel shows the DNS to set at your registrar:

- **Apex** `cpafieldguide.com` → `A` record → `76.76.21.21`
- **www** `www.cpafieldguide.com` → `CNAME` → `cname.vercel-dns.com`

(Or point the registrar's nameservers to Vercel and let it manage DNS.) HTTPS is issued automatically once DNS verifies. Set a redirect so one is canonical (recommend apex → keep `cpafieldguide.com`, redirect `www` to it — Vercel offers a toggle).

## Search Console & Bing verification

The `<head>` already has commented placeholder tags. Fastest path:

1. **Google Search Console** (search.google.com/search-console) → add property `https://cpafieldguide.com/` → choose **HTML tag** → copy the token.
2. **Bing Webmaster Tools** (bing.com/webmasters) → add site → **Meta tag** → copy the token. (Or just "Import from GSC" once Google is verified.)
3. In `index.html` `<head>`, uncomment and fill:
   ```html
   <meta name="google-site-verification" content="YOUR_GOOGLE_TOKEN">
   <meta name="msvalidate.01" content="YOUR_BING_TOKEN">
   ```
4. Redeploy (`vercel --prod`), click **Verify** in each console.
5. In each console → **Sitemaps** → submit `https://cpafieldguide.com/sitemap.xml`. Then **Request indexing** for the homepage.
   - (Alternative: verify by DNS TXT at your registrar, or by the HTML-file each console gives you — drop that file in `deploy/`.)

## On-page SEO / AEO / GEO — already maxed in this build

Shipped in `index.html`, nothing more to add on-page:

- **Metadata**: keyword-tuned `<title>`, meta description, canonical, `robots`/`googlebot` (index, large image preview, full snippet), `theme-color`, author/publisher, hreflang (`en-us` + `x-default`), inline SVG favicon.
- **Social/AI cards**: Open Graph + Twitter `summary_large_image`, pointing at the generated **`og.png`** (1200×630, already in this folder).
- **Structured data (AEO/GEO)**: one JSON-LD `@graph` with `Organization`, `WebSite`, `WebPage` (with `datePublished`/`dateModified` freshness), `BreadcrumbList`, an `ItemList` of all 26 `SoftwareApplication` entries, and a `FAQPage` (6 Q&As). This is what Google rich results and AI answer engines (ChatGPT, Perplexity, Google AI Overviews) read.
- **On-page content for AEO**: a visible **FAQ** with direct, sourced answers; per-category definitions + inclusion criteria; a transparent no-pay-to-list methodology; clean heading hierarchy (single `<h1>`, category `<h2>`, FAQ `<h3>`); descriptive `alt` text auto-set on every image.
- **Core Web Vitals**: fully self-contained (zero external requests) → fast LCP, no CLS, no render-blocking. Keep it that way — embed any real logos/screenshots as optimized files, not third-party hotlinks.

## Still on you (off-page — page SEO can't do these)

1. **Real assets**: replace brand-color logo tiles with official vendor logos (press/brand kits) and add your own screenshots — see the asset-slot notes in `../cpa-tools-directory.html`. Re-run the build after.
2. **Freshness**: update the page and bump `dateModified` / `sitemap` `lastmod` periodically — AI engines favor recently-updated, sourced pages.
3. **Authority / links**: earn a few inbound links (a mention from a CPA newsletter, a Jason-Staats-style creator, a state society). **Honest reality:** on-page is necessary but not sufficient — head terms are owned by high-authority incumbents and AI Overviews skim ~half the clicks, so ranking #1 takes authority + time, not markup alone.

## Rebuilding index.html after content edits

The deploy `index.html` is generated from the Artifact source by wrapping it in a full `<head>`. If you edit `../cpa-tools-directory.html`, regenerate `index.html` (same head + the updated body) before redeploying.
