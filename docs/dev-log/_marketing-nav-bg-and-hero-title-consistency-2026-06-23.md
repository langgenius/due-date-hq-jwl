# Marketing — nav background + hero title consistency

**Date:** 2026-06-23. User flagged three inconsistencies on the live site.

## 1. Nav background differed by page

The home nav was `background: transparent` (no hairline); content pages added
`.nav--page` (solid canvas-92% + blur + hairline). So the bar looked different page
to page ("it was white, why transparent?"). **Fix:** moved the solid treatment to the
**base `.nav`** so every page gets the same subtle solid bar + hairline. `.nav--page`
is now redundant (kept as a hook). The collapse (`.nav--scrolled`) and villain pass
(`.nav--on-dark`) still override it on scroll.

## 2. Hero titles were different sizes

`how-it-works`/`pricing` rendered at a `76px` ceiling, `state-coverage` at `60px`,
rules `58`, state-detail `56`, trust `52`/`66` — so "Coverage" read smaller than its
neighbours. **Fix:** one shared token **`--m-page-title-size: clamp(34px, 4.8vw, 64px)`**
in marketing.css; every subpage hero title (`.m-page-title`, `.how-hero__title`,
`.pr__title`, `.stcov-hero__title`, `.std-hero__title`, `.trustpg__title` +
`--display`) now points at it. A clear tier below the home hero (…76), identical to
each other. Verified: every page = 64px at desktop.

## 3. Nav pill too wide

Trimmed `.nav__link` padding `7px 13px` → `7px 11px`.

Build 76 pages clean. Verified live (clean restart): nav solid+hairline on home and
content; Coverage hero 64px == the others.
