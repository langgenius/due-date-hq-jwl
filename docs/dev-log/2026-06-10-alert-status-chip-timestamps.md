# Alert status chip — lifecycle timestamps (handoff Phase 1.2)

**Date:** 2026-06-10
**Design source:** `docs/dev-log/2026-06-10-design-handoff-index.md` (Phase 1.2 — contract
migration; §C status-chip "Dismissed · Mar 5" / "Applied · Mar 4")

## Goal

The alert status chip always showed `publishedAt` ("· 2h"), regardless of status.
The design wants the chip to show **when the alert reached its current state**:
"Dismissed · Mar 5", "Applied · Mar 4", while awaiting still shows the wait time.
That needed `dismissedAt` + `appliedAt` exposed on the public alert.

## No DB migration — the data already exists

- `dismissedAt` / `dismissedBy` are already columns on `pulseFirmAlert`, written by
  the `dismiss` handler.
- `appliedAt` lives on `pulseApplication` (keyed by `pulseId` + `firmId`) — the
  earliest non-reverted application is "when the alert was applied".

So this is purely contract + mapper plumbing across the ports/adapters layers.

## Change (the full chain — alert row is a structural twin in 3 places)

- **`packages/ports/src/pulse.ts`** `PulseAlertRow` — added `dismissedAt: Date | null`
  - `appliedAt: Date | null` (the canonical boundary type).
- **`packages/db/src/repo/pulse/shared.ts`** — `AlertJoinedRow` gets optional
  `dismissedAt?: Date | null` + `appliedAt?: number | null` (only the detail query
  selects them; list producers omit them). `PulseAlertRow` gets the fields.
  `toAlert` maps them (appliedAt epoch-ms → Date). New `firstAppliedAtForPulse(firmId)`
  aggregation subquery (mirrors `duplicateSourceSnapshotCountForPulse`).
- **`packages/db/src/repo/pulse/scoped.ts`** `getAlert` select — adds
  `dismissedAt: pulseFirmAlert.dismissedAt` + `appliedAt: firstAppliedAtForPulse(firmId)`.
- **`apps/server/.../pulse/index.ts`** — local `PulseAlertRow` twin gets the fields;
  `toAlertPublic` serializes them to ISO (like `publishedAt`).
- **`packages/contracts/src/pulse.ts`** `PulseAlertPublicSchema` — adds
  `dismissedAt: z.iso.datetime().nullable()` + `appliedAt: z.iso.datetime().nullable()`.
- **`AlertDetailDrawer.tsx`** chip — timestamp is now status-aware: `dismissed` →
  `formatDate(dismissedAt)`, `applied` → `formatDate(appliedAt)`, else
  `formatRelativeTime(publishedAt)`.
- Updated all `PulseAlertPublic` literal construction sites (8 test fixtures + the
  `preview.tsx` mock) to include the two fields.

## Verification

`tsgo` clean across **all five packages** (ports · db · contracts · server · app) —
the cross-package type chain is consistent and every fixture compiles.

**Visual check pending:** the dev preview was down at commit time (a concurrent
in-progress edit, `DeadlineRow.tsx`, throws on an undefined `readiness` and blanks
the app — not part of this change). Once that's fixed, confirm a resolved alert's
chip reads "Dismissed · {date}" / "Applied · {date}". The `appliedAt` aggregation
mirrors the existing `duplicateSourceSnapshotCountForPulse` subquery, so SQL risk
is low; the dismiss mutation (which writes `dismissedAt`) was verified working in
the prior slice.
