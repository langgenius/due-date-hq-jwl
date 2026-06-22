# Marketing — critique remediation (P0/P1 fixes)

**Date:** 2026-06-22
**Scope:** fixes for the whole-site design critique
(`docs/marketing/design-critique-2026-06-22.md`). Multi-agent workflow, one agent
per concern (distinct files), verified + committed by the main loop.

## Fixed

- **P0 · Mobile/tablet nav** (`TopNav.astro`) — added a hamburger (≤920px) + an
  accessible sheet (`role=dialog`, `aria-modal`, `aria-expanded`/`aria-controls`,
  Esc-to-close, Tab focus-trap + restore, scrim/outside-click/link-click dismiss,
  resize-above-920 close, reduced-motion instant). Exposes the four nav links +
  Sign in + Start-free. Desktop nav + scroll-collapse pill untouched. Verified live
  at 390px: pill hidden, burger shows, sheet opens with all links + CTA.
- **P0 · Stale machine copy** (`i18n/en.ts` + `i18n/zh-CN.ts`, value-only) — `meta`
  + `geo.structuredData` rewritten to the v2 deadline-change-monitoring narrative;
  **"Radar" purged** (grep = 0 in both); the over-claimed **"24h Alert SLA" dropped**
  (grep = 0) → descriptive "around the clock / 24/7"; primary CTA standardized on
  "Start free" ("Open the workbench" reserved for sign-in/app entry). Typecheck clean.
- **P1 · a11y + type + CJK** (`marketing.css`) — `--m-faint` 0.3→**0.55 alpha**
  (~1.9:1 → ~4.5:1, fixes the "sample data" disclaimers + eyebrows); a `.close
  :where(a,button):focus-visible` cyan ring (the finale CTAs had none); `.m-page-title`
  pushed to `clamp(34,4.4vw,54)` for a clearer H1→H2 step; one `html[lang='zh-CN']`
  guard for the five display-serif hero classes (CJK stack + line-height 1.18 +
  letter-spacing 0) and `html[lang='zh-CN'] .ital { font-style: normal }` to kill the
  synthesized faux-italic on Chinese (the `html[lang]` selector out-specifies Astro's
  scoped rules).
- **P1 · ScrollRail** (`ScrollRail.astro`) — first dot now maps to Villain
  (`#villain-h`) so the active state is never empty through Villain/Surfaces; added a
  **Surfaces** stop (the `#surfaces` anchor was added on the section); added a
  `prefers-reduced-motion` guard (no slide/scale/glow — colour-only active dot).
- **P1 · Surfaces links** (`Surfaces.astro`) — "apply" repointed off `/security` to
  `/how-it-works`; per-card labels that predict the destination ("See coverage" /
  "See in the tour") replace four identical "See it →"; added `id="surfaces"`.

## Not fixed (intentional)
- P1-14 "Surfaces horizontal pin missing" — the pin was removed deliberately (owner
  found the clipped pin unnatural); the static workbench is the intended state. Only
  the old commit title referenced the pin.

## Verified
`pnpm --dir apps/marketing build` → 76 pages clean. Mobile nav functional at 390px.
Radar/SLA = 0. (Time-based transitions don't advance in the headless preview, so the
sheet open-tween + reveals still need a real-browser glance.)
