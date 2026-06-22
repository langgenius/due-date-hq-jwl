# Dashboard + primitive token/color/hierarchy pass

**Date:** 2026-06-21
**Surface:** `apps/app/src/features/dashboard/{daily-brief-card,merged-brief-card,SetupProgressCard}.tsx`,
`apps/app/src/components/primitives/{count-pill,duotone-icon,fun-icon-button,state-badge}.tsx`,
`apps/app/src/features/billing/upgrade-cta-button.tsx`,
`apps/app/src/features/auth/entry-brand-lockup.tsx`

A curated batch of audited token/color hygiene fixes — text tokens used as
fills, raw hex/`#000`/`bg-white`, an off-radius skeleton, and a hardcoded
aria-label. Canon: semantic tokens, restrained shadows, fixed radius, track
brand tokens, no fiction.

## What changed

- **Text-token-as-fill → state-solid tokens.** Status dots and badge fills were
  painting with `bg-text-warning` / `bg-text-success` (TEXT tokens) as
  background fills. Swapped to the matching `bg-state-warning-solid` /
  `bg-state-success-solid` at: `daily-brief-card.tsx` (the brief-status dot +
  the freshness dot), `count-pill.tsx` (the `warning` tone dot), and
  `duotone-icon.tsx` (`BADGE_TONE_CLASS.warning`, now parallel to its
  `accent`/`success` `…-solid` siblings).
- **upgrade-cta-button hover fill.** `hover:bg-text-warning-secondary` (a text
  token) → `hover:bg-state-warning-solid` + `hover:brightness-95`. In light mode
  the old hover was a no-op — `state-warning-solid` and `text-warning-secondary`
  both resolve to warning-500 — so the brightness step restores a real,
  theme-safe darkening cue.
- **fun-icon-button success gradient.** The `color-mix(…, #000)` floor of the
  green well now mixes toward `var(--color-brand-ink-deep)` instead of raw
  `#000`, so the chroma stays tokenized.
- **state-badge seal + preview.** The fallback monogram seal's inline SVG fills
  `#1A3263` / `#EFE4BD` → `var(--color-brand-ink)` / `var(--color-brand-ivory)`
  (now tracks the brand tokens — a small intentional hue shift toward the
  current navy/ivory). The hover preview card's `bg-white` + `ring-black/5` →
  `bg-background-default` + `ring-divider-subtle`.
- **entry-brand-lockup shadow.** Arbitrary `shadow-[0_8px_24px_rgba(…)]` →
  `shadow-md` (token; blur 8px, under the shadow ceiling).
- **merged-brief skeleton radius.** The loading Segmented chip skeleton used
  `rounded-full`, but the real `Segmented` track is `rounded-lg` — matched it so
  the corner shape doesn't reflow when the selector lands.
- **SetupProgressCard aria-label.** Hardcoded English `"Setup progress"` →
  `t\`Setup progress\``. The message already existed (from
`sidebar-setup-card.tsx`) with a zh-CN translation, so extract only added a
  second source reference — no untranslated string.

## Skipped (faithful to constraints)

- **status-ring.tsx white check.** The `stroke="#ffffff"` is a knockout check on
  a `currentColor`-filled disc — it must stay a fixed light color regardless of
  the status tone or theme, and there is no semantic "always-white" token. Left
  as-is per the brief's own "use judgment / don't churn" guidance.
- **`/today` section-title hierarchy (von-Restorff).** The fix wants the Daily
  Brief + Alerts section headers demoted so one section leads. The Alerts title
  lives in `needs-attention-section.tsx`, which a parallel session owns and this
  batch may not touch. Demoting only the Daily Brief header (the one in-scope
  title) would leave two of three peer sections at different registers for no
  legible reason — an asymmetric half-fix that breaks the section rhythm worse
  than the current uniform state. Deferred until both titles can move together.

## Verify

- `tsgo --noEmit` rc 0; `vp run @duedatehq/app#build` success.
- `i18n:extract` (clean catalog churn — one source-ref line per locale),
  `i18n:compile --strict` rc 0.
