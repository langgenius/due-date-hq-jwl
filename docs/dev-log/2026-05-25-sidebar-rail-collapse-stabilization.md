# 2026-05-25 — Sidebar rail collapse stabilization

## Why

The desktop sidebar collapse pass left two visible regressions:

- collapsed nav icons were not consistently centered on the 56px rail;
- count badges reused the same pill element for expanded digits and collapsed dots, so opening the rail could make the right-side badge geometry jump.

The fix keeps the rail contract simple: expanded is a 220px navigation sidebar, collapsed is a 56px icons-only rail.

## What changed

- `Sidebar` exposes `data-collapsed` and snaps directly between 220px and 56px. Width, padding, margin, transform, and opacity are not animated, so icons do not drift horizontally during collapse.
- `SidebarMenuButton` uses data-slot selectors for the label and tag, then centers itself as a fixed 32px tile in collapsed mode.
- `SidebarGroupLabel` hides completely in collapsed mode. No hidden group-name state, separator substitute, or extra muted footer separator remains.
- Expanded count badges stay as compact mono pills. Collapsed unread indicators use the `SidebarMenuBadgeDot` primitive, so the expanded badge pill never morphs into a dot.
- Collapse motion is intentionally visual-only: no width, margin, padding, or position animation. Expanded labels and badges fade in after the rail reaches its final layout; collapsed dots fade in separately. `prefers-reduced-motion` disables the animation.
- Collapsed tooltips are supplemental only. The nav links keep complete accessible names such as `Deadlines, 51 open deadlines`; the visible badge and dot are `aria-hidden`.
- `Cmd+B` / `Ctrl+B` is registered in the keyboard shell as `SIDEBAR_TOGGLE_HOTKEY`; the toggle button exposes `aria-keyshortcuts`.

## Verification

- `pnpm exec tsc --noEmit --pretty false --project apps/app/tsconfig.json`
- `pnpm exec tsc --noEmit --pretty false --project packages/ui/tsconfig.json`
- `pnpm check` → 0 errors, 5 pre-existing warnings
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile` still fails on 193 pre-existing missing `zh-CN` translations; the four new sidebar tooltip strings are translated.
- Chrome visual/accessibility check on `localhost:5173`: collapsed rail icons are centered, group labels are absent from the collapsed accessibility tree, expanded badges render as stable pills, and the collapse toggle is named with the shortcut.
