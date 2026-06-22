# Collapsed rail — square the selected tile + align the sidebar top with the page title

**Date:** 2026-06-22
**Surface:** `ui/sidebar.tsx` (`sidebarMenuButtonVariants`),
`patterns/app-shell.tsx` (firm-header padding),
`patterns/app-shell-nav.tsx` (`SidebarQuickFind`, `SidebarSystemStatus`)

Two asks from Yuqi on the collapsed rail.

## 1 · The collapsed selected box is now a square

The recent "solid accent pill" for the active route (commit 8686aade) made the
highlight a prominent solid fill — and in the collapsed rail it was rendering
as a **38×32** rounded rectangle (the w-full row-pill clipped to the narrow
card), which read as a stub rather than a tile.

In collapsed mode the nav button now constrains to a centered **32×32 square**
(`w-8` = `h-8`, radius 8px) via `mx-auto w-8 px-2`. The icon does NOT move: at
`px-[11px]` in the 38px card the glyph already sat on the rail centerline, and a
centered `w-8` box with `px-2` ((32−16)/2 = 8) lands it at the exact same x
(verified: icon stays at x:33). So there's no snap on expand/collapse — only the
highlight's right edge grows out into the full pill when the rail expands.
Expanded mode is untouched (every square class is gated behind
`group-data-[collapsed=true]`).

For consistency the two other collapsed rows that aren't nav buttons —
`SidebarQuickFind` and `SidebarSystemStatus` — collapse to the same centered
32×32 square (`size-8` squares the status row's h-7), so hover/press washes
match the selected tile and all three share one x.

## 2 · Sidebar top padding now matches the page title

The firm-identity row started at **y=30** while the page `<h1>` starts at
**y=32** (the documented `pt-8` page-top rhythm), so the sidebar sat 2px high.
The card sits 12px down (`inset-y-3`) + 6px card pad (`py-1.5`) = 18px; bumping
the brand-row wrapper `pt-3` → `pt-3.5` (12px → 14px) lands the row at y=32 —
the same line the page title starts on (verified `firmRowTop === pageHeaderTop
=== 32`). The footer is `mt-auto`-pinned, so nothing below shifted.
