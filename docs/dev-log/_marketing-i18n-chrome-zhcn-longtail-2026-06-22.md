# Marketing — i18n the new chrome + repoint zh-CN long-tail

**Date:** 2026-06-22 · `apps/marketing/src/components/home/{TopNav,Footer}.astro` + 8 zh-CN routes. Brings the entire **zh-CN long-tail** onto the new design — those pages already had Chinese content (the templates are i18n-driven); they were just stuck on the old chrome.

## Approach: locale prop, not i18n type surgery

The existing `nav`/`footer` i18n keys are the old IA (still used by `/legacy`). Rather than repurpose them (which would break legacy) or add a parallel i18n structure for ~6 chrome labels, the new chrome takes a `locale` prop with an **inline EN/zh label map** + locale-prefixed hrefs. Chrome copy ≠ page content, so this is a pragmatic, self-contained choice; page content stays fully i18n-driven as before.

- **`home/TopNav`** — `locale` prop; labels 工作原理/覆盖范围/定价/安全 + 登录/免费开始; hrefs `/zh-CN/…`-prefixed; `ctaHref`/`signInHref` default to the locale-aware app URL (`getCtaHref('zh-CN')`).
- **`home/Footer`** — `locale` prop; localized columns (产品/资源/公司) + tagline/audience/legal/note; hrefs prefixed. Restored the **language switcher** (English · 中文) the old footer had — cross-locale href computed from `Astro.url.pathname`. (SEO hreflang alternates were already independent, in BaseLayout.)
- **Repointed 8 zh-CN routes** (pricing, state-coverage, rules, states/[state], rules/[rule], compare/[comparison], guides/[guide], [trustPage]) to the new chrome with `locale="zh-CN"`. `/legacy` stays on the old chrome.

## Verification

`pnpm --dir apps/marketing build` → 74 pages, 0 errors. `/zh-CN/state-coverage`: new chrome fully Chinese (nav 工作原理/覆盖范围 active/定价/安全, 登录/免费开始, footer 产品/资源/公司, 中文 active in switcher), hrefs all `/zh-CN/`-prefixed, page content Chinese (州覆盖 hero, 监控中 state cards). `/rules` (EN): still English nav/footer + `/state-coverage` hrefs. Shared component, both locales correct.

## Remaining for full i18n

The zh-CN **home** (`/zh-CN/index.astro`) is still the old design — the new home copy is brand-new English with no Chinese yet. That's the next task (draft Chinese for the whole new home + build zh-CN home on the new design).
