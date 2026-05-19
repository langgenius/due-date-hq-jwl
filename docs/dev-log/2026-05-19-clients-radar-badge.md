---
title: 'Clients table — Radar badge, Next due, Open, Opportunities, Source/synced'
date: 2026-05-19
area: app
---

# Clients table — row enrichment

The Clients table at `/clients` did not surface Radar (Pulse) state alerts in
the list. A user could only see that a client was affected by drilling into the
detail panel, which made triage from the index page invisible. This adds an
inline Radar pill next to the client name and a Radar toolbar filter that lets
practitioners scope the list to alert-affected clients.

## Changes

- `apps/app/src/features/clients/client-detail-model.ts` — new
  `buildPulseMatchesByClient(details)` helper that groups active matches
  (`eligible`, `needs_review`) into a `Map<clientId, ClientPulseMatch[]>` for
  list-level rendering. Resolved/reverted matches are excluded.
- `apps/app/src/features/clients/client-readiness.ts` — `ClientFilters`
  gains `pulseFilters`. `filterClients()` accepts an optional context with
  `affectedClientIds: Set<string>` so the pure filter stays separate from the
  derived map. `CLIENT_PULSE_FILTERS`, `ClientPulseFilter`, and
  `isClientPulseFilter` mirror the existing readiness/source pattern.
- `apps/app/src/features/clients/client-query-state.ts` — adds a `pulse`
  URL parser and propagates it through `normalizeClientsQueryFilters`.
- `apps/app/src/routes/clients.tsx` — hydrates pulse data with
  `pulse.listHistory` (limit 50) and a fan-out of `pulse.getDetail` queries,
  building the per-client map once at the route level. New
  `handlePulseFilterChange` mirrors the other facet handlers, and
  `setClientsQuery` resets include `pulse: null` so the create/import flows
  clear the new filter alongside the existing ones.
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — accepts the new
  `pulseFilter`, `pulseMatchesByClient`, and `onPulseFilterChange` props.
  Adds a `Radar` `TableHeaderMultiFilter` to the existing toolbar (next to
  Client / Entity / State) with `Has Radar alert` and `No Radar alert`
  options and counts. Renders a new `ClientRadarBadge` (warning-tone) inline
  with the client name when matches exist. The badge shows the affected tax
  type for a single match, or `Radar · N` for multiple, with a tooltip and
  aria-label that list alert titles.
- Tests updated:
  - `client-readiness.test.ts`: pulseFilters added to existing cases plus
    new coverage for affected/clear filtering and the no-context fallback.
  - `client-detail-model.test.ts`: covers
    `buildPulseMatchesByClient` — active-status filtering and newest-first ordering.
  - `client-query-state.test.ts`: extended normalizer expectation.

## UI rationale

Decisions discussed before implementation:

- **Pill, not column**: Radar affects a minority of clients; a dedicated
  sparse column would be visually quiet exactly when it needs to be loud,
  while a flag chip beside the name draws the eye and groups with identity.
- **Filter as toolbar trigger**: matches the existing Client / Entity / State
  filter buttons above the table rather than introducing a new column header.
- **Active-status only**: `already_applied` and `reverted` matches are
  excluded so the badge means "this client has live work tied to a Radar
  alert" rather than "Radar has ever touched this client."

## Row enrichment (follow-up)

Same branch added the rest of the summary fields the index was missing:

- **Entity type moved into the Client name cell** as a sub-line, replacing
  the email (email lives in the detail panel; it never paid for its row
  real-estate). The dedicated `Entity` column was dropped — the toolbar
  Entity dropdown remains for filtering.
- **Next due** column: due date over tax type, derived from a single
  `obligations.list` call (status = open, sort `due_asc`, limit 100) and
  grouped client-side via `buildClientObligationListSummaries`.
- **Open** column: count of open obligations per client from the same call.
- **Opportunities** column: count badge with `SparklesIcon`, fed by a single
  `opportunities.list` query grouped via `buildOpportunityCountByClient`.
- **Source cell** now stacks the Imported/Manual badge with a `Synced …`
  sub-line for imported clients (uses `client.updatedAt` as a proxy for the
  true last-sync timestamp; see caveat below).
- **Updated column dropped** — `updatedAt` now surfaces through the Source
  cell where it's meaningful (sync provenance).

### Caveats

- `obligations.list` returns up to 100 open rows. For firms with more open
  obligations than that, late-due rows for some clients won't be reflected
  in the Next/Open columns. A `clients.workloadSummary` server aggregate is
  the right long-term fix.
- The "Synced" timestamp uses `client.updatedAt`. The true last-sync value
  lives on `MigrationExternalReference.lastSyncedAt` and would need a join
  or a new lightweight endpoint to expose. Acceptable as a polish proxy.
- "Number of filings" as a separate column was considered and rejected — it
  duplicates the Open obligations signal in this product's vocabulary.

## Validation

- `pnpm check`
- `pnpm --filter @duedatehq/app test -- --run` (40 files, 208 tests)
