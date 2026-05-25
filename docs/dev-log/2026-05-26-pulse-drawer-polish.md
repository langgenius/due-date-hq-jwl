# Pulse drawer polish — feedback round

**Date:** 2026-05-26
**Branch:** `design/inset-surface-system`
**Scope:** PulseDetailDrawer + PulseAlertCard + PulseStructuredFields + ObligationDrawer + inset token

## What changed

A round of focused fixes from Yuqi's screen-by-screen pass on /rules/pulse and /today after the drawer canonical landed.

### Active alert card — stronger signal

`apps/app/src/features/pulse/components/PulseAlertCard.tsx`:

- Active state bg `bg-state-accent-hover/40` → `bg-state-accent-hover` (drop the 40% opacity). At /40 the active card was just-barely-tinted — CPAs couldn't always tell which row was open in the panel.
- Border bumped `border-state-accent-hover-alt` → `border-state-accent-active-alt` (one step darker).

Result: the open row's chrome reads as a real "this is selected" signal-blue against the dimmed white siblings, while staying in the accent-hover tone family (not saturated alert blue).

### FactCard — tighter rhythm, labeled cap

`apps/app/src/features/pulse/components/PulseStructuredFields.tsx`:

- FactGrid row gap `gap-y-4` → `gap-y-3` (16 → 12px). The label-on-top stack already has ~24px row height; 16px between rows felt yawn-y at the new drawer width.
- FactCard header bg added: `bg-background-subtle`. Without it the header read as an unframed first row of the body. With the bg, the section title row reads as a labeled cap on the card — like a manila folder tab.
- Added `overflow-hidden` to the card so the header bg sits flush with `rounded-tl/tr-md` corners.

### Sticky-footer buffer — pb-24 on both drawers

`apps/app/src/features/pulse/PulseDetailDrawer.tsx` + `apps/app/src/routes/obligations.tsx`:

Body padding `py-10` → `pt-10 pb-24` on both drawers.

The sticky footer (`min-h-16` + `py-4` ≈ 64-80px tall) was overlaying the last content row when the body scrolled to the bottom. `pb-24` (96px) gives footer-height + ~32px breathing room so the CPA always sees both the last row AND the action bar with a clean gap between them. Top stays `pt-10` — header-to-content rhythm is unchanged.

### Inset token — visibility rollback

`packages/ui/src/styles/tokens/semantic-light.css`:

`--background-inset` rolled back `#fafafa` → `#f4f4f4`.

`#fafafa` was an overcorrection two passes ago: white cards (`#ffffff`) vs `#fafafa` is only ~2% lightness, so sections on /today blended into the work surface and Yuqi flagged "看不出". `#f4f4f4` gives ~4% contrast against white — cards now read as a separate layer sitting on top of the inset, which was the whole point of the inset-surface pattern.

### Doc updates

`docs/Design/inset-surface-design-system.md`:

- Token table + code example + surface hierarchy diagram now reference `#f4f4f4` (was `#fafafa`).
- Drawer canonical padding table updated to show asymmetric body padding `px-12 pt-10 pb-24`, with a "why" note explaining the sticky-footer overlap that forced the change.

## Why

Five small fixes that all came from Yuqi noticing specific things on the live UI:

- "active state not strong enough" → bg opacity removed
- "gap a bit big" in fact grid → gap-y-3
- "header source/scope 有浅色背景吧" → bg-background-subtle on header
- "下面 padding 可以更高,以防万一用户没有看到 sticky bar" → pb-24
- "现在背景太浅了,看不出" → inset color rollback

## Pending

- Smoke test in browser: active card pop, fact card header bg, drawer body bottom buffer
- ObligationDrawer internal sections may still have drift — only the OUTER chrome was migrated to canonical
