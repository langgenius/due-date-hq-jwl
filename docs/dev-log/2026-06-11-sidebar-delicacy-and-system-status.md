# 2026-06-11 — Sidebar delicacy pass + footer system-status line

A run of sidebar refinements (Yuqi), all within the restraint rules (no
accent text on the rail, restrained shadows, tokens only).

## Delicacy

- **Shadow** (`sidebar.tsx`) — trimmed the floating card's drop shadows:
  docked `4px/12px/.10 → 2px/6px/.06`, peek-overlay `16px/36px/.18 →
  8px/18px/.12` (also brings the peek blur under the 24px ceiling). The 1px
  ring still owns the edge.
- **Gradient hairline** (`app-shell-nav.tsx`) — the muted footer divider is a
  center-weighted gradient (transparent → divider → transparent), inset 4px.
- **Tactile press** — nav rows, the search field, and the account chip dip to
  `active:scale-[0.98]` on press (transform added to each transition).
- **Hover icon micro-motion** — nav glyphs nudge 1px toward their label on row
  hover; reset to 0 in the collapsed rail.
- **Scroll-edge fade** (`SidebarContent`) — scroll-aware gradient mask fades the
  scrolled-away edge(s) when the nav overflows; never fades a fitting rail or
  the pinned footer.

## Footer system-status line (`SidebarSystemStatus`)

A quiet "is monitoring working?" line ABOVE the Audit log / Settings group
(above the gradient divider). Reads the canonical `pulse.listSourceHealth`
query (no drift vs the Sources tab) and shows:

- a tone DOT (green / amber / red by source health),
- text that adapts: **"Monitoring N jurisdictions"** while healthy (the monitor
  scope), swapping to **"N source(s) need attention"** when a source
  degrades/fails, plus **"· swept {time}"**.
- Tooltip carries the full breakdown (health + sources×jurisdictions + last
  sweep). Links to `/rules/sources`; renders nothing until data loads.

The dot carries the colour; the label stays neutral (no coloured text on the
rail). It lives in a new `topSlot` on the muted `NavGroupSection`.

## Two fixes

- **Profile chip height** (`app-shell-user-menu.tsx`) — the account chip was
  48px (`py-2.5`) vs the firm header's 40px (`h-10`), an 8px displacement.
  Swapped to `h-10` + `w-full` (dropping `flex-1`, whose `flex-basis: 0%` was
  overriding the height in the column). Top + bottom now bookend at 40px.
- **Collapse/expand drift** (`sidebar.tsx` + nav/search/status/monogram/account)
  — the collapsed rail centered each glyph with `justify-center`, which can't
  animate, so every element SNAPPED ~3–4px on toggle. Fixed by tuning
  `SIDEBAR_WIDTH_COLLAPSED` 88→82px so a LEFT-aligned icon already lands
  dead-center, then dropping the `justify-center` overrides. Icons now hold the
  same position in both modes → no snap, still centered (verified: nav icon
  center 41px == rail center 41px).
