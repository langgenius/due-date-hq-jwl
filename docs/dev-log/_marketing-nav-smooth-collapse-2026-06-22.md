# Marketing — nav collapse is now a smooth morph

**Date:** 2026-06-22
**Scope:** `apps/marketing` — `TopNav.astro`

## Why

Owner: the expanded navbar didn't animate into the collapsed pill — it snapped.
"应该是 natural transition."

## Root cause

The scrolled state changed `display: grid → flex`, `max-width: 1240 → max-content`,
and `display: none`'d the brand text + Sign-in. None of those are interpolatable,
so the browser jumped straight to the end state — only the background faded.

## Fix — make every changing property animatable

- `.nav__inner` is now `display: flex` in **both** states (no grid→flex swap). The
  collapse interpolates: `max-width 1240 → 600px`, `height 70 → 56px`, `padding`,
  `gap`, `margin-top` — all lengths, one shared `cubic-bezier(0.32,0.72,0,1)` easing.
- Centre convergence via **`flex-grow: 1 → 0`** on the side groups (`.brand`,
  `.nav__right`) — animatable, so the logo and CTA glide inward as the bar contracts.
- The collapsing elements (`.brand__name`, `.brand__beta`, `.nav__signin`) animate
  `max-width → 0` + `opacity → 0` + padding/margin (they're flex items, so max-width
  applies) instead of `display: none`.
- Base `.nav__inner` carries a transparent 1px border so the scrolled border-color
  transitions in without a layout shift.
- `.nav__cta` gets `white-space: nowrap` + `flex: none` so it never wraps in the pill.
- Scroll handler gets **hysteresis** (collapse > 64px, expand < 24px) so the pill
  never flickers when the user lingers right at the threshold.
- `prefers-reduced-motion` disables all the new transitions.

## Verified

- Build clean (76 pages).
- Settled scrolled state (transitions disabled to read the target): pill is 600px
  wide, centred, 56px tall, radius 999; brand name + Sign-in collapsed to 0; logo +
  nav + CTA visible on one line; no horizontal page overflow.
- The morph itself is for live review (headless can't drive scroll), but every
  property is now a length/number with matching easing, so it interpolates.
