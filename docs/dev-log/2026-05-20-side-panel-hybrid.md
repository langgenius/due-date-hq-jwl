# 2026-05-20 · Side-panel hybrid (inline at xl, modal below)

## Why

The obligation drawer was always a modal `Sheet` — useful at md and
below where space is tight, but actively in the way at xl+ where a
1440px viewport has room for the queue *and* the drawer to coexist.
The modal scrim trapped focus, killed J/K keyboard navigation, and
forced an open/close cycle every time the user wanted to compare two
rows.

The fix: render the drawer as a non-modal `<aside>` next to the queue
at xl+, keep the Sheet at md and below.

## What changed

- `packages/ui/src/hooks/use-mobile.ts` — added `useIsLargeViewport()`
  at the 1280px (`xl`) breakpoint, mirroring the existing
  `useIsMobile()` pattern. `defaultMatches: false` so SSR / first paint
  assumes the smaller layout and the hook reconciles after mount.

- `apps/app/src/routes/obligations.tsx`
  - `ObligationQueueRoute` reads `useIsLargeViewport()` and derives
    `panelMode: 'inline' | 'modal'`. Inline mode requires both the
    viewport AND a selected row — closing the drawer collapses the
    grid back to single-column.
  - The queue + drawer are now wrapped in a conditional 2-col CSS grid:
    `xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)]` when `panelMode`
    is `'inline'`, no grid when `'modal'` (since modal is portaled
    out of layout anyway). The queue column gets `overflow-x-auto`
    so the wide obligations table scrolls inside its column rather
    than visually bleeding under the panel.
  - `ObligationQueueDetailDrawer` takes a new `mode` prop. The body
    JSX was extracted into a local `body` variable; the title and
    description are now plain `<h2>` and `<p>` (rather than
    `SheetTitle` / `SheetDescription`) so they render correctly in
    both branches.
  - Render branches:
    - `mode === 'inline'`: returns `<aside aria-label={titleText}>`
      with `h-[calc(100vh-4rem)]` and `overflow-y-auto`. No backdrop,
      no focus trap, no portal. Clicking another row swaps content
      in place.
    - `mode === 'modal'`: returns the original `<Sheet>` with a
      visually-hidden `SheetTitle` + `SheetDescription` (Radix
      Dialog requires both for a11y); the visible heading is the
      `<h2>` inside `body`.

## Why visually-hidden SheetTitle in modal mode?

Radix Dialog enforces an accessible name via `DialogTitle`. The visible
heading lives inside `body` as a plain `<h2>` so the same JSX works
in both render paths. In modal mode we keep an `sr-only` `SheetTitle`
to satisfy Radix; the screen reader picks it up before the body
content. In inline mode there's no dialog, so the `<aside>` gets an
explicit `aria-label` instead.

## Verified

- `npx tsgo --noEmit` → exit 0
- **xl (1440px)**: inline `<aside>` renders at x=845 w=560, queue
  column at x=244 w=585. No modal scrim, no Sheet in the DOM, J/K
  keyboard nav remains live.
- **md (1024px)**: modal Sheet renders at 840px wide (per the
  existing `md:w-[min(840px,...)]` rule). No inline aside, no grid.
- **sm (375px)**: full-screen Sheet (`max-w=375px`, the viewport
  width). Behaves identically to pre-refactor.

## Files touched

- `packages/ui/src/hooks/use-mobile.ts`
- `apps/app/src/routes/obligations.tsx`
- `docs/dev-log/2026-05-20-side-panel-hybrid.md` *(this file)*
