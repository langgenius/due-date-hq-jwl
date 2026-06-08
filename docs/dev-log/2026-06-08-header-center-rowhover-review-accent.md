# /today — header centering, visible row hover, accent Review

Date: 2026-06-08

- **PageHeader vertical centering** (`page-header.tsx`, shared): the title row
  switched `lg:items-end` → `lg:items-center`, so the actions cluster centers
  against the title block instead of sitting at its baseline. Affects every
  PageHeader consumer (the change is broadly desirable for short headers).
- **Visible row hover** (`actions-list.tsx`): the Actions row hover was
  `state-base-hover` (20% gray) on a white card — nearly invisible ("same colour
  as the card"). Bumped to `state-base-hover-alt` (40%) for a clearly visible
  hover (focus-visible matched).
- **Review button accent** (`actions-list.tsx`): the hover-revealed Review action
  `variant="ghost"` → `variant="link"` — frameless accent text (Yuqi "accent
  colour").

## Verify
tsgo clean; `/today` header actions vertically centered; renders at 1512×861.
