# Marketing — nav blur removed + Notice toggle no-jump

**Date:** 2026-06-23. Two live-site fixes the user flagged.

## 1. Nav: kill the blur, solid collapsed pill

The bar used `backdrop-filter: blur` (base + collapsed pill) — the blurred content
behind read as muddy/ugly, and the collapsed pill was a translucent ghost. Removed
the blur everywhere: the base bar is now a solid `--m-canvas` + hairline; the collapsed
pill is **solid white** (`--m-surface`) with a soft micro-shadow (`0 1px 4px /0.08`) so
it's a clean, defined floating pill instead of a blurry overlay.

## 2. Notice example toggle: no layout jump

The change-type examples used `display: none → grid`, so switching to a taller/shorter
example reflowed the section ("hate the jump"). Now **all panels stack in one grid cell**
(`grid-area: 1 / 1`) — the container height is constant (= the tallest example), and only
the active panel is visible (opacity/visibility cross-fade). Verified: panel container
holds a constant 459px across all examples; content swaps without moving the layout.

Build 76 pages clean.
