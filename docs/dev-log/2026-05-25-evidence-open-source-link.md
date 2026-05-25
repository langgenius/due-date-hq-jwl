# 2026-05-25 evidence open source link

## Why

Yuqi flagged that the `Open source` action in the client detail obligation Evidence tab should reliably open the corresponding source.

## Shipped

- Rendered `Open source` as a real anchor styled like the app button, so the source URL remains inspectable, copyable, and openable with browser link affordances.
- Added click handling that opens the source in a new tab and falls back to same-tab navigation if the browser blocks the popup.
- Reused the same external-open helper for readiness portal links in the drawer.

## Verification

- `pnpm check`
- Playwright smoke on `http://localhost:5173/clients/hanxu-jiang` using the `plan-team` demo
  account: opened the next-due obligation panel, switched to `Evidence`, confirmed `Open source`
  renders as a real link to `https://www.ftb.ca.gov/file/when-to-file/due-dates-business.html`,
  clicked it, and observed a popup at the same FTB URL with no console errors.
