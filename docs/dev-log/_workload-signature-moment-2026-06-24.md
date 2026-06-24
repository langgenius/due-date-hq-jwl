# Workload: busiest-owner hero + honest load spine + StatBand cohesion

**Date:** 2026-06-24  
**Files:** `apps/app/src/features/workload/workload-page.tsx`  
**stat-band.tsx:** NOT modified — no new variant needed.

## What changed

### 1. Busiest-owner hero (`ManagerInsights`)
`capacityOwnerLabel / capacityOpen / capacityLoadScore` were buried in one of four identical bordered tiles. Promoted to a dominant named card at the top of the Manager operations section:

- `AssigneeAvatar` (size `lg`) — deterministic per-name tint via `getAssigneeTint`; resolves `assigneeName` from the matching `WorkloadOwnerRow` so the avatar colour is stable across the surface
- Owner name at `font-medium` (key-data weight per canon)
- Open count in secondary caption weight
- `Progress` bar at the real `capacityLoadScore` % — same busiest-anchored metric as the table "Relative load" column; no invented chart
- Calm warm-well `bg-background-subtle` container, `rounded-xl` per radius scale, no shadow

When `capacityOwnerLabel` is null (no assigned work in window): calm tertiary prose, no empty card chrome.

### 2. Supporting metrics via `StatBand`
The three remaining manager signals (unassigned risk / waiting / review) were hand-rolled `ManagerInsightMetric` bordered tiles — a local duplicate of the StatBand pattern. Replaced with a direct `StatBand` render inside the card. The band's `border-y` hairlines give clean separation without boxing each metric separately. `ManagerInsightMetric` function deleted entirely. `CapsFieldLabel` and `ReactNode` imports removed (no longer used).

**`stat-band.tsx` is unchanged** — no layout variant needed; the existing horizontal StatBand already fits three columns inside a card cleanly.

### 3. Honest load spine (table)
- `UserRoundIcon` replaced with `AssigneeAvatar size="sm"` per column — human rows get deterministic per-name tint; unassigned row gets the `type="unassigned"` glyph (null name auto-routes there)
- Top assigned row (the `loadScore === 100` anchor) gets `bg-background-subtle` row wash — the load spine is now visually top-heavy at a glance, matching the relative-load bars
- Unassigned row gets `opacity-75` — signals it's a risk bucket, not a person; the `Badge` + "Risk" label already distinguish it at column level

### 4. No fiction
All data used: `capacityOwnerLabel`, `capacityOpen`, `capacityLoadScore`, `unassignedOpen`, `waitingOpen`, `reviewOpen` — all real fields from `WorkloadManagerInsightsSchema`. `assigneeName` resolved from `WorkloadOwnerRow` (already on the page). No projected ETAs, no capacity %, no sparklines.

## Type check
`pnpm -F @duedatehq/app exec tsgo --noEmit` → zero errors.
