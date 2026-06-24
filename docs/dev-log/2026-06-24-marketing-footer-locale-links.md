# Marketing footer locale links

Fixed the marketing footer language switcher so static build pathnames do not leak into public
locale links. Astro's `build.format: 'file'` can expose page pathnames such as `/index.html`,
`/zh-CN.html`, and `/zh-CN/get-started.html` while rendering; the old footer logic used that
pathname directly, so the zh-CN homepage rendered an English link to `/zh-CN.html` instead of `/`.

Added `apps/marketing/src/lib/locale-paths.ts` to normalize `.html` and `index.html` pathnames
before generating en <-> zh-CN hrefs, and covered the homepage, localized homepage, regular pages,
and state detail pages with Vitest.
