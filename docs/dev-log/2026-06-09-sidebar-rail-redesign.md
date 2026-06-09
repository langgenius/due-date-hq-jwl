# Sidebar rail redesign — 2026-06-09

A ground-up visual + interaction pass on the AppShell sidebar, driven by a
new Pencil reference (`duedatehq_work.pen` §SidebarColumn `v202hj`) plus a
series of Yuqi iterations. Chrome/visual only — no nav IA, route, contract,
or data changes. Touches three files:

- `packages/ui/src/components/ui/sidebar.tsx` (primitives)
- `apps/app/src/components/patterns/app-shell.tsx` (shell composition)
- `apps/app/src/components/patterns/app-shell-nav.tsx` (firm switcher, quick find, nav groups)

Supersedes the surface/metrics in `docs/Design/DueDateHQ-DESIGN.md §4.9`
(see the dated amendment there).

## Surface model — floating gray card on a white canvas

- The rail is no longer a flush, right-bordered panel. It's a **floating
  card**: inset 12px on every side (gutter shows the shell canvas), 12px
  radius, soft 1px shadow, **no border** ("no board"), neutral gray fill
  `#f4f4f4` light / `#242426` dark (R=G=B — deliberately untinted, not the
  warm `--background-canvas-warm`).
- The **shell canvas is now white** (`bg-background-inset` on the AppShell
  row) so the gray card reads as lifted. Inverts the prior "warm-gray rail,
  white work surface" model into "white everywhere, slightly-gray floating
  rail."
- Footprints: **280px expanded / 88px collapsed** (Pencil SidebarColumn),
  up from 220/56. Collapsed 88 = logo 32 + card padding 12·2 + gutter 12·2,
  which lets a 32px tile center exactly.

## Unified padding — no expand/collapse jump

The headline complaint was that padding/sizing rebuilt itself on every
toggle (rows became centered 32px tiles, header swapped heights, content/
footer swapped padding). Fixed by making the **card panel the single owner**
of inner spacing (`p-3` = card padding 12, `gap-2` = 8) and giving each item
its own item padding. Because the padding is symmetric (12 card + 12 item),
the 16px icon lands dead-center when the rail is narrow — **no `mx-auto` /
`justify-center` re-centering**, so nothing shifts on toggle. Verified: the
nav glyph sits at 24–25px from the card edge in BOTH modes; row height 36px;
button padding 12px — identical expanded and collapsed.

Pencil metrics copied verbatim: card padding 12, gap 8, gutter 12; nav item
`px-3` + symmetric padding; section label `h-[30px]` padding `[12,12,4,12]`;
collapsed section label → centered 19×1.5px hairline at the same height.

## Firm switcher — bordered box, no avatar

- The company **monogram avatar is gone** from the expanded header (it was a
  generated tile that just repeated the name's initials and was the heaviest
  element in the rail). The switcher is an **outlined box**: `rounded-lg`
  (8 — reduced from the Pencil 16 per "border smaller"), 1px `divider-deep`
  border, transparent fill, name (`text-base` medium) + chevron.
- **Full width** — nothing reserves space beside it.
- **Collapsed fallback**: a name can't fit in the 88px rail, so there the box
  chrome drops and it renders the 32px monogram tile (the compact identity).

## Quick find — flat search row

- New visible **"Quick find…" affordance** (was keyboard-only ⌘K). It opens
  the existing CommandPalette via `useKeyboardShell().openCommandPalette`.
- Flat (no fill), 16px search icon matching the nav icons, `gap-3` so it
  lines up in the same column as the nav rows. Text **13px muted**; the ⌘ K
  hint is 11px mono with a space between the glyphs.

## Color hierarchy — color = signal

- **Active row**: light accent fill (`#eff4ff`) + accent text/icon
  (`#155aef`) + **`font-semibold`** (weight, not just color).
- **Inactive**: label `text-secondary`, **icon a step quieter**
  (`text-tertiary`) so labels lead and the active row pops.
- **Urgent badge (Alerts / Rule library)**: a neutral gray pill by default,
  **flips to the red solid only when its row is the active route**
  (`group-*/menu-button` reads the row's `aria-current` / `data-active`).
- Reference counts (Deadlines / Clients) stay quiet gray; section eyebrows
  and the footer recede.

## Nav structure

- Inter-row **gap 0** (rows flush; the hover/active tile is the only
  separator). Item radius `rounded-lg` (8).
- **RULE** and **CLIENTS** section eyebrows are both present (CLIENTS came
  back from the new design; it also separates Clients from the RULE group so
  the manual `mt-3` gap was dropped).

## Collapse control — edge-arrow handle

- Removed from the header (so the firm box can be full width). It's now a
  small round **chevron handle that floats on the sidebar's OUTER edge**
  (centered on the rail/content seam, vertically centered), mounted by the
  `Sidebar` primitive as a sibling of the card so the card's `overflow-hidden`
  doesn't clip it.
- **Hover-revealed** (`opacity-0` → `group-hover/sidebar:opacity-100`, plus
  focus-within / focus-visible for keyboard). Direction follows state: left
  chevron when expanded (collapse), right chevron when collapsed (expand).
- Collapse/expand still also works via ⌘B, hover-peek, and nav clicks.

## Notes / follow-ups

- The Pencil literal corner radii (10 for nav, 16 for the firm box) were
  rounded to the on-scale `rounded-lg` (8) per the project corner-scale rule
  (avoid freelancing 6/10/14).
- The urgent badge now reads gray until you're on that page — chosen
  deliberately, but it means cross-rail "look here" urgency is muted. A
  middle ground (red for unread/new only) is a small follow-up if wanted.
- `tsc --noEmit` passes; verified in-browser across expanded/collapsed and
  light/dark.
