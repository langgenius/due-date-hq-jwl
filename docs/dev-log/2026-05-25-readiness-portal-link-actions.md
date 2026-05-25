# 2026-05-25 · Readiness portal link actions

## Summary

Fixed the Materials request link actions without changing the existing email-send flow.

## Changes

- Kept `Send to client` behavior intact: it still creates a readiness portal request and can queue
  email when the client has an email address.
- Made the request panel `Copy link` wait for clipboard success, with a hidden textarea fallback and
  an error toast when the browser blocks clipboard access.
- Changed `Open portal` from an anchor-rendered button to an explicit click handler that opens a new
  window and falls back to same-window navigation if the browser blocks the popup.
- Renamed the drawer footer copy action to `Copy link to this obligation` so it is not confused with
  the client portal link.

## Validation

- `pnpm --filter @duedatehq/app exec tsc --noEmit`
- `pnpm exec vp check apps/app/src/routes/obligations.tsx`
- Playwright smoke: seeded an isolated obligations firm, created a Materials request, confirmed
  `Copy link` writes a `/readiness/` URL, and confirmed `Open portal` opens a `/readiness/` URL.
