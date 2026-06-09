# Dev log — collapse handle tracks the card edge + hover-only reveal (2026-06-09)

Two fixes to the floating collapse handle (`SidebarCollapseToggle`). UX only, no
data/contract changes. `packages/ui/src/components/ui/sidebar.tsx`.

## 1. Handle now tracks the card's visible right edge

**Bug:** the handle was positioned `right-3` relative to the **aside footprint**.
The aside stays at the collapsed width (88px) during hover-peek, but the card
expands to full width (264px) and overflows it. So when a collapsed rail peeked
open on hover, the arrow stayed stranded at ~76px — floating mid-rail (it appeared
below "Clients" instead of at the rail's right edge).

**Fix:** position the handle via an explicit `left` at the card's visible right
edge — `calc(width − 12px gutter)` — driven by the same `targetCollapsed =
collapsed && !hovered` signal the card uses. Centered on that edge (`-translate-
x-1/2`), so it half-overlaps the rail. `left` transitions in lockstep with the
card (300ms ease-apple), so the handle rides the card edge out as the rail peeks
open and back in when it closes.

Verified: handle center === card right edge in both states — narrow `76 = 76`,
wide `252 = 252`.

## 2. Reveal on hover only

**Bug:** the handle revealed on `group-focus-within/sidebar` too, so after a nav
click it lingered visible (the clicked link holds focus) without any hover.

**Fix:** dropped `group-focus-within/sidebar:opacity-100`; the handle now reveals
ONLY on `group-hover/sidebar`. Keyboard `focus-visible:opacity-100` on the handle
itself is kept so a directly-focused control is never hidden (a11y).

Verified: with a nav link focused (no hover), handle `opacity` stays `0`.
