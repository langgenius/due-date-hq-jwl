// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

const viteConfig = {
  plugins: tailwindcss(),
}

// Marketing static site (due.langgenius.app). Per docs/dev-file/12-Marketing-Architecture.md §4.
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
  site: 'https://due.langgenius.app',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    sitemap({
      // Keep historical hidden fallback URLs out if Astro or a future config
      // change reintroduces them.
      filter: (page) => !/\/zh-CN\/zh-cn\/?$/i.test(page),
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
