# 2026-05-25 — Deadlines empty copy

## Change

Yuqi flagged the `/deadlines` empty state because the route label is
Deadlines, but the empty-state copy still said `No obligations yet` and
`start tracking their obligations`.

Updated the unfiltered empty state to say `No deadlines yet. Import clients to
get started.` and kept the `Import clients` CTA. The filtered empty state still
uses `No obligations match these filters` because the table filters apply to
the underlying obligation rows.

## Design alignment

No `DESIGN.md` change is needed. This is a copy-only adjustment using existing
empty-state and button primitives.

## Verification

- `pnpm --filter @duedatehq/app exec tsc --noEmit`
- `pnpm exec vp check apps/app/src/routes/obligations.tsx docs/dev-log/2026-05-25-deadlines-empty-copy.md`
- live Chrome check on `http://localhost:5173/deadlines`
