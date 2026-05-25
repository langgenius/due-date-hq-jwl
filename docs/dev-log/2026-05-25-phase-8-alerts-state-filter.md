# 2026-05-25 — Phase 8: Alerts #9 — state filter chip strip

## Why

Yuqi #9 asked for a US map filter on the alerts list. The prior
batch identified the blocker: `PulseAlertPublic` (the list-item
shape) didn't carry `jurisdiction` — only `PulseDetail` did, so
list-level filtering by state required an N+1 detail fetch.

This commit unblocks it end-to-end: contract → ports → repo →
server resolver → client. v1 ships as a state chip strip; the
full SVG US map is a follow-on polish on top of the same data
shape.

## Shipped

### Contract: `jurisdiction` on `PulseAlertPublic`

`packages/contracts/src/pulse.ts`

Added `jurisdiction: StateCodeSchema` to
`PulseAlertPublicSchema`. The value mirrors
`PulseDetail.jurisdiction` — same underlying
`pulse.parsedJurisdiction` column on the DB. Marked required
because the ingest pipeline rejects rows without a parsed
jurisdiction (no nullability needed).

### Ports + repo: passthrough the existing column

`packages/ports/src/pulse.ts`,
`packages/db/src/repo/pulse.ts`

Added `jurisdiction: string` to `PulseAlertRow` in both ports
and the DB repo. The `toAlert` mapper picks the value from
`row.parsedJurisdiction` — which was already being SELECTed via
the existing pulse-join in `loadAlertJoined`. So no schema
migration, no new queries — purely a passthrough.

### Server resolver

`apps/server/src/procedures/pulse/index.ts`

Updated `toAlertPublic` to pass `row.jurisdiction` through. The
local `PulseAlertRow` interface (a structural twin of the repo
type — separate by history, not by intent) also gained the
field. `listAlerts` + `listHistory` automatically pick it up via
`alerts.map(toAlertPublic)`.

### Client: state filter + chip strip

`apps/app/src/features/pulse/AlertsListPage.tsx`

- New `jurisdictionFilter: string | null` state (null = no filter).
- `jurisdictionCounts: Array<[state, count]>` memoized over the
  unfiltered alerts. Sorted by count desc → state asc so the
  highest-impact jurisdictions float to the front. Zero-count
  states are implicitly excluded (only states with alerts appear).
- New chip strip above the existing dropdown filter row. One chip
  per state, label = state code (e.g. "CA"), count badge to the
  right. Active state = filled accent style; inactive = neutral
  outline. Clicking toggles single-state focus; clicking the
  active chip clears it.
- `filteredAlerts` predicate now also gates on
  `alert.jurisdiction === jurisdictionFilter` when active.
- `filtersActive` and the Reset button now include
  `jurisdictionFilter`.

### Test fixtures

Added `jurisdiction` to four fixture files so the new required
field is populated everywhere `PulseAlertPublic` is constructed
in tests:

- `apps/app/src/features/pulse/__dev__/mock-pulse.ts` — four
  mock alerts (MATCHED 'CA', APPLIED 'CA', DISMISSED 'NY',
  VERY_LOW 'FL'). Values match the matching `*_DETAIL.jurisdiction`.
- `apps/app/src/features/clients/client-detail-model.test.ts`
  — pulseDetail fixture builder.
- `apps/app/src/features/pulse/lib/impact-filter.test.ts` —
  alert() factory.
- `apps/app/src/features/pulse/lib/revert-window.test.ts` —
  makeAlert() factory.

## What's NOT in this commit (deferred)

### Full SVG US map

The chip strip is the functional v1. A choropleth or click-on-
state US map could replace it as a follow-on polish round:

- Component: lift the chip strip into a `<UsStateFilter>` that
  renders either the chip variant (compact, narrow viewports)
  or an SVG map (wide viewports). Same data input
  (`jurisdictionCounts`), same selection callback.
- SVG paths: either hand-trace 50 states + DC, or add a small
  permissively-licensed map library (`react-simple-maps` or
  similar — ~30KB).
- Interaction: hover = tooltip (state name + count), click =
  toggle filter, keyboard tab = land on each state, Enter =
  select.

Out of scope for this commit because the chip strip already
delivers the filter functionality. Layer the map visualization
on top when prioritized.

## Verification

- `pnpm exec tsc --noEmit` (workspace) clean (modulo pre-existing
  Cloudflare Workers types in `apps/server/src/env.ts`)
- `vp lint` 0/0 on all changed files (contracts, ports, db,
  server, client)

## Closes Yuqi review items

- Alerts: **#9** (US map filter — shipped as chip strip v1; SVG
  map deferred as polish follow-on)

Yuqi review: **77 / 89** closed. Remaining: Deadlines #6
(multi-deadline grouping — feature build).
