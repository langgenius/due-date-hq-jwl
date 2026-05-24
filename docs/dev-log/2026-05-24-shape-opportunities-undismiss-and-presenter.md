---
title: 'Opportunities un-dismiss UI + readable audit presenter (shape)'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: opportunities
---

# Restore + dedicated audit presenter (critique /polish)

## Why

`d5fb50ca` shipped Dismiss/Snooze; `8ebb9c3a` plumbed audit-log
entries. But two gaps remained:

1. **No un-dismiss.** A CPA who misclicked Dismiss had no UI path
   to recover — the row was gone from their perspective forever.
   Recovery required asking support to delete the
   `opportunity_dismissal` row directly.
2. **Generic audit presenter.** The audit log rendered the dismiss
   event as "File kind changed from Not set to Dismissed" —
   technically accurate but nonsense to a reviewer who just wants
   to read "Opportunity dismissed."

This commit closes both loops in one cohesive change.

## What changed

### Restore mutation (server)

`packages/db/src/repo/opportunities.ts` grows `delete(opportunityKey)`
returning `boolean` — true when a row was removed, false when no
row matched (idempotent — restore-on-already-restored is fine).
Also adds `listActiveDetailed(now)` that LEFT JOINs `user` so the
UI can render "Dismissed by Sarah" without a second round-trip.

`packages/ports/src/opportunities.ts` exposes the new methods on
`OpportunityDismissalsRepo`.

`apps/server/src/procedures/opportunities/index.ts`:

- New `restore` handler: deletes the dismissal row; writes
  `opportunity.restored` audit event when something was actually
  removed (no audit row for a no-op restore).
- New `listDismissed` handler: returns the active dismissal set
  with actor names attached.

`packages/contracts/src/opportunities.ts`:

- `OpportunityRestoreInputSchema { opportunityKey }`
- `OpportunityRestoreOutputSchema { opportunityKey, restored:
boolean }`
- `OpportunityDismissalRowSchema` (the row shape returned by
  `listDismissed`)
- `OpportunityListDismissedOutputSchema { dismissals: [...] }`
- `opportunitiesContract` grows `restore` + `listDismissed`.

`packages/contracts/src/index.ts` re-exports the new types +
schemas.

`packages/contracts/src/contracts.test.ts` updates the freeze to
include the two new procedure keys.

### Un-dismiss UI

`apps/app/src/features/opportunities/opportunities-page.tsx`:

- New `<DismissedOpportunitiesSection>` rendered at the bottom of
  the Opportunities page. Hidden entirely when there are no
  dismissals.
- Collapsed by default so it doesn't compete with the live queue
  above. Header row: chevron + "Recently dismissed (N)" + a quiet
  hint "Restore brings the row back to the queue".
- Each row inside renders the humanized kind ("Retention check
  in", "Scope review", "Advisory conversation"), the snooze /
  dismiss state ("Snoozed until 2026-06-07" / "Dismissed"), and
  the actor name when present.
- `<RotateCcwIcon> Restore` button per row → calls
  `opportunities.restore` mutation → invalidates both
  `opportunities.list` AND `opportunities.listDismissed` so the
  row leaves the dismissed list AND reappears in the live queue
  (if the computer still produces it).
- Idempotency: server returns `restored: false` when the row was
  already gone; UI shows a "Already restored" info toast instead
  of "Opportunity restored." for that case.

### Audit presenter

`apps/app/src/features/audit/audit-change-view.ts`:

- New `opportunityDismissedPresenter` / `opportunityRestoredPresenter` /
  `opportunitySnoozedPresenter`.
- All three lean on the action label for the headline ("Opportunity
  dismissed" / "Opportunity restored" / "Opportunity snoozed").
- The snoozed presenter adds a single detail row reading "Snoozed
  until {date}" when the after-JSON carries `snoozeUntil`. Falls
  back to label-only otherwise.
- Wired into `AUDIT_CHANGE_PRESENTERS` for all three action keys.

`apps/app/src/features/audit/audit-log-model.ts`:

- `'opportunity.restored' → 'opportunityRestored'` added to the
  action-key map.

`apps/app/src/features/audit/audit-log-labels.ts`:

- `opportunityRestored: t\`Opportunity restored\`` added.

## How to verify

`/opportunities`:

1. **Dismiss** any row → toast confirms; the row vanishes from the
   live queue. Scroll down: a new **Recently dismissed (1)**
   disclosure appears at the bottom of the page.
2. Click the disclosure → it expands, showing the dismissed kind
   (humanized) + "Dismissed" + actor name + **Restore** button.
3. Click **Restore** → row vanishes from the dismissed list AND
   reappears in the live queue above. Toast: _Opportunity restored._
4. Snooze a different row → similar flow, but the disclosure line
   reads "Snoozed until {date}".

`/audit`:

1. Each dismiss/restore/snooze writes one audit row.
2. The CHANGE column now reads "Opportunity dismissed" /
   "Opportunity restored" / "Opportunity snoozed" instead of
   the previous "File kind changed from Not set to Dismissed."
3. Snoozed rows additionally render a "Snoozed until {date}"
   detail.

Tests:

- `pnpm check`: clean (1378 files formatted, 654 lint+type clean).
- `pnpm test`: clean across all workspaces. The contract-freeze
  test in `packages/contracts/src/contracts.test.ts` was updated
  to include `restore` + `listDismissed` in the expected key
  list.

## What was deliberately not added

- **Custom client-name resolution in the dismissed list.** The
  dismissed row currently shows the humanized kind only ("Retention
  Check In"). The opportunityKey carries the clientId; we could
  hit `clients.findManyByIds` to surface "Retention check-in ·
  Lakeview Medical Partners". Defer until product asks — the
  kind alone is usually enough context for a CPA to remember why
  they dismissed it.
- **Pagination on the dismissed list.** Hard cap is whatever
  the firm has dismissed; expected to stay small. Add when the
  list grows past ~50 rows in real-world use.
- **Per-row audit-trail link** from the dismissed list to the
  corresponding audit row. Could wire to `/audit?entityId={key}`.
  Defer until a CPA actually asks.

## Files touched

- M `packages/contracts/src/opportunities.ts`
- M `packages/contracts/src/index.ts`
- M `packages/contracts/src/contracts.test.ts`
- M `packages/ports/src/opportunities.ts`
- M `packages/db/src/repo/opportunities.ts`
- M `apps/server/src/procedures/opportunities/index.ts`
- M `apps/server/src/procedures/index.ts`
- M `apps/app/src/features/opportunities/opportunities-page.tsx`
- M `apps/app/src/features/audit/audit-change-view.ts`
- M `apps/app/src/features/audit/audit-log-model.ts`
- M `apps/app/src/features/audit/audit-log-labels.ts`
