# /alerts list — center the 1040 reading measure

_2026-06-15_

Yuqi: "what is happening with the width and responsive?" On a 1512px+ monitor the
alerts list sat in a 1040px column **left-pinned**, pooling all the empty space
on the right — which read as broken (it wasn't; it was the intentional reading
cap). Yuqi's call: **center the 1040 column** so the whitespace is balanced.

## The actual cause

`/alerts` mounts `AlertsListPage` **embedded** inside `RulesPageShell`. The page
title ("Alerts · N open · LIVE") is rendered by the shell (the `PageHeader`
inside AlertsListPage is gated `!embedded`), and the shell's content wrapper
(`mx-auto max-w-page-expanded`, ~1430) holds *both* the title and the embedded
list. The 1040 cap lived on AlertsListPage's inner list column as `flex-1`
(left-pinned). So:

- Editing AlertsListPage's list-only branch did nothing — that branch is the
  off-route fallback; `/alerts` uses the embedded branch.
- Centering only the list column misaligned it from the shell-owned title.

## Fix

Cap the **shell content** at 1040 when no detail panel is open, via the route's
`RulesPageShell contentClassName` (`!panelOpen && '!max-w-[1040px]'`; `!` beats
the `wide` prop's `max-w-page-expanded`). The shell wrapper is already
`mx-auto`, so this **centers the title + toolbar + rows together** with balanced
margins. Panel-open keeps `!max-w-none` for the full-width rail + detail split.

AlertsListPage is unchanged functionally (comments only point to the route as
the width owner).

## Verified live (1512px)

Title and first row both start at x=309 (aligned); left/right margins 245 / 227
(balanced — the ~18px diff is the stable scrollbar gutter); row measure 1040.
Opening an alert still expands to the full-width rail + detail split.
