# 2026-05-25 — Clients empty import CTA button

## Change

Yuqi flagged the `/clients` empty state CTA: it still said `Run migration`
and used the icon-led outline treatment. The Deadlines empty state uses a
plain small primary CTA labeled `Import clients`.

Updated `ClientFactsWorkspace` so the empty Clients CTA matches that pattern:
small Button, no leading file icon, `Import clients` copy, same import handler.

## Design alignment

No `DESIGN.md` change is needed. This reuses the existing Button primitive and
aligns the Clients empty-state import affordance with Deadlines.

## Verification

- `pnpm --filter @duedatehq/app exec tsc --noEmit`
- `pnpm exec vp check apps/app/src/features/clients/ClientFactsWorkspace.tsx docs/dev-log/2026-05-25-clients-empty-import-button.md`
- live Chrome check on `http://localhost:5173/clients`
