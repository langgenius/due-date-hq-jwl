# Marketing — typography token scale + full-site type polish

**Date:** 2026-06-23. `/typeset` across the full marketing site (every page + subpage).
Audit found a decent heading kit but a **system-level** type problem: no tokenised
scale (259 raw px sizes freelancing), **15 distinct sizes with half-pixel steps**
(10.5 / 11.5 / 12.5 / 13.5 / 14.5), 100% px / 0 rem, and a stray `700` weight.

## What changed

- **New rem token ladder** in `marketing.css` `:root` — `--m-text-3xs…xl` (10–18px),
  plus `--m-leading-*` and `--m-tracking-*`. One source of truth; rem so type honours
  the reader's browser font-size.
- **Shared classes refactored onto the tokens** (`.m-eyebrow`, `.m-h2`, `.m-lead`,
  `.m-page-*`, `.m-card__*`) — exact-value substitutions, zero rendered change.
- **Value-preserving tokenisation sweep** across all 25 component/page files: every
  fixed `font-size` now references a `--m-text-*` token. Because each whole-px maps to
  an exact rem token (verified 16px root), the render is identical by construction.
  Result: **0 raw px font-sizes** (excl. fluid `clamp` headings), **0 half-px**.
- **Intentional corrections** (the only non-identity changes):
  - half-px snapped to the nearest step (round-half-up).
  - `9px` mockup micro-chrome → `10px` floor (`--m-text-3xs`).
  - 404 one-off `17px` → `16px` (`--m-text-lg`).
  - Pricing `.pr__price` `700` → `600` — dominance now comes from size (42–52px vs
    18px name) + tracking, not extra weight (one 400/500/600 system).

Fluid `clamp()` heading display type (hero, `.m-h2`, `.m-page-title`, etc.) left as-is
by design — marketing display type wants to scale with the viewport.

## Verified

Worktree build clean (76 pages); `--m-text-*` tokens present in compiled CSS. Live:
tokens resolve exactly (3xs=0.625rem … xl=1.125rem), eyebrow 12px / lead 17px unchanged
(sweep held), `mini__sev` 9→**10px** landed, Pricing price computed **600** at 42px.

Design doc updated: `docs/Design/marketing-design-system.md` §1 (token ladder).
