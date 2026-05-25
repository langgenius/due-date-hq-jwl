# 2026-05-25 — Collapsed sidebar rail alignment

## Why

Yuqi sent a screenshot of the collapsed rail showing the icons
not center-aligned and not on a consistent rhythm:

- Top three buttons telescoped in size:
  - Firm-switcher trigger: 32×32 (avatar inside 24px)
  - Bell: 28×28
  - Collapse toggle: 24×24
- User-menu trigger at the footer wasn't collapsing at all —
  the avatar + name button kept its full width, leaking past
  the 56px rail. The "S" of "Sarah" was visible to the right of
  the avatar.
- Inside the top-row cluster, `gap-1` (4px) was too tight —
  the toggle bumped against the bell.

Net effect: each icon sat at a slightly different x-position
and a different size, so the rail read as misaligned.

## Shipped

### All four top-row icons normalize to 32×32

| Button               | Was                    | Now                                 |
| -------------------- | ---------------------- | ----------------------------------- |
| Firm-switcher button | 32×32 / 24px avatar    | 32×32 / **28px** avatar             |
| Bell                 | **28×28**              | 32×32 (border-chip style preserved) |
| Collapse toggle      | **24×24**              | 32×32                               |
| User-menu trigger    | full row, name leaking | **32×32**, avatar-only              |

Each button now sits in a 32×32 hit-box centered in the 44px
usable rail width (`56px rail - 12px (px-1.5 × 2) = 44px`,
so 6px of slack on each side).

### Top-row cluster

`apps/app/src/components/patterns/app-shell.tsx:80-86`

- `items-stretch` → `items-center` so each child sizes to its
  own width and centers in the column.
- `gap-1` (4px) → `gap-2` (8px) so the three buttons aren't
  jammed together.
- Removed the redundant `flex justify-center` wrapper on the
  firm-switcher container — the parent's `items-center` does
  the centering now.
- Removed `mx-auto` from the collapse toggle — same reason.

### Footer container

`apps/app/src/components/patterns/app-shell.tsx:107-114`

- Container becomes a flex row with
  `group-data-[collapsed=true]/sidebar:justify-center` so the
  trigger's 32×32 avatar lands centered in the rail.
- Padding switches to `px-1.5` in collapsed mode so the avatar
  x-position matches the icons above.

### Firm switcher avatar inside the trigger button

`apps/app/src/components/patterns/app-shell-nav.tsx:227-233`

`size-6` (24px) → `size-7` (28px) in collapsed mode. The 32×32
button with a 24px tile read as too much padding around a
brand mark; 28px fills the button properly while leaving a 2px
halo for hover state.

### Bell

`apps/app/src/components/patterns/pulse-notifications-bell.tsx:108-119`

`size-7` (28px) → `size-8` (32px). Border + bg-background-default
chip style preserved — that distinguishes the bell from the
other rail icons as a "notification chip" affordance.

### Collapse toggle

`packages/ui/src/components/ui/sidebar.tsx:530-540`

`size-6` (24px) → `size-8` (32px). Same icon size inside
(`size-4` PanelLeft/PanelRight), but the hit-box matches the
rest of the rail.

### User menu trigger

`apps/app/src/components/patterns/app-shell-user-menu.tsx:207-227`

In collapsed mode the trigger now has
`size-8 flex-none justify-center p-0`, and the name span gains
`group-data-[collapsed=true]/sidebar:hidden`. The button
shrinks to the 32×32 avatar; the name vanishes; the avatar
sits centered in the rail by the parent footer container's
`justify-center`.

## Files touched

- `apps/app/src/components/patterns/app-shell.tsx`
- `apps/app/src/components/patterns/app-shell-nav.tsx`
- `apps/app/src/components/patterns/app-shell-user-menu.tsx`
- `apps/app/src/components/patterns/pulse-notifications-bell.tsx`
- `packages/ui/src/components/ui/sidebar.tsx`

## Verification

- `vp check` → 0 lint/type errors across 677 files
- Visual: collapsed rail now reads as a single column of 32×32
  squares from top (firm) to bottom (user avatar), all at the
  same x-position with consistent 8px vertical rhythm in the
  top cluster.
- Expanded mode unchanged — all the new classes are gated
  behind `group-data-[collapsed=true]/sidebar:` selectors.
