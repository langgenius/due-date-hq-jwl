# /today dashboard polish — batch 2

Date: 2026-06-08

Yuqi review of /today (8 items; #7 was a no-op).

## Changes

- **Import clients → expand-on-hover pill** (dashboard.tsx): the icon-only "+"
  Button became a hand-rolled pill — 28px circle at rest, label expands on hover
  (`max-w-0 opacity-0` → `group-hover:max-w-[120px]`), fixed `h-7` so it never
  changes height. Primary tokens + onClick + aria-label preserved.
- **Daily Brief failed state** (daily-brief-card.tsx): removed the "Failed" label;
  the retry became a "↻ Regenerate brief" accent text button placed beside the
  "We couldn't generate today's brief." message; close X stays far-right.
- **Section headers even lighter** (needs-attention-section.tsx + actions-list.tsx):
  "Alerts" + "Actions this week" eyebrows `text-text-tertiary` → `text-text-muted`.
- **Tooltip more generous** (packages/ui tooltip.tsx, shared): `px-2.5 py-1.5` →
  `px-3 py-2`, `rounded-lg` → `rounded-[10px]`.
- **Why-now elbow** (actions-list.tsx): the "Why now: …" line leads with the small
  ↳ elbow glyph (matching the alert row's action elbow); text wrapped in an inner
  truncating span.
- **"View all" → "View all deadlines"** (actions-list.tsx ActionsListHeader).
- TaxCodeBadge: already `font-mono` everywhere (same component as the alert
  table) — no change.

## Verify

tsgo clean; /today at 1512×861 — import button 28px fixed-height (label expands on
hover), Regenerate-brief beside the failed message, lighter eyebrows, why-now
elbow, "View all deadlines".
