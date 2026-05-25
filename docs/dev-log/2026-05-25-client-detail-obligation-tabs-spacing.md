# 2026-05-25 client detail obligation tabs spacing

## Why

Yuqi flagged that the Summary tab in the client detail side-panel obligation drawer looked partially covered by the deadline strip above it.

## Shipped

- Added a panel-only top gap before the obligation detail tablist so the active tab and focus ring no longer visually touch the sticky deadline cards.
- Kept the spacing scoped to the panel layout, preserving the existing tab rhythm outside side-panel drawers.

## Verification

- `pnpm check`
- Playwright smoke on `http://localhost:5173/clients/hanxu-jiang` using the `plan-team` demo
  account: opened the next-due obligation panel, switched to `Summary`, confirmed the Summary tab
  is selected, measured a 7.5px gap from the sticky deadline strip to the tab, and captured
  `/private/tmp/duedatehq-client-detail-summary-tabs-spacing.png`.
