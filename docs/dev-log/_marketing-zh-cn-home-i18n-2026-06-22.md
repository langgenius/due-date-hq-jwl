# Marketing — zh-CN home on the new design (i18n + Chinese draft)

**Date:** 2026-06-22 · all `apps/marketing/src/components/home/*` + `src/pages/zh-CN/index.astro`. The new homepage now exists in Simplified Chinese; `/zh-CN` was migrated off the old design.

## What

- **Every home component is now locale-aware** (`locale?: 'en' | 'zh-CN'`). Each holds its own bilingual `t` object: EN is byte-identical to before (default `locale="en"`), zh-CN is a first-draft translation. 13 components: Hero, Villain, HowItWorks, Notice, Sources, Compare, SeeItWork, Surfaces, Trust, Security, Faq, Close, ScrollRail. (TopNav/Footer were already locale-aware.)
- **`/zh-CN/index.astro` rebuilt on the new design** — mirrors `index.astro`, passes `locale="zh-CN"` to each component + the locale-aware `getCtaHref('zh-CN')`. The old zh-CN home (old components) is replaced; the old EN home is still archived at `/legacy`.
- The bulk translation+refactor was fanned out across four sub-agents (3 components each) under a shared pattern + glossary for consistent terminology, then integrated here.

## Verification

`pnpm --dir apps/marketing build` → 74 pages, 0 errors. Live: `/` still fully English (no zh leak); `/zh-CN` renders the whole new design in natural Chinese (nav 工作原理/覆盖范围/定价/安全, hero + alerts panel 提醒·本周/紧急/信息/影响 N 个客户, villain/how/notice/sources/etc.).

## Known limitations (for the refine pass)

- **Hero headline font.** The hero uses Instrument Serif (`--m-font-display`), which has no CJK glyphs — the Chinese headline falls back to a system CJK face. Looks clean but isn't the editorial serif; pick a Chinese display face if we want parity.
- Chinese is a **first draft** (owner to refine). It lives inline per component (in each `t` object's `zh` branch) — refine there, or we later centralize into one copy module.
- `/zh-CN` (no trailing slash) is the route; `/zh-CN/` 404s (Astro trailingSlash).
