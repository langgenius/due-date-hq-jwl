# Smart Priority tuner — sliders + KPI strip + driver preview (Pencil H1YSCd)

Date: 2026-06-07

The user approved the heaviest option for H1YSCd: build the Slider primitive,
add the contract field for the preview "Driver", and adopt the design.

## What shipped

### New `@ui` Slider primitive
`packages/ui/src/components/ui/slider.tsx` — single-thumb slider on Base UI.
Track + indicator reuse the Progress tokens (`bg-background-subtle` /
`bg-state-accent-solid`); thumb is a 16px white disc with a 2px accent ring.
Scalar `value`/`onValueChange` API (range/two-thumb intentionally not exposed).

### `topDriver` on Smart Priority preview rows
The scorer already computes per-factor `contribution`
(`SmartPriorityBreakdown.factors`). We now surface the dominant factor
(largest contribution) on each preview row so the table can show *why* a
deadline moved.
- `packages/contracts/src/firms.ts` — `topDriver: { factor, contribution } | null`
- `packages/ports/src/tenants.ts` — matching port type
- `packages/db/src/repo/firms.ts` — reduce over `smartPriority.factors`
- No DB migration (preview is computed, not stored).

### `/practice` Smart Priority redesign (`apps/app/src/routes/practice.tsx`)
- Factor weights moved from number inputs to **Sliders** (name + one-line hint
  + live value + 0–100 scale per row).
- **KPI strip** (responsive 1→3): Top-ranked clients / Avg score / Needs review.
  All three derive straight from the live preview rows — no extra round-trip.
- **Preview impact table** redesigned to the canvas columns: Deadline · Client /
  Current / New / Δ (up-green / down-red / no-change-grey) / **Driver** (factor
  label + tone-mapped hairline Progress bar) / "Why this rank?" deep-link.
- **Unsaved-changes footer** mirrors the canvas action bar: surfaces the reorder
  count and Revert / Save weights when the profile is dirty.

## Decisions / compromises
- Kept the page within the existing `/practice` settings card (the responsive,
  single-column form of the full-width canvas) rather than a brand-new
  full-width route — same components, lower risk, no routing/auth duplication.
- The urgency-window / late-filing-cap inputs (functional, validation-bearing)
  stay as number fields below the sliders; the canvas omits them but they're
  required by the profile.
- Driver bar tone maps factor → Progress tone (accent / warning / destructive).
  Progress ships no green, so `readiness` reuses accent (canvas green has no
  token equivalent).
- Verdant canvas theme not ported (mapped onto existing tokens).

## Verify
- `npx tsgo --noEmit -p apps/app` → 0 errors; ui/contracts/ports/db/server → 0
- contracts 29/29, db 140/140, server firms 7/7
- `npx vp check` → 0 errors
