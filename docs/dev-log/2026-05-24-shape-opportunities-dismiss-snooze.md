---
title: 'Opportunities dismiss + snooze model — schema, repo, contract, UI (shape)'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: opportunities
---

# Opportunities can now be dismissed / snoozed (critique P2 — shape)

## Why

`/critique` (commit `cfcdb7b0`+) personalized the opportunity
summary copy but left a real product gap: if a CPA judges an
opportunity not relevant, the row stays on the queue forever and
returns identical every list call.

Opportunities are **computed** from current client+obligation state
— there's no row to "mark resolved." The hide has to live in a
side channel: a small table the LIST handler joins against to
shadow computed results the user has chosen to silence.

This commit lays in that side channel end-to-end: schema, migration,
ports, repo, contract, server handler, UI buttons, toast wiring.

## What changed

### Schema + migration

- New `packages/db/src/schema/opportunities.ts` exporting
  `opportunityDismissal` (sqliteTable) plus the
  `OPPORTUNITY_DISMISSAL_KINDS = ['dismissed', 'snoozed']` const.
- New migration `packages/db/migrations/0053_opportunity_dismissal.sql`:
  - PK `id`
  - `firm_id` FK with `ON DELETE cascade`
  - `opportunity_key` (the computed opp's `id`)
  - `kind` (text enum)
  - `snooze_until` (timestamp_ms, nullable — null for dismissed)
  - `reason`, `created_by_user_id`, `created_at`
  - `UNIQUE (firm_id, opportunity_key)` is the upsert key
  - `INDEX (firm_id, snooze_until)` for fast listActive scans

### Ports + repo

- New port type `OpportunityDismissalsRepo` in
  `packages/ports/src/opportunities.ts` with
  `listActive(now)` and `upsert(...)`. Exported from
  `packages/ports/package.json`. Added optional
  `opportunityDismissals?: OpportunityDismissalsRepo` to the
  `ScopedRepo` interface (optional so legacy tests don't break).
- New repo in `packages/db/src/repo/opportunities.ts`:
  - `listActive(now)` returns dismissed-forever rows + still-
    snoozed rows. Expired snoozes are intentionally left in the
    table for audit but not returned.
  - `upsert(...)` uses Drizzle `onConflictDoUpdate` against the
    UNIQUE index, so repeated dismiss/snooze calls overwrite.
- Wired into `packages/db/src/scoped.ts` and exported from
  `packages/db/src/index.ts`.

### Contract

- `packages/contracts/src/opportunities.ts` adds:
  - `OpportunityDismissInputSchema { opportunityKey, reason? }`
  - `OpportunitySnoozeInputSchema { opportunityKey, until, reason? }`
  - `OpportunityMutationOutputSchema { opportunityKey, kind,
snoozeUntil }`
  - `opportunitiesContract` grows `dismiss` + `snooze` mutations.
- `packages/contracts/src/contracts.test.ts` freezes the new
  contract shape (`opportunitiesContract` keys `['list', 'dismiss',
'snooze']`).

### Server handler

- `apps/server/src/procedures/opportunities/index.ts`:
  - `list` now pulls active dismissals and filters the computed
    output against them BEFORE returning. Summary counts agree
    with the visible queue.
  - New `dismiss` handler: upsert with `kind='dismissed'`,
    `snoozeUntil=null`.
  - New `snooze` handler: clamps the requested `until` to the
    range `[now+60s, now+90d]` (90-day ceiling stops typos parking
    a row in 2199).
- `apps/server/src/procedures/index.ts` registers both mutations.

### UI

- `apps/app/src/features/opportunities/opportunities-page.tsx`
  `OpportunityRow` grows two new ghost-buttons: **Snooze**
  (ClockIcon) and **Dismiss** (XIcon), next to **Open client**.
  - Default snooze window: **14 days** (`DEFAULT_SNOOZE_DAYS`).
    Picks a 2-week interval — long enough for client circumstances
    to actually shift, short enough to keep the queue alive.
  - Both call into the new mutations via the existing oRPC client.
  - On success: invalidate `opportunities.list` (re-fetches and
    re-renders without the dismissed row) + a Sonner toast.
  - Both buttons disable while either mutation is pending.
  - aria-labels carry the full action + opportunity title.

## How to verify

Manual:

1. `pnpm db:migrate:local` to apply `0053_opportunity_dismissal.sql`.
2. `/opportunities` — every row now shows `Snooze · Dismiss · Open
client`.
3. Click **Dismiss** on any row → toast `Opportunity dismissed.`,
   the row vanishes, the summary tile count drops by one.
4. Refresh / navigate away and back → the dismissed row stays
   gone (persisted server-side).
5. Click **Snooze** on another row → toast `Snoozed for 14 days.`
   The row disappears for 14 days, then reappears.

Verified live against the demo seed: Lakeview's
"Relationship check-in candidate" row dismissed; **Retention
check-ins** summary tile dropped from `2` to `1`; list reloaded
without Lakeview's row.

Tests:

- `pnpm check` clean.
- `pnpm test` clean across all workspaces (293 → 293 still passes
  after the contracts freeze got the additional mutation names).

## What was deliberately not added

- **Un-dismiss UI.** No "see dismissed opportunities" surface yet.
  Could grow into a Settings → Opportunities → Recently dismissed
  list later; for now a dismiss can be reversed at the DB level if
  a firm asks support. The 90-day snooze cap and the deterministic
  `opportunityKey` (which contains the clientId + kind) mean a
  re-computed opportunity for the SAME client + kind would still
  be dismissed; if the client's signals shift enough to produce a
  different kind, that one would show.
- **Audit log entry on dismiss.** Worth adding next to the
  existing audit-event vocabulary so a reviewer can trace why an
  opportunity stopped appearing for a firm. Deferred — out of
  scope for this commit.
- **Per-user vs per-firm dismissals.** Today dismiss is
  per-firm (the entire team stops seeing it). Per-user would mean
  scoping by `created_by_user_id`. Defer until somebody asks.

## Files touched

- A `packages/db/migrations/0053_opportunity_dismissal.sql`
- A `packages/db/src/schema/opportunities.ts`
- A `packages/db/src/repo/opportunities.ts`
- A `packages/ports/src/opportunities.ts`
- M `packages/ports/package.json` (added subpath export)
- M `packages/ports/src/scoped.ts` (added optional repo)
- M `packages/db/src/client.ts` (schema import)
- M `packages/db/src/index.ts` (barrel)
- M `packages/db/src/scoped.ts` (factory wiring)
- M `packages/contracts/src/opportunities.ts`
- M `packages/contracts/src/contracts.test.ts`
- M `apps/server/src/procedures/opportunities/index.ts`
- M `apps/server/src/procedures/index.ts`
- M `apps/app/src/features/opportunities/opportunities-page.tsx`
