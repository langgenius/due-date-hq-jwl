---
title: '2026-06-01 · Firm registration catch-up to the active alert landscape'
date: 2026-06-01
author: 'Claude'
---

# Firm registration catch-up to the active alert landscape

## Why

The firm-wide alert model (see `2026-05-29-pulse-firm-wide-alert-visibility`) fans a
`pulse_firm_alert` row out to **every active firm** the moment a Pulse is approved
(`refreshFirmAlertsForPulse`). That fan-out only reaches firms that **exist at approval
time**. A practice that registers later starts life blind to every policy change approved
before it joined — including changes that are still in force today (a 2024 relief order
whose deadline is still in the future, an indefinite rate change, etc.). The firm sees a
clean slate that isn't actually clean.

The question we set out to answer: when a new practice registers, what should happen to
the regulatory changes published before it existed? The chosen design (of the options
weighed) was **relevance-windowed catch-up, materialized at registration** — not a
full-history replay, and not nothing.

## What changed

- **`backfillFirmAlertsForActiveLandscape(firmId, now)`** — new method on the pulse-ops
  repo (`packages/db/src/repo/pulse/ops.ts`). Selects the _currently-actionable_ Pulses
  and materializes a firm-wide alert row for each, for the one firm passed in. It is the
  "arrive late" mirror of `refreshFirmAlertsForPulse`'s "fan out now".
- **Trigger in `afterCreateOrganization`** (`apps/server/src/organization-hooks.ts`),
  immediately after the `firm_profile` insert, best-effort.

## Design decisions (the parts worth remembering)

### Relevance = approved AND not expired — _not_ gated by registration date

```
status = 'approved'
AND (parsed_new_due_date     IS NULL OR parsed_new_due_date     >= now)   -- deadline not passed
AND (parsed_effective_until  IS NULL OR parsed_effective_until  >= now)   -- window not ended
```

The instinct is to gate by the firm's `monitoringStartDate` (only catch up on changes
after it registered). That is **wrong** for alerts: a policy that took effect in 2024 and
is still in force is genuinely relevant to a firm onboarding in 2026. The right axis is
_"is this change still live?"_, i.e. not expired — the deadline hasn't passed and the
effective window hasn't closed.

`monitoringStartDate` deliberately stays out of this query. It gates **obligation
generation**, not alert visibility (see `2026-05-29-practice-monitoring-start-date`). Its
effect on the firm still shows up — but _indirectly_, through the obligations the alert's
later matching will (or won't) generate, not by hiding the alert itself.

### `matchedCount` starts at 0

A brand-new firm has no clients/obligations yet, so a fresh catch-up alert matches
nothing — `matchedCount = 0`. This is the **same point-in-time semantics the live fan-out
already has**: when a Pulse is approved, each firm's count is computed against its
obligations _at that instant_ and is not recomputed when the firm later adds a client.
Firm-wide visibility surfaces the change regardless of count, so a 0-count alert is still
seen; it just renders as `no_current_match` until the CPA acts (consistent with the
firm-wide-visibility log).

### Trigger lives in the org-creation hook, not the firms procedure

The natural-looking place — the firms registration procedure — **cannot** do this. The
dep-direction DAG and the `no-restricted-imports` lint forbid procedures from importing
`@duedatehq/db` (procedures must go through `context.vars.scoped`). The first attempt hit
exactly that lint wall. `afterCreateOrganization` is the infra-layer hook that already
builds `firm_profile` and legitimately holds a `Db` — the correct home.

It runs **best-effort** (try / catch / swallow-and-log), matching the `firm_profile`
insert's own failure semantics directly above it: better-auth does not roll back the org
row on a hook throw, and `tenantMiddleware` lazily heals a missing `firm_profile` on the
next request — so a catch-up failure must never block registration. Worst case, a firm
registers without the backfill; nothing downstream breaks.

### Idempotent and bounded

- `onConflictDoNothing({ target: [firmId, pulseId] })` — re-running never clobbers an
  existing alert's real count, so the call is safe to retry.
- The extract-time **pre-2026 date floor** (`a8ac2e21`) already strips the historical
  backlog before anything is approved, so the candidate set is the _live_ landscape (~91
  rows at writing), not all of history. No second flood risk.

## Known limitation / phase 2

Caught-up alerts keep `matchedCount = 0` even after the firm later adds the clients those
changes would have matched. This is **not new** — it is the existing point-in-time
limitation of the whole firm-alert model (live alerts don't recount either). The proper
fix would be a phase-2 "recompute this firm's alert counts when it gains an obligation",
which would correct both the caught-up rows and the live ones at once. Out of scope here.

## Validation

- `packages/db/src/repo/pulse.test.ts` — 2 new tests (materializes the not-expired
  landscape with the right row shape + chunked batch; empty landscape returns 0 and writes
  nothing). 38 pass.
- `apps/server` org-hooks + firms suites green.
- Committed `6fc74a54`, deployed to staging — version `03a0e3e9`.

## Touched files

- `packages/db/src/repo/pulse/ops.ts` — `backfillFirmAlertsForActiveLandscape`.
- `apps/server/src/organization-hooks.ts` — best-effort call in `afterCreateOrganization`.
- `packages/db/src/repo/pulse.test.ts` — 2 tests.
