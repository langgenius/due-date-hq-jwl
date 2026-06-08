# 2026-06-08 — /deadlines EXPOSURE column (design parity)

## What

Restored the per-row **EXPOSURE** column on `/deadlines` to match the production
design: a headline estimated-$ exposure with the accrued-penalty figure as a
subline (e.g. `$4,210` / `≈$2,400 penalty`). Sits between ASSIGNEE/OFFICIAL DUE
and STATUS, right-aligned. Null exposure → em-dash.

## Why

Per the design-supersedes decision (Yuqi, 2026-06-08): the production design
carries a per-row exposure number. This intentionally reverses the 2026-05-21
"remove per-row $ from the queue" call. Priority + Evidence stay hidden opt-in
columns (unchanged); only exposure comes back.

## How (data was already there — just un-threaded)

- `packages/contracts/src/obligation-queue.ts` — un-omit `estimatedExposureCents`
  from `ObligationQueueRowSchema` (kept `exposureStatus` / `exposureCalculatedAt`
  omitted — the queue only needs the headline number).
- `apps/server/src/procedures/obligation-queue/index.ts` — add
  `estimatedExposureCents` to the `RawRow` interface + map it in `toRow`,
  respecting `hideDollars` (coordinators without dollar visibility get `null`).
  The repo (`packages/db/src/repo/obligation-queue.ts`) already selected the
  column, and the demo seed already populates it for some rows.
- `apps/app/src/routes/obligations.tsx` — new `estimatedExposureCents` column;
  added to `DEFAULT_COLUMN_ORDER` before `status` (visible by default). Penalty
  subline reuses the already-present `accruedPenaltyCents`. Currency via the
  existing `formatCents` helper.

## Verification

- `pnpm check` — 0 errors, 47 (pre-existing) warnings, 827 files.
- Visual: verified in an isolated worktree preview (server :8788 with copied
  seeded D1 + secrets; app :5183 proxied to :8788). `/deadlines` renders the
  new right-aligned EXPOSURE column — `$2,400` on Riverside Sole Prop, `—`
  where the seed has no exposure; Columns toggle now reads "8 of 11 visible".

## Notes / follow-ups

- Working in worktree `design/deadlines-design-parity` (off main @ 91055bc6),
  isolated from the concurrent alerts/rules edits in the main worktree.
- Still open this branch: re-add Group-by Urgency (UI-only); then visual pass.
