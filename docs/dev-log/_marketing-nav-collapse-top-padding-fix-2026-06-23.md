# Marketing — nav collapse: top padding survives sticking

**Date:** 2026-06-23. Follow-up to the nav collapse-to-icons work (#73).

## Bug

When the bar collapsed into the centred pill on scroll, its top gap **vanished** —
the pill jammed against the top edge. Cause: the gap was a `margin-top: 18px` on the
inner, and a top **margin** on a `position: sticky` element is **absorbed the moment
the element sticks** (the margin box moves above the viewport when pinned at `top: 0`).
So at rest the gap showed; the instant you scrolled and the nav stuck, it disappeared.

## Fix

Move the gap from a margin on the inner to **`padding-top: 14px` on the sticky `.nav`**
(in the `.nav--scrolled` state). Padding is inside the border box, so it's never
absorbed by sticking — the pill floats a consistent 14px below the top whether at rest
or pinned. Inner `margin-top` → 0; added `padding-top` to the nav's transition so the
collapse stays smooth.

Verified: `padding-top: 14px` / inner `margin-top: 0`, pill at 14px from the top. Build
76 pages clean. (Headless can't hold the scrolled/stuck state to screenshot; the fix is
the padding-vs-margin behaviour under `position: sticky`.)
