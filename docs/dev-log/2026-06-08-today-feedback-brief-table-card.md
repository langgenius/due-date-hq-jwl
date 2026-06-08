# /today page-feedback — brief, actions table, alert card, status dot

Date: 2026-06-08

Batch of Yuqi page-feedback items on /today.

## Daily Brief (`daily-brief-card.tsx`)
- **Blue tint background** restored (white+hairline → `bg-state-accent-hover` +
  accent border) — the brief is the one intentionally tinted surface.
- **Removed the Firm/Me scope toggle** (`BriefScopeToggle`/`ScopeButton` deleted;
  `scope`/`onScopeChange` dropped from the destructure, kept in the prop type so
  the call site is unchanged).
- **FAILED is calmer**: the label is now neutral `text-secondary` (was red) and
  the inline retry icon matches — "same colour", less alarming.

## Actions table (`actions-list.tsx`)
- **Lighter status-group band**: `#e9ebf0` (gray-200) → `bg-background-subtle`
  (gray-100), label `text-primary` → `text-secondary` (divider hover matched).
- **Lighter verb**: action text `font-medium` → `font-normal`.
- **Consistent row hover**: the no-zebra override (`even:bg-transparent`,
  specificity 0,2,2) was beating the primitive's `hover:bg-...` on even rows, so
  hover only showed on odd rows. Added `hover:!bg-state-base-hover` so every row
  highlights identically.
- **Review button** `variant="outline"` → `variant="ghost"` (frameless).

## Alert card (`needs-attention-card.tsx`) — deferred
The card-border-removal + source-link items landed in a concurrent rewrite of
this file (white `rounded-2xl`, no border) happening in another session, so they
are not part of this commit to avoid clobbering that work. If the "remove arrow /
lighter source link" item isn't covered by that rewrite, it gets a follow-up.

## Status dot (`alerts/components/PulsingDot.tsx`)
- **Removed the shadow halo** (`shadow-status-indicator-*`); the dot + animated
  ring carry the live signal without a glow.

Verify: tsgo clean; `/today` renders at 1512×861 with no console errors.
