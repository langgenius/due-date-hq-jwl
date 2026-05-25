# 2026-05-26 — Collapsed sidebar: group-label overflow + badge dot + icon centering

## Why

Yuqi screenshotted the collapsed rail and flagged three visual
bugs across two reviews:

1. **"RULE" and "CLIENTS" labels were still visible.** The
   `SidebarGroupLabel` morphs into a 1px hairline in collapsed mode
   (`h-px` + `bg-divider-subtle`), but `overflow: visible` was
   inherited, so the 11px uppercase glyphs spilled above the
   hairline and read as visible text labels in the icons-only
   rail.
2. **The Rule library "456" badge rendered as a ~20×6 rectangle**
   next to the book icon, not a 6×6 dot like the other badges
   ("3" Alerts, "9" Clients). The collapsed-mode class set
   `min-w-1.5` (6px) + `text-transparent`, but `min-w` only sets
   the minimum and `text-transparent` colors glyphs without
   removing them from layout — so the badge stretched to the
   width of the text "456" (≈20px).
3. **Icons were 5px off-center horizontally inside their tiles.**
   The base `SidebarMenuButton` has `gap-2.5` (10px) between its
   flex children (icon span + label span). In collapsed mode the
   label shrinks to `max-w-0 opacity-0` but is still a flex
   child, so the 10px gap stayed reserved. With
   `justify-center` the 16px icon landed at `offsetLeftInTile=3`
   instead of `8`, visibly shifted left of center inside the
   32px tile.

All three bugs were in `packages/ui/src/components/ui/sidebar.tsx`
— introduced as part of the upstream `SidebarGroupLabel`/badge
collapse-mode rework (PR #17, "sidebar reconcile").

## Shipped

### `SidebarGroupLabel` — clip the text and zero the color

`packages/ui/src/components/ui/sidebar.tsx`

Added `overflow-hidden` + `text-transparent` to the
`group-data-[collapsed=true]/sidebar:` rule set:

```ts
// before
'group-data-[collapsed=true]/sidebar:my-1.5 group-data-[collapsed=true]/sidebar:h-px group-data-[collapsed=true]/sidebar:px-0 group-data-[collapsed=true]/sidebar:bg-divider-subtle'

// after
'group-data-[collapsed=true]/sidebar:my-1.5 group-data-[collapsed=true]/sidebar:h-px group-data-[collapsed=true]/sidebar:px-0 group-data-[collapsed=true]/sidebar:overflow-hidden group-data-[collapsed=true]/sidebar:bg-divider-subtle group-data-[collapsed=true]/sidebar:text-transparent'
```

`overflow-hidden` clips the text to the 1px container;
`text-transparent` belt-and-suspenders the case where sub-pixel
rendering would leave a half-pixel sliver of glyph.

### `SidebarMenuBadge` — fixed 6×6 dot regardless of digit count

`packages/ui/src/components/ui/sidebar.tsx`

Both `inventory` and `urgent` tones swap `min-w-1.5` →
`size-1.5` and add `overflow-hidden`:

```ts
// before
'group-data-[collapsed=true]/sidebar:h-1.5 group-data-[collapsed=true]/sidebar:min-w-1.5 group-data-[collapsed=true]/sidebar:rounded-full ...'

// after
'group-data-[collapsed=true]/sidebar:size-1.5 group-data-[collapsed=true]/sidebar:overflow-hidden group-data-[collapsed=true]/sidebar:rounded-full ...'
```

`size-1.5` locks both dimensions to 6px; `overflow-hidden`
prevents the transparent glyphs from contributing visual width.

### `SidebarMenuButton` — `gap-0` in collapsed mode

`packages/ui/src/components/ui/sidebar.tsx`

Added `gap-0` to the collapsed-mode override:

```ts
// before
'group-data-[collapsed=true]/sidebar:size-8 group-data-[collapsed=true]/sidebar:w-8 group-data-[collapsed=true]/sidebar:mx-auto group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0'

// after — adds gap-0 so the icon centers properly
'group-data-[collapsed=true]/sidebar:size-8 group-data-[collapsed=true]/sidebar:w-8 group-data-[collapsed=true]/sidebar:mx-auto group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:gap-0 group-data-[collapsed=true]/sidebar:px-0'
```

The collapsed label still animates out via `max-w-0 + opacity-0`
(kept for the smoothness pass), but with `gap-0` flex no longer
reserves the 10px spacer between icon and (zero-width) label.

## Files touched

- `packages/ui/src/components/ui/sidebar.tsx`

## Verification

- `pnpm exec vp check` → 0 errors, 8 warnings (all in
  `obligations.tsx`, none in files I touched).
- Preview at 1440×900, collapsed sidebar (`data-collapsed=true`):
  - Inspect on `[data-slot=sidebar-group-label]`: `height: 1px`,
    `overflow: hidden`, `color: rgba(0, 0, 0, 0)`,
    `background-color: rgba(16, 24, 40, 0.04)`. Text content
    "Rule" / "Clients" still in DOM (for a11y / screen readers),
    fully clipped + invisible visually.
  - Inspect on all 4 `[data-slot=sidebar-menu-badge]`: every one
    measures exactly 6×6, including the "456" Rule library badge
    (previously 19.8×6).
  - Inspect on all 4 `[data-slot=sidebar-menu-button]`: every
    icon sits at `offsetLeftInTile: 8, offsetTopInTile: 8` —
    perfectly centered in the 32×32 tile (was `(3, 8)`).
- Preview at 1440×900, expanded sidebar (`data-collapsed=false`):
  - Labels at h:28 px, color: text-text-tertiary (#676F83) —
    unchanged.
  - Badges render as inline colored text next to the row label
    ("3", "5", "456", "9") — unchanged.

## Out of scope

- The React Router `insertBefore` / `removeChild` console errors
  observed during testing came from eval-driven localStorage swaps
  + reloads (the harness mutating the DOM mid-HMR commit). They
  are not reproducible with normal user interaction and aren't
  caused by these CSS-only changes.
