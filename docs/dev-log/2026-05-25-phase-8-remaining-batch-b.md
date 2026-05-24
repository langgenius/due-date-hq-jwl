# 2026-05-25 — Phase 8 remaining batch B: Summary tab + Cluster C blocker doc

## Why

Closing the remaining open Yuqi review items. Two ship, two
deferred with concrete blockers.

## Shipped

### Deadlines #30 — Summary tab in obligation drawer

`packages/contracts/src/obligation-queue.ts`,
`apps/app/src/features/obligations/obligation-type.ts`,
`apps/app/src/routes/obligations.tsx`

Picked Reading A from the prior handoff doc (add Summary as a
labeled tab, snapshot block shrinks instead of duplicating). The
final shape:

- `ObligationQueueDetailTabSchema` enum gains `'summary'`.
- `TABS_BY_TYPE` adds Summary as the FIRST tab for filing /
  payment / deposit / information types. `client_action` +
  `internal_review` skip Summary (their milestone story is 1-2
  stages — not worth a dedicated tab).
- The drawer's sticky snapshot block, which previously hosted
  `PrimaryDeadlineStrip` + `PathToFilingSummary` +
  `ActiveStageDetailCard`, now hosts only `PrimaryDeadlineStrip`.
  The deadline trio (Internal / Filing / Payment) is always-
  visible context across every tab.
- `PathToFilingSummary` + `ActiveStageDetailCard` moved into
  `<TabsContent value="summary">`. They're the milestone story —
  visible by default (Summary opens first), hidden when the user
  steps to Materials / Extension / Evidence.
- `DETAIL_TABS` URL parser includes `summary` so `?tab=summary`
  is shareable.

Net effect: tighter drawer chrome, labeled home for the milestone
story, sharable URL state, and Materials / Extension / Evidence
tabs no longer have the stage card pushing their content below the
fold.

The 2026-05-21 "milestone chevron always visible" call is
reversed for this trade — Yuqi's #30 was explicit that the
milestone story needed its own surface, and CPAs viewing Materials
benefit from the stage card not dominating the scroll position.

### Other small polish

(none in this batch — focused on Summary tab + write-up of
remaining open items below)

## Deferred with concrete blockers

### Alerts #9 — US map / state filter

**Blocker found**: `PulseAlertPublic` (the list-item shape) does
NOT carry a `jurisdiction` field. The state code lives on
`PulseDetail.jurisdiction`, which only comes back from the
per-alert detail fetch (N+1 if used for list filtering).

To ship state filtering on the alerts list, we need:

1. **Contract change**: add `jurisdiction: StateCodeSchema` to
   `PulseAlertPublicSchema` in `packages/contracts/src/pulse.ts`.
2. **Server change**: update the `pulse.listHistory` resolver to
   include the jurisdiction in each alert row (the underlying
   data exists in the `pulse_alerts` table — just needs to be
   selected and returned).
3. **Client change** (the one this session can do): add a
   state-chip row above the existing dropdown filters; clicking
   a chip filters `filteredAlerts` by `alert.jurisdiction`.

Out of scope for a UI-polish session — touches the contracts +
server packages. Once the data is on the list, the client-side
filter is ~30 minutes.

The SVG map visualization is a separate polish round on top of
that (data first, viz second).

### Deadlines #6 — Multi-deadline grouping

**Scope**: collapse same-client rows in the queue into a single
expandable parent row. Half-day of work minimum:

- New data shape: server-side grouping or client-side group-by
  (clientId) reduction.
- TanStack Table grouped rows: enable `getGroupedRowModel`,
  configure `getGroupedRowKey`, render parent rows differently
  from leaf rows.
- Selection model: select-parent semantics (select all leaves vs
  select parent only).
- Bulk actions: how do they apply across a group?
- Visual design: expand chevron, parent-row count badge,
  indentation for leaves.

Deferred as a feature build. Worth doing when CPAs report the
"30 rows for the same client" pain point — until then, the queue's
client-name sort already clusters them visually.

## Verification

- `pnpm exec tsc --noEmit` (apps/app) clean
- `vp lint` 0/0 on all changed files

## Closes Yuqi review items

- Deadlines: **#30** (Summary tab) — shipped Reading A

## Remaining open (with concrete blockers)

- Alerts: **#9** (US map filter) — blocked on contract change to
  add jurisdiction to `PulseAlertPublic`
- Deadlines: **#6** (multi-deadline grouping) — feature build,
  not blocked; defer until prioritized

Yuqi review: **76 / 89** closed. The two remaining are now either
data-blocked or pending prioritization — no design ambiguity left
in the queue.
