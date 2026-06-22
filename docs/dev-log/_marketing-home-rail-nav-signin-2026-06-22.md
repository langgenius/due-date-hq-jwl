# Marketing home — scroll-spy rail ported to Astro + nav Sign-in fix

**Date:** 2026-06-22 · `apps/marketing/src/components/home/*`, `apps/marketing/src/pages/index.astro`. Two asks off the live `/` redesign: the Sign-in link looked displaced in the nav, and the left scroll-spy rail from production-v2 wasn't ported yet.

## What changed

- **Left scroll-spy rail ported as a component.** New `components/home/ScrollRail.astro` — a fixed left-margin "ticker" listing the seven content sections (How it works · The document · Sources · See it work · Why trust it · Security · Questions). Shown only ≥1500px (no room in the margin below that). Active item gets a filled navy dot (`--m-accent`) + ink/600 text; the rest are faint with hollow dots. Wired into `index.astro` between `TopNav` and `main`; added `id="security"` to the Security section so the rail can target it (the other six already had ids).
- **Rail uses a scroll handler, not IntersectionObserver.** Ported the v2 IO version first, but the headless preview fires neither `IntersectionObserver` callbacks nor `requestAnimationFrame` (the page doesn't composite frames there), so it couldn't be verified. Switched to a rAF-throttled `scroll` listener that marks the last section whose top has passed a line ~40% down the viewport — deterministic, same result, and the active-section math is verifiable directly. Before the first section reaches the line, nothing is active (you're still in the hero), which is correct.
- **Nav Sign-in given its own presence.** It was a bare 45px text link sitting 18px from the solid navy CTA pill — read as stray text crammed against the button. Geometry was fine (all three nav-right elements vertically centred); the problem was weight and spacing. Gave `.nav__signin` a real button hit-area (10×16 padding, pill radius, hover tint matching the nav links) so it now matches the CTA's 41px height and reads as a deliberate secondary→primary pair. `.nav__right` gap dropped 18→6px since the link carries its own padding now.

## Verification

Rail renders correctly at 1600px with all seven items; forcing the active class shows the navy-dot/bold active state (captured "See it work" active). Active-section computation returns the right section at top (none), Sources, See it work, Trust, Security, FAQ. Live auto-tracking on scroll can't be exercised in the headless preview (no scroll/rAF/IO events) but is standard code that runs in a real browser. Nav Sign-in confirmed at 41px height with balanced spacing from the CTA.

## Still open on the home migration

Surfaces (4-card mini-UI grid) and Compare (vs-the-old-way table) sections; then the interactions pass (hero filter/apply JS, nav glider + nav-on-dark, map click-to-jump) and the 中文 i18n wrapping.
