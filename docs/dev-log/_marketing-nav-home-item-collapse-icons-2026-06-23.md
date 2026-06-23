# Marketing — nav: Home item + collapse-to-icons

**Date:** 2026-06-23. Two TopNav changes.

## 1. Home as the first nav item

The pill was How it works · Coverage · Pricing · Security. Added **Home** as the
first item (`/`, localized "Home" / "首页"), so the primary nav is now five items.
It also flows into the mobile sheet (same `links` array).

## 2. Collapse to icons on scroll

The bar already collapses into a centred pill on scroll (`.nav--scrolled`). Now each
nav item also **swaps its label for a glyph** in that state:

- Added a lucide-style icon per item (house · compass · map · tag · shield), rendered
  as a hidden `.nav__link-icon` next to the `.nav__link-label`.
- Default: label shown, icon `max-width: 0`. Collapsed (`.nav--scrolled`): label
  `max-width/opacity → 0`, icon `max-width: 22px / opacity 1`, link padding → square.
  Both sides animate via `max-width` (same technique as the collapsing brand name).
- `title={label}` on each link keeps the name discoverable on the icon-only state;
  the label stays in the DOM for screen readers.

## Verified (live)

Expanded: 5 items with labels (Home … Security), each with an icon path. Collapsed
(real scroll): icons render at 18px; with transitions disabled to read the target
state, labels are opacity 0 / width 0 and the brand name collapses — clean icon-only
pill. Build 76 pages clean.
