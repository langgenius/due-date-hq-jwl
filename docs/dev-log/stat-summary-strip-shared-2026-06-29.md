# Extract shared StatSummaryStrip; /deadlines + /clients use it (sweep stopped at 2)

**Date:** 2026-06-29
**Files:**

- `apps/app/src/components/patterns/stat-band.tsx` (new `StatSummaryStrip` export)
- `apps/app/src/routes/obligations.tsx` (use shared strip)
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` (use shared strip)

## Why

After inlining the compact summary strip twice (/deadlines, /clients), the DRY-correct move was to
extract it. The intent was to then "finish the sweep" across the other StatBand surfaces.

## What changed

- **`StatSummaryStrip`** added beside `StatBand`, sharing `StatBandItem` — the compact one-line form
  of the same summary. Same per-stat interaction contract (`href` → `<Link>`, `onClick` → `<button>`,
  neither → static), same `valueClass` tone budget, plus `loading` + `bumpKey`. A band and a strip are
  now interchangeable per surface (band when the summary IS the headline; strip when a list/lane below
  carries the weight).
- `/deadlines` and `/clients` now render `<StatSummaryStrip>` instead of their inline copies.

## Why the sweep STOPPED at two surfaces

Audited the other six StatBand surfaces before converting and found their sub-captions carry **real
information**, not the filler that /deadlines and /clients had:

- **sources** — "Monitoring has not run in 24h", "N active · M paused"
- **audit log** — "filed or e-filed", "logins and exports", "amended with reason" (clarify each count)
- **jurisdiction rules** — "In force today", "Awaiting review", "Superseded"
- **rules library** — "oldest 3d ago", "Review these first", "N active · M jurisdictions"
- **members** — seat capacity ("N available"), "access revoked, history kept"
- **workload** — the only filler-sub surface ("Needs attention" / "Needs an owner" = tone only)

The one-line strip drops sub-captions by design, so converting these would lose information. The strip
is the right tool only where the summary is **redundant with a list/lane below AND the subs are
filler** — true for /deadlines and /clients, not the rest. Those keep `StatBand` (already tightened to
`py-4`). The shared component remains available if any of them later wants the compact form.

## Verification

Live-verified both strips render via the shared component (deadlines clickable, clients static);
`tsgo` clean; formatted.
