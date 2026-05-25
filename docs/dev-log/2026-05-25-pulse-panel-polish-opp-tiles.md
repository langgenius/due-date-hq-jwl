# 2026-05-25 — Pulse panel polish + /opportunities tile restyle

## Why

Two batches of feedback in one commit:

**Pulse panel — Yuqi flagged five structural bugs:**

1. State filter map shouldn't be always on the screen → dropdown
2. Double-scroll: page scrolls on left AND right when panel open
3. Action bar should be sticky at the bottom of the right panel
4. Right panel needs an obvious close button
5. When the right panel is open the filter row should collapse
   to a single line

**/opportunities tiles — "Also opportunities summary card (3
columns) are so ugly. just copy the style on other page."**

## Shipped — Pulse panel polish

### State map moved into a Popover dropdown (shipped earlier as `6c52c5da`)

The always-visible tilegram (~300px tall) is now behind a
trigger button in the filter row. Trigger reflects the active
state ("CA · 4 alerts" with StateBadge motif) or "Any state"

- chevron; clicking opens the tilegram in a popover.

### No more double-scroll

- Page root switches to `h-full min-h-0 flex flex-col` when the
  panel is open. The page itself no longer scrolls vertically.
- The list column (left) gets `min-h-0 overflow-y-auto` so long
  alert lists scroll inside the column instead of pushing the
  page down.
- The aside (right panel) gets `h-full min-h-0 overflow-hidden`
  - its body keeps the existing `overflow-y-auto` on the middle
    content slot. Only the panel's middle scrolls; header and
    footer stay pinned.

### Close button on the right panel

`PulseDetailDrawer` mode='panel' now renders an explicit X
button at the top-right of the aside. Sheet mode already gets
one from the Sheet primitive; panel mode needed an explicit one
since there's no portal-mounted chrome. The button is
focusable, has an `aria-label={t\`Close alert detail\``}, and
hovers to `bg-state-base-hover`.

### Sticky action bar

The body already used `SheetFooter`'s `mt-auto` which pins it
to the bottom of the flex column. With the new `aside h-full
min-h-0 overflow-hidden`, the layout works as intended: header
fixed at top, middle scrolls, footer pinned to bottom. No
additional sticky logic needed.

### Minimal filter row when panel open

Filter row's flex wrapper switches from `flex-wrap` to
`flex-nowrap overflow-x-auto pb-1` when the panel is open. The
4 Select dropdowns + state popover + Reset stay on one
horizontal line; if the column is too narrow to fit them, the
row scrolls horizontally inside its own bounds — does NOT wrap
the filters down and push the alert list off-screen.

When no panel is open, the row keeps its original `flex-wrap`
behaviour so wider viewports lay out cleanly.

## Shipped — /opportunities tile restyle

Tiles abandoned the rule-library `StatTile` shape (uppercase
caption-tier label on top, number below — which wrapped to two
lines at full page width with the long labels "Advisory
conversations" / "Retention check-ins" / "Scope reviews").

New shape mirrors the dashboard's `ActionsSummaryTile` that
Yuqi already sees on Today:

```tsx
<div
  className="flex min-w-[160px] flex-col gap-1
                rounded-md border border-divider-subtle
                bg-background-default px-4 py-3"
>
  <span className="text-2xl font-semibold tabular-nums">{value}</span>
  <span className="text-sm text-text-secondary">{label}</span>
</div>
```

- Large number on TOP (`text-2xl semibold`), label below in
  sentence-case (`text-sm text-secondary`)
- Generous padding (`px-4 py-3`)
- `min-w-[160px]` so the tile reads as a real metric card

## Files touched

- `apps/app/src/features/pulse/AlertsListPage.tsx`
  - Page root: `h-full min-h-0` when panel open
  - List column: `min-h-0 overflow-y-auto`
  - Panel column: `flex min-h-0` (lets aside fill)
  - Filter row: `flex-nowrap overflow-x-auto` when panel open
- `apps/app/src/features/pulse/PulseDetailDrawer.tsx`
  - `XIcon` import
  - Close button + structural CSS on the panel-mode aside
- `apps/app/src/features/opportunities/opportunities-page.tsx`
  - `OpportunitiesStatTile` reshaped to dashboard rhythm

## Verification

- `vp check` → 1462 files formatted, 0 lint/type errors across
  669 files
