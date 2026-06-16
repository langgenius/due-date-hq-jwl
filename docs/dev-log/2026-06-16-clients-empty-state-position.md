# 2026-06-16 Clients empty-state position

## What changed

- Moved the `/clients` zero-client hero upward by adding responsive bottom
  padding to the empty-state wrapper, keeping the card horizontally centered
  while aligning it closer to the page center in the visible viewport.

## Verification

- `pnpm exec vp check apps/app/src/features/clients/ClientsEmptyState.tsx docs/dev-log/2026-06-16-clients-empty-state-position.md`
- Browser check on `http://localhost:5173/clients`: empty-state card measured
  at `top=493`, `centerX=847`, matching the main content center at `847`.
