# Audit loose-ends — real brand glyphs, AuthHeading sweep, hero-gating confirm

**Date:** 2026-06-24
**Closes the 3 loose ends from** [the quality-gradient pass](./_quality-gradient-signature-pass-2026-06-24.md).

1. **Real provider brand marks.** New shared `components/primitives/provider-glyphs.tsx`
   exports `GoogleGlyph` / `MicrosoftGlyph` / `AppleGlyph` / `OutlookGlyph` (official brand
   SVGs — the sanctioned exception to tokens-only; Apple is monochrome via `currentColor`).
   - `/calendar` `ProviderMark` now renders the real Google/Apple/Outlook logos in the neutral
     icon tile (replaced the CSS color-dot/clip-path approximations). Verified live: all three
     brand SVGs render in the "How to subscribe" cards.
   - Deduped: `login.tsx` + `accept-invite.tsx` each had their own copy of the Google +
     Microsoft SSO SVGs — both now import the shared glyphs (aliased to keep call-sites
     unchanged); removed the now-unused local defs + `cn` import in accept-invite.

2. **AuthHeading sweep.** `accept-invite.tsx`'s two H1s (the last raw
   `text-3xl font-semibold leading-[1.15]…` instances) → the `AuthHeading` component.

3. **Busiest-owner hero gating — confirmed intentional (no change).** The /workload hero
   lives in `ManagerInsights`, rendered only when `data.managerInsights` exists; the copy
   explicitly markets it as a **Team+** capability with an upgrade path. Pro accounts
   correctly don't see it. (Live-verified the rest of /workload renders for Pro: the new
   "Needs attention" StatBand, AssigneeAvatar rows, load spine.)

## Noted (pre-existing, out of scope — flagged separately)
- A React key-spread warning fires on `/calendar` (and likely elsewhere): a Base UI
  render-prop spreads the injected `key` into a `<span>`. My diff adds no render-props/spreads
  — it's a shared-component leak (the documented Base UI pattern; fix = lift `key` out). Spun
  off as its own task.

## Verify
`tsgo` app clean; `vp run @duedatehq/app#build` clean (✓ built); `i18n:extract` 0-missing
(component swaps, no new copy). Calendar provider glyphs verified live (Google #FFC107/#1976D2,
Apple silhouette path, Outlook #0F6CBD).
