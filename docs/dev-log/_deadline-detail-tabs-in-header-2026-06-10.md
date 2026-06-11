# Deadline detail — tabs in the header, not the body

**Date:** 2026-06-10

Feedback (Yuqi, /deadlines/:ref page mode): "the tabs should be in the header
section, not body section."

The page-mode detail (`ObligationQueueDetailDrawer.tsx`, `isPageMode`) had the
white `<header>` (status banner · title+meta · key dates) as a non-scrolling
block, but the tab bar lived INSIDE the scroll body as a `sticky top-0` element
with a white fill — styled to look like part of the header while structurally
belonging to the body. So the tabs scrolled within the body's scroll region.

## What changed (page mode only)

The tab bar is now a real, non-scrolling part of the header. Only the tab
CONTENT scrolls.

- **Single `<Tabs>` root over header + body.** base-ui `Tabs` only requires the
  `TabsList` and the `TabsContent` panels to share a common `TabsRoot` ancestor
  — their DOM positions can differ. In page mode the outer `<Tabs>` now encloses
  BOTH the white header (which hosts the `TabsList`) and the scroll body (which
  hosts the `TabsContent` panels). The wrapper is a flex column
  (`flex min-h-0 flex-1 flex-col gap-0`) so the header stays a fixed-height,
  non-scrolling sibling above the `flex-1` scroll body.
- **TabsList moved into the header**, as the last child below the key dates.
  It is NO LONGER `sticky` — it's a fixed part of the non-scrolling header. The
  wrapper drops the sticky/white-fill chrome in page mode; the `TabsList`'s own
  `border-b` is the white→gray seam where the scroll body begins. A small `pt-2`
  separates it from the key dates.
- **Gated, not moved, for panel/sheet.** The /clients right-rail panel and the
  modal sheet are untouched: the outer wrapper collapses to a `Fragment`, the
  body keeps its own inner `<Tabs>`, and the tab bar stays a `sticky` element
  inside the body exactly as before.

## How it's wired

To avoid duplicating the (large) tab-trigger markup and the (very large) panels:

- The tab bar is extracted to a `tabBar` node, rendered in the header (page) or
  in the body (panel/sheet via `{!isPageMode ? tabBar : null}`).
- The outer and inner Tabs are toggled with element-type variables:
  `OuterTabsWrapper = isPageMode ? Tabs : Fragment` and
  `BodyTabsWrapper = isPageMode ? Fragment : Tabs`. Props are spread
  conditionally so the `Fragment` never receives Tabs props. The
  `TabsContent` panels stay inline in the body — under the outer root in page
  mode, under the inner root otherwise.

## Preserved

- Tab switching / deep-link URL: the single shared `value` + `onValueChange`
  (`onTabsValueChange`) feeds whichever root is active. Focus/keyboard tab nav
  is base-ui's, intact.
- Header collapse-on-scroll: the body's `onScroll` → `setPageHeaderCollapsed`
  still fires (the body is still the scroll container). The identity block
  (title/meta/dates) still collapses; the tabs now stay visible through the
  collapse since they live in the header.
- The 760px `mx-auto max-w-[760px]` measure: the header already centers its
  children on it, so the tab bar aligns to the same column as header + content.

## Verify

- `pnpm exec tsgo --noEmit` — clean (no new errors).
- `pnpm vp test run obligations` — 89 passed.
- `vp fmt --write` applied.
  </content>
  </invoke>
