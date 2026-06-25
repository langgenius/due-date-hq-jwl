// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { getContentDates } from './src/lib/content-metadata'

const viteConfig = {
  plugins: tailwindcss(),
}

/**
 * Map a sitemap URL to its freshness date for <lastmod>. The default locale (en)
 * is unprefixed; zh-CN pages live under /zh-CN. The last path segment maps to a
 * content slug (see getContentDates); unknown slugs fall back to the site-wide
 * reviewed date, so every URL still carries an honest lastmod.
 * @param {string} url
 * @returns {string}
 */
function lastmodForUrl(url) {
  const path = new URL(url).pathname.replace(/^\/zh-CN/, '').replace(/\/$/, '')
  const slug = path.split('/').findLast(Boolean) ?? 'home'
  return getContentDates(slug).reviewedOn
}

// Marketing static site (duedatehq.com). Per docs/dev-file/12-Marketing-Architecture.md §4.
// - `site` is required by @astrojs/sitemap and for canonical URLs.
// - `trailingSlash: 'never'` + `build.format: 'file'` collapses /zh-CN/ vs /zh-CN duplicates.
// - Tailwind 4 must be wired through `vite.plugins[tailwindcss()]`; the CSS-only
//   `@import 'tailwindcss'` form alone does NOT activate the plugin.
// - Every published route has explicit locale pages. We avoid i18n fallback redirects because
//   they create hidden `/zh-CN/zh-cn/*` routes and collide with localized pricing pages.
// - The `@astrojs/react` integration is intentionally NOT registered. The first
//   landing has zero React islands; registering the integration would cause Astro
//   to emit a ~190 KB orphan React client bundle into `dist/_astro/`. When a real
//   React island is needed later (e.g. interactive LocaleSwitcher), add `react()`
//   back here and ensure §5.1 JS-budget rules apply.
export default defineConfig({
  site: 'https://duedatehq.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    sitemap({
      // Keep historical hidden fallback URLs out if Astro or a future config
      // change reintroduces them (e.g. the i18n /zh-CN/zh-cn duplicate). Any
      // future noindex-only page must be added here too so the sitemap never
      // lists a URL that GSC would flag as "Submitted URL marked noindex".
      filter: (page) => !/\/zh-CN\/zh-cn\/?$/i.test(page),
      // Emit <xhtml:link rel="alternate"> pairs for en <-> zh-CN (mirrors the
      // in-page hreflang). en is the unprefixed default; zh-CN lives under /zh-CN.
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', 'zh-CN': 'zh-CN' },
      },
      serialize(item) {
        item.lastmod = lastmodForUrl(item.url)
        return item
      },
    }),
  ],
  vite: viteConfig,
  i18n: {
    locales: ['en', 'zh-CN'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
})
