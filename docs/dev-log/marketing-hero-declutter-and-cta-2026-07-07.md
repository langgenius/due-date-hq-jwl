# Marketing homepage: hero declutter + ghost-CTA polish

**Date:** 2026-07-07
**Area:** `apps/marketing/` — `components/home/Hero.astro`, `styles/marketing.css`

Design pass to calm the hero (it felt overloaded; the right-side panel read as too complex).

## Hero.astro

- Removed the 4-item proof list under the sub-lead. It restated what's already shown —
  coverage (`IRS · 50 states · DC` stamp), who's-affected + source links (the panel), and
  "3 months free" (the primary CTA).
- Removed the decorative filter-chip row (`All/Federal/CA/TX/NY`) from the alerts panel — it was
  `aria-hidden` / non-functional and added visual noise.
- Show 2 alert rows instead of 3 (`alerts.slice(0, 2)`) — the URGENT disaster + one INFO; calmer.
- Tightened the CTA gap (`gap: 10px 22px` → `10px 8px`) so the primary + ghost read as one pair.
- Data (`points`, `filters`, 3rd alert) left in the i18n objects, unused — trivially restorable.

## marketing.css — `.m-cta--ghost`

- Gave the ghost CTA an outlined pill (`border: 1px solid var(--m-hairline)`, padding 11/22) so it
  has real presence next to the solid primary — a proper secondary button, not bare text.
- Hover is now color-only: label + icon + ring shift to brand blue (`border-color` → soft accent),
  no gray fill (the old `background: var(--m-section)` hover read as heavy). Shared class, so this
  cleans up every light-context ghost CTA site-wide.
- The dark-surface variant (`.m-cta-dark .m-cta--ghost`) is unchanged for now (different context).

Verified: `astro check` — 0 errors; screenshot-QA'd on the marketing dev server.
