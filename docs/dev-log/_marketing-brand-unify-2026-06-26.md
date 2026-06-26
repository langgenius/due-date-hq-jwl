# Marketing brand unify — new mark + drawn wordmark in nav + footer

**Date:** 2026-06-26 · Follows [the brand mark refresh](./_brand-mark-refresh-2026-06-26.md)
and [the wordmark component](./_brand-wordmark-component-2026-06-26.md).

The marketing site was the last surface on the old brand: its `TopNav` drew a different
mark (vertical ascending bars) and a plain-text wordmark, and the `Footer` used text. Both
now use the new tilted-bars mark + the drawn "DueDateHQ" wordmark.

## Changes

- `apps/marketing/src/components/home/TopNav.astro` — `.brand__mark` svg → the tilted-bars
  mark (`viewBox 0 0 85 65`, all rects `fill="var(--m-ink)"`, ~27×21px); `.brand__name`
  text → the drawn wordmark letters (`viewBox 103.768 0 488.021 76.512`, 9 `<path>`,
  `fill="currentColor"`, sized `height:0.92em`). The `.nav--on-dark` white flip, the
  `.nav--scrolled` collapse, and focus states are preserved.
- `apps/marketing/src/components/home/Footer.astro` — `.footer__name` text → the same drawn
  wordmark letters svg (`height:1em`, currentColor), kept as the `<a>` link with its aria-label.

The drawn letterforms are the canonical ones in
`packages/ui/src/assets/brand/brand-wordmark.svg`; the mark geometry matches
`brand-mark.svg`. Marketing uses its own `--m-*` tokens, so the SVGs are inlined (no shared
component import).

## Verify

`pnpm -F @duedatehq/marketing build` — 191 pages, 0 errors. `vp fmt --check` clean. Nav +
footer lockup rendered for an eyeball pass on light and on a dark band.

## Notes

- The app already adopted the new mark/wordmark (login/splash/entry); this closes the gap so
  the public site matches.
- OG share images (`apps/marketing/public/og/*.png`) are still baked from the old brand —
  they re-render through the marketing build/asset pipeline and should be regenerated.
