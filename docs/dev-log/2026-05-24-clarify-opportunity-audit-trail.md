---
title: 'Opportunity dismiss + snooze write audit-log entries (clarify)'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: opportunities
---

# Audit trail closes on opportunity dismiss / snooze (critique /polish)

## Why

Yesterday's `d5fb50ca` (dismiss/snooze model) shipped without
auditability — a user could silence an opportunity and there was no
on-the-wire record of who, when, or why. That's a gap against the
canonical product responsibility #6: _"Keep complete audit trail."_

Dismiss/snooze are user-driven mutations that hide product output
from the queue. A future reviewer has to be able to ask "why isn't
the Lakeview retention check-in on the queue anymore?" and get an
answer.

## What changed

### `apps/server/src/procedures/opportunities/index.ts`

Both `dismiss` and `snooze` handlers now write an audit event after
the dismissal-row upsert lands:

- `dismiss` writes `action='opportunity.dismissed'` with
  `after={ kind: 'dismissed', snoozeUntil: null }`.
- `snooze` writes `action='opportunity.snoozed'` with
  `after={ kind: 'snoozed', snoozeUntil: <ISO> }`.
- Both pass `entityType='opportunity'`,
  `entityId=opportunityKey` (the deterministic computed id), and
  forward the optional `reason` so the actor's own words land in
  the audit row.

### Audit-log labels — three places, one set of strings

Audit vocabulary in the UI lives in three coupled files (each layer
has its own list). All three updated:

- `apps/app/src/features/audit/audit-log-model.ts`:
  - `AUDIT_ACTION_LABEL_KEYS` gets `'opportunity.dismissed' →
'opportunityDismissed'` and `'opportunity.snoozed' →
'opportunitySnoozed'`.
  - `AuditEntityTypeLabels` gets an `opportunity: string` field.
  - `AUDIT_ENTITY_TYPE_LABEL_KEYS` maps `opportunity → opportunity`.
- `apps/app/src/features/audit/audit-log-labels.ts`:
  - `useAuditActionLabels` returns `Opportunity dismissed` and
    `Opportunity snoozed`.
  - `useAuditEntityTypeLabels` returns `Opportunity`.
- `apps/app/src/features/audit/audit-change-view.ts`:
  - Two new `AUDIT_CHANGE_PRESENTERS` entries pointing at
    `genericPresenter` — sufficient to render the after-JSON in a
    human-readable diff.
- `apps/app/src/features/audit/audit-log-model.test.ts`:
  - Test fixture for `formatAuditEntityTypeLabel` now includes
    `opportunity: 'Opportunity'` so the `satisfies` constraint
    holds.

The categorizer prefix table in `packages/db/src/repo/audit.ts`
isn't touched in this commit — `opportunity.*` actions land in
the "system" bucket for category filtering. Promoting to a
first-class category (`opportunity:` or folding into `client:`) is
a separate decision; the system bucket doesn't hide the row, it
just affects the Category filter dropdown.

## How to verify

`/opportunities` with the demo seed, then:

1. Click **Dismiss** on any row.
2. Navigate to `/audit`.
3. The most recent row reads:
   - Time: just now (firm TZ + UTC)
   - Actor: Sarah Martinez (or whichever role you're impersonating)
   - Action: **Opportunity dismissed**
   - Entity: **Opportunity** with the abbreviated opportunity key
   - Change: rendered from the `after` JSON
   - Detail: expandable chevron

Same shape for **Snooze** → action `Opportunity snoozed`.

## Out of scope

- A dedicated change-presenter that says "Marked dismissed by
  Sarah · waiting for review" instead of the generic "File kind
  changed from Not set to Dismissed." `genericPresenter` is
  intelligible; a richer presenter is a polish improvement that
  can wait until the audit-vocab pass reaches Opportunities.
- Promoting `opportunity.*` into the categorizer prefix table —
  separate decision; either gets its own category or folds into
  `client:` (since opportunities are computed from client state).

## Files touched

- M `apps/server/src/procedures/opportunities/index.ts`
- M `apps/app/src/features/audit/audit-log-model.ts`
- M `apps/app/src/features/audit/audit-log-labels.ts`
- M `apps/app/src/features/audit/audit-change-view.ts`
- M `apps/app/src/features/audit/audit-log-model.test.ts`
