# Buttons — differentiation pass

Date: 2026-06-09

Yuqi: "review all of the buttons across the application … can you ensure they are
well differentiated?" The emphasis ladder (primary → secondary → tertiary →
ghost) was sound, but two tiers read too close together, `tertiary` lost its
edge on gray surfaces, the dark bulk-action bar had no sanctioned variant, and
DESIGN §4.8 had drifted years out of date. This pass fixes the differentiation
at the **primitive/token level** (so every call site improves at once) rather
than per-site.

## 1. `accent` no longer collides with `secondary`

Before: both were a white fill + the **same** neutral `0.14` border — the only
thing separating them was text hue (gray-700 vs blue). They read as "the same
button, one has blue text." `accent` is used in 17 places, so this was a
repeated ambiguity.

After (token-only, `semantic-light.css` + `semantic-dark.css`):

- `--components-button-accent-bg`: `#ffffff` → `primary-50` (`#eff4ff` light) /
  `rgb(21 90 239 / .15)` (dark)
- `--components-button-accent-bg-hover`: `state-base-hover` → `primary-100` /
  `rgb(21 90 239 / .24)`
- `--components-button-accent-border`: `rgb(16 24 40 / .14)` →
  `rgb(21 90 239 / .22)` / `rgb(21 90 239 / .32)`

`accent` now reads as a distinct **low-emphasis-but-attention-drawing** tier
(tinted blue fill + blue border), not a recoloured secondary.

## 2. `tertiary` gained a hairline

Its only signal was the `gray-100` fill, which dissolves on a
`background-section` gray pane (no edge to hold it). Added a new token
`--components-button-tertiary-border` (`rgb(16 24 40 / .08)` light /
`rgb(255 255 255 / .08)` dark), wired into `preset.css`'s `@theme` map and the
`tertiary` variant class in `button.tsx`.

> Gotcha: these button utilities are **not** auto-generated from `@theme` — each
> `--components-button-*` token must be explicitly re-exported as
> `--color-components-button-*` in `preset.css` or the `border-*` utility never
> generates (the class silently no-ops and the border falls back to the
> preflight gray-200 default). The new tertiary-border needed that mapping line.

## 3. New `inverted-ghost` variant for dark chrome

The alerts bulk-action bar (`AlertsListPage.tsx`) hand-rolled
`text-white/70 hover:bg-white/10` buttons with no variant. Added `inverted-ghost`
to `button.tsx` and migrated the bar's **Dismiss** + **Clear** controls to it.
It uses fixed white-alpha values (NOT theme tokens) on purpose — "inverted"
means it always reads light-on-dark and does not flip with the theme, matching
the bar's explicitly-dark `bg-text-primary` chrome. (The disabled, unwired
"Apply all" placeholder stays bespoke pending F-041.)

## 4. 20 hand-rolled accent links → `<TextLink variant="accent">`

Continues the v2.2 link-consolidation. Migrated the inline
`text-text-accent … hover:underline` `<button>`/`<Link>`/`<a>` links in:
`daily-brief-card`, `matched-pulse-block` (×2), `reminder-templates-page`,
`AlertDetailDrawer` (×2), `AlertCard`, `PulseFormRevisedCard`, `AlertsListPage`
(×2), `ObligationQueueDetailDrawer` (×5), `Step3Normalize`, `Step2Mapping`,
`routes/obligations` (×2), `rules.library`. Weight/layout overrides
(`font-semibold`, `self-start`, `ml-auto`, `shrink-0`, `gap-0.5`) preserved via
`className`; everything else now inherits the primitive's size, focus ring, and
underline-offset.

**Left intentionally:** the _tertiary/secondary-at-rest → accent-on-hover_
links (`coverage-tab`, `Step1Intake`) — `TextLink` has no variant for that
shape. Extend `TextLink` before migrating them. (`login.tsx` mono link and the
`preview.tsx` gallery demo are also out of scope.)

## 5. Docs + gallery

- `DESIGN.md` §4.8 rewritten (it still described the pre-2026-06-08 6px system,
  defined "Ghost" as the underlined accent link — that's now `link` — and
  forbade pills that now exist as sanctioned animated exceptions). v2.3
  changelog added.
- `/preview#button` gallery rebuilt: full variant set shown on white, on a gray
  pane, and on dark chrome, plus the legacy aliases and all 8 sizes — the live
  surface for eyeballing differentiation.

## Verify

`/preview#button` computed styles (the reliable check for color, per the preview
tooling): `secondary` = white bg + `rgba(16,24,40,.14)` border; `accent` =
`rgb(239,244,255)` bg + `rgba(21,90,239,.22)` border + blue text (now clearly
distinct); `tertiary` border = `rgba(16,24,40,.08)` (hairline applies after the
`preset.css` fix); `inverted-ghost` = white/70 text. tsgo clean across the app.

Follow-up: click-test the `Step2Mapping` "Change →" dropdown trigger (it's now a
`DropdownMenuTrigger render={<TextLink/>}` — structurally sound and type-clean,
but worth one manual open since it nests two `useRender` elements).
