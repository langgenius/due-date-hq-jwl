# Marketing — strict subpage hero alignment (background + top padding + eyebrow)

**Date:** 2026-06-23. Harsh alignment pass after the serif unification: the heroes
shared a title face but still drifted on background, top padding, and eyebrow.

## Defects found

1. **Background split** — only `/` and `/how-it-works` set `--m-canvas` (cold gray);
   pricing, security, state-coverage, 404, and every leaf set nothing → inherited the
   BaseLayout `bg-bg-canvas` (warmer). Warm/cool patchwork.
2. **Top padding** — four different values: Pricing **double-padded** (`m-section`
   wrapper + `m-page-hero` inner div stacked → eyebrow ~96–176px down); trust 56, how
   52, geo/statecov 48.
3. **Eyebrow** — /security carried a lone accent dot + a 22px gap; the rest used plain
   `.m-eyebrow` (16px).

## Fixes

- **One global canvas**: `body { background: var(--m-canvas) }` in marketing.css
  (unlayered, so it beats Tailwind's layered `bg-bg-canvas` on the `<body>`). Removed
  the now-redundant per-page overrides on index, how-it-works, 404, and the zh mirrors.
  Pages must not re-declare their body background.
- **One hero top padding**: every subpage hero now takes `.m-page-hero` (48→84) on the
  SECTION, with no per-page override:
  - Pricing: moved `m-page-hero` to the wrapping section, de-padded the inner
    `.pr__hero` (kept a small `margin-bottom` for the hero→plans gap).
  - how-it-works (EN+zh) + TrustPage: added `m-page-hero` to the hero section, deleted
    their `.how-hero` / `.trustpg__hero` padding-block overrides.
- **One eyebrow**: removed the lone /security dot + its 22px gap → plain `.m-eyebrow`.

## Verified (live, measured)

Every subpage's first hero element lands at the **same Y (~119–120)** — eyebrow on
hub/leaf-less pages, back-link on leaves — on the **same `rgb(242,244,247)` background**.
Pricing's eyebrow moved from a stacked ~96–176 down to 119. Build 76 pages clean.
