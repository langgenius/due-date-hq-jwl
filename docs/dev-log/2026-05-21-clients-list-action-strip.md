---
title: 'Clients list: replace configuration metrics with an action strip'
date: 2026-05-21
author: 'Claude (Yuqi pairing)'
area: clients
---

# Clients list: replace configuration metrics with an action strip

## Context

The `/clients` list page opened with four equal-weight tiles —
**Ready for rules · Needs facts · Imported · States covered**. Run
through the "if this number is non-zero, would I click and act?" test,
only "Needs facts" earned its slot, and only during onboarding.

The other three were configuration metrics dressed up as a dashboard:

- _Ready for rules_ — celebrating the absence of a problem.
- _Imported_ — provenance trivia, stale within 24 hours of a Migration
  Copilot run.
- _States covered_ — a count without a CTA; nothing a CPA does with
  this number.

Meanwhile, the actual questions the list page is supposed to answer —
"who's at risk?", "who's been hit by a Pulse change?", "who's waiting
on me?" — went unsurfaced.

Spec: [docs/Design/clients-list-summary-strip-redesign.md](../Design/clients-list-summary-strip-redesign.md)

## Change

Four-tile read-out is gone. In its place:

```
⚠️ N clients are missing state or entity type — the rule library is skipping them. [Fix now]

[At risk · N]   [Waiting on client · N]   [Pulse hits · N]
```

Three small inline tiles, ordered by urgency, with the **Needs facts**
warning promoted to a one-row banner above when `N > 0`. The whole
strip is hidden when every signal is 0 — quiet is the reward.

### Behavior

- **At risk** — clients with ≥1 overdue obligation
  (`daysUntilDue < 0`). Tone: `destructive`. Click navigates to
  `/obligations?status=blocked` so the CPA lands on the actionable
  queue, not a filtered client list.
- **Waiting on client** — clients with ≥1 `waiting_on_client`
  obligation. Tone: `warning`. Click navigates to
  `/obligations?status=waiting_on_client`.
- **Pulse hits** — clients matched by a recent Pulse alert (data
  already on the route as `pulseMatchesByClient` / `affectedClientIds`).
  Tone: `review` (the same blue used everywhere Pulse appears).
  Click applies the existing `pulse=affected` filter on the current
  list — Pulse drill-in is about _which of my clients are touched_,
  so staying on the client list is right.
- **Needs facts banner** — renders only when `N > 0`. CTA navigates
  via the existing `readiness=needs_facts` filter. Not dismissible —
  it's the rule-library pipeline talking; the dismiss is filling in
  the missing facts.

## Files

**Mine on this branch (unstaged, ready to merge into preview-integration):**

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — deleted the
  `metrics` useMemo, the `ClientMetric` type, `metricToneClassName`, and
  `ClientMetricCard`. Added `ClientsActionStrip` + `ActionTile` co-located.
  Imports cleaned: `FileInputIcon`, `MapPinnedIcon`, `ComponentType`
  removed; `Alert`, `AlertDescription` added.
- `apps/app/src/features/clients/client-detail-model.ts` — extended
  `ClientObligationListSummary` with `overdueCount` and
  `waitingOnClientCount`. `buildClientObligationListSummaries`
  populates them in the same pass.
- `apps/app/src/features/clients/CreateClientDialog.tsx` — already in
  this branch from the manual-obligation-creation work; unchanged here.
- `apps/app/src/features/clients/ClientCombobox.tsx` — already in this
  branch (untracked); unchanged here.
- `apps/app/src/features/obligations/CreateObligationDialog.tsx` —
  already in this branch (untracked); unchanged here.

**Not mine — other session's WIP, leave alone for that session to land:**

- `.claude/launch.json`
- `apps/app/src/features/rules/rules-console-primitives.tsx`
- `apps/app/src/lib/use-current-user-name.ts`
- `apps/app/src/router.tsx`
- `apps/app/src/routes/rules.library.tsx`
- `apps/app/src/routes/rules.library-v2.tsx` (untracked)
- `docs/dev-log/2026-05-21-actions-row-no-reserved-slot-and-saved-views-retired.md` (untracked)
- `docs/dev-log/2026-05-21-obligations-projected-risk-column-removed.md` (untracked)
- `docs/dev-log/2026-05-21-obligations-queue-filter-bar-polish.md` (untracked)
- `docs/dev-log/2026-05-21-obligations-queue-filter-chip-x-and-state-backfill.md` (untracked)
- `docs/dev-log/2026-05-21-status-color-rework-and-1100-cap.md` (untracked)

## Trade-offs and what we didn't do

- **At risk excludes blocked rows** today. The `/clients` list route
  fetches obligations with `OPEN_OBLIGATION_STATUSES` =
  `['pending', 'in_progress', 'extended', 'waiting_on_client', 'review']`
  — `blocked` is not in that set, so blocked rows don't reach the
  client. To include blocked clients in the "At risk" count, add
  `blocked` to that array. Skipped here to keep the diff small;
  flagged in code via comment on `overdueCount`.
- **Tile click destinations are obligation-route deep links, not
  client-list filters.** A CPA glancing at "7 at risk" wants to see
  the rows, not just the affected clients. The obligations queue is
  the actionable surface. Pulse is the exception — it's client-level
  matching, so it stays on the client list.
- **No "Unassigned clients" tile.** Operational hygiene, not
  deadline-pressure. Should surface as a chip on the affected rows
  in the table body, not at the top.
- **No empty-state placeholder.** When every count is 0 the strip
  renders nothing. "Nice work — nothing to chase!" placeholders are
  noise.

## Verification

- `pnpm check`: my files report 0 errors / 0 warnings. The 9 errors
  and 17 warnings on the branch overall are in pre-existing files I
  didn't touch (rules library unused-vars, obligations type
  assertions). Filterable from full output by `grep client-` — no hits.
- Manual trace: confirmed `ClientsActionStrip` reads
  `factsModel.summary.needsFacts`, `obligationSummariesByClient`,
  `pulseMatchesByClient` — all already plumbed into
  `ClientFactsWorkspace` from `routes/clients.tsx`. No new ORPC
  calls. No new query-param wiring.
- E2E: no new spec yet. Would land in `e2e/tests/clients.spec.ts`
  with assertions on (a) banner visible when seeded fixture has
  needs-facts clients, (b) tiles hidden when fixture is quiet, (c)
  At-risk click lands on `/obligations?status=blocked`.

## Follow-up (not in this commit)

1. Decide whether to add `blocked` to `OPEN_OBLIGATION_STATUSES` so
   the "At risk" count is precise.
2. Consider a chip in table rows for unassigned clients.
3. If `pnpm check` is going to gate the merge, the pre-existing
   rules-library unused-vars need cleanup first (separate branch).
