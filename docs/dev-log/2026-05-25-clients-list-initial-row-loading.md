# 2026-05-25 — Clients list initial row loading stability

## Why

Yuqi flagged that client rows looked like they briefly widened when entering
`/clients`. The row measurements showed the fixed table columns were stable
once the table appeared, but the page could render real client rows before the
row-level derived data was ready. In that intermediate state, `Next due`,
`Open`, `Done`, and `Opp.` showed empty fallback values, then filled in as
obligations, opportunities, and Pulse queries resolved.

## Shipped

- The Clients workspace now stays in first-load state until the client list and
  the row-affecting derived queries have initial data.
- The summary strip no longer flashes zero metric tiles while those same row
  inputs are still loading.
- The client table skeleton now uses the same fixed table column widths as the
  final table instead of five full-width bars, so the loading-to-data transition
  preserves the table footprint.

## Files touched

- `apps/app/src/routes/clients.tsx`
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`

## Verification

- Reproduced the issue with Playwright by delaying `obligations.list`,
  `opportunities.list`, and Pulse history: before the fix, `Pacific Trust`
  rendered with `Next due = —`, `Open = 0`, `Done = 0`, `Opp. = —` before
  updating to the real row data.
- After the fix, the same delayed-query run keeps the fixed-width table skeleton
  visible until the derived row data is ready.
