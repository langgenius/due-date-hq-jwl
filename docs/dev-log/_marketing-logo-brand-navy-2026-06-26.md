# Marketing logo → brand navy (color unification with the app)

**Date:** 2026-06-26

The marketing logo (nav + footer mark + wordmark) was rendering at `--m-ink`
(`--text-primary` ≈ `#101828`, near-black) — off-brand. The canonical brand logo
(`brand-mark.svg` / `brand-wordmark.svg`) and the app both use brand-ink **`#1F315C`**.
So the _same logo_ looked near-black on the marketing site but deep navy in the product.

(Caught while previewing: the marketing dev server on :4321 was serving a stale
**worktree** — an older brand iteration — so the first color reading was wrong. Re-measured
against main on a fresh :4322 preview.)

## The two-navy system (now explicit)

- **`--m-brand` = `--color-brand-ink` = `#1F315C`** → logo mark + wordmark **only** (identity).
- **`--m-accent` = `#22488C`** → CTAs, links, active states (action). _(Was mislabeled
  `/_ #2e368c _/` in a stale comment; the value was already the new navy.)_

This mirrors the app: the framed logo tile is `#1F315C`; buttons are `#22488C`. Identity
color and action color are deliberately different.

## Changes (CSS values only)

- `apps/marketing/src/styles/marketing.css` — added `--m-brand: var(--color-brand-ink)`;
  corrected the stale `--m-accent` comment.
- `TopNav.astro` — nav mark `fill` and `.brand` color `--m-ink` → `--m-brand`.
- `Footer.astro` — `.footer__name` color `--m-ink` → `--m-brand`.

Dark-band (scrolled) state is untouched — `.nav--on-dark` still forces the mark + wordmark
to `#fff` (more specific selectors win over the resting color).

## Verify

`vp run @duedatehq/marketing#build` clean (191 pages); `vp fmt --check` clean. Live :4322:
nav mark / nav wordmark / footer wordmark all `rgb(31,49,92)` = `#1F315C`; CTA still
`rgb(34,72,140)` = `#22488C`. Matches the app login lockup.
