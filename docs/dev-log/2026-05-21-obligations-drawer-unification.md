# 2026-05-21 · Obligations drawer unification

## Background

The xl inline obligation panel kept the queue and detail visible at the
same time, but it introduced styling drift from the canonical drawer:
different chrome, different close affordances, and a narrower detail
column that made dense workflow content harder to judge.

Product direction changed to use one drawer treatment across all
viewport sizes.

## What Changed

- `apps/app/src/routes/obligations.tsx`
  - Removed the `useIsLargeViewport()` dependency from the obligations
    route.
  - Removed `panelMode`, the conditional xl grid wrapper, and the
    inline `<aside>` render path.
  - Simplified `ObligationQueueDetailDrawer` so it always renders the
    existing `Sheet`.
  - Removed inline-only close hotkey/X-button wiring. Sheet owns Esc,
    close chrome, backdrop, scroll lock, and focus trap consistently.
- `packages/ui/src/hooks/use-mobile.ts`
  - Removed the now-unused `useIsLargeViewport()` helper and
    `LARGE_VIEWPORT_BREAKPOINT` export that only existed for the inline
    panel split.

The row-click regression fix remains in place: clicking ordinary row
data opens `drawer=obligation&id=...`, while row controls still consume
their own clicks.

## Verification

- `pnpm --filter @duedatehq/app test -- obligations.test.ts`
- Manual Playwright check against `http://localhost:5173/obligations`:
  clicking `Arbor & Vale LLC` opened a `dialog` Sheet with
  `drawer=obligation&id=...&tab=readiness` in the URL.

## Docs Alignment

`docs/dev-file/05-Frontend-Architecture.md` already describes
obligation detail as URL-backed drawer state, so no stable spec change
was needed.
