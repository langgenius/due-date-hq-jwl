---
title: 'Manual obligation creation: + Add obligation on Today and Client pages'
date: 2026-05-21
author: 'Claude (Yuqi pairing)'
area: obligations
---

# Manual obligation creation: + Add obligation on Today and Client pages

## Context

Per the 2026-05-21 product review, the rule library generates the vast
majority of obligations automatically, but a meaningful tail still needs
hand entry — K-1 dependencies and other rows whose source isn't a state
or federal rule. There was no manual creation entry point anywhere in
the app today; users had to lean on the migration import flow even for
a single row, which is a clumsy fit.

The meeting also flagged that the old structured K-1 dropdown (the
`blockedBy` picker in the obligation drawer) can't store partner names
or other free-form context. The decision: drop the picker as a default
affordance and capture that context as free-form text in an "internal
notes" textarea — partner names belong in prose, not in a foreign-key
column to another obligation row.

## Change

Three pieces ship together:

### 1. `ClientCombobox` ([apps/app/src/features/clients/ClientCombobox.tsx](apps/app/src/features/clients/ClientCombobox.tsx))

Standalone client picker (Popover + Command primitives, modeled after
`FirmTimezoneSelect`). Searches by client name, state, or EIN. The
"create new client" branch is intentionally _not_ inside the popover —
nesting a Dialog inside a Popover causes focus and z-index fights.
Callers render a controlled `CreateClientDialog` alongside, and the
combobox accepts the newly-created id back via `value`.

### 2. `CreateObligationDialog` ([apps/app/src/features/obligations/CreateObligationDialog.tsx](apps/app/src/features/obligations/CreateObligationDialog.tsx))

Form-backed Dialog wrapping `orpc.obligations.createBatch`. Required
fields are the lean trio from `ObligationCreateInputSchema`: `clientId`,
`taxType`, `baseDueDate`, plus an opt-in starting status. A
"Don't see your client? Create one" link below the combobox toggles
`CreateClientDialog` controlled-open, and on success the new client's
id flows back into the combobox automatically.

Two callers, two modes:

- **Today / Dashboard** — `<CreateObligationDialog />` with no
  `defaultClientId`. Combobox is editable, "Create new client" is
  visible.
- **Client detail** — `<CreateObligationDialog defaultClientId={client.id} />`.
  Combobox is locked, "Create new client" hidden; a "Locked to this
  client because you opened from their page" hint explains why.

### 3. `CreateClientDialog` controlled-open refactor ([apps/app/src/features/clients/CreateClientDialog.tsx](apps/app/src/features/clients/CreateClientDialog.tsx))

Added optional `open` / `onOpenChange` / `hideTrigger` props. Existing
self-contained callers (the `/clients` list page) keep working unchanged
because the props are optional and the dialog falls back to internal
state. The new `CreateObligationDialog` opts into the controlled mode
with `hideTrigger`, so the dialog opens from a text link inside the
parent dialog rather than its own "+ New client" button.

## K-1 → internal notes

The `CreateObligationDialog` has an "Internal notes" textarea where
partner names and K-1 source context go. The textarea is wired into the
form schema and validates length (≤5000), but **the value is NOT yet
persisted server-side** — no `orpc.obligations.addReviewNote` endpoint
exists yet. The dialog surfaces a toast on submit when the field was
filled, telling the user to add the note from the obligation drawer for
now. The structured K-1 dropdown in the obligation drawer
([ObligationBlockerSection at routes/obligations.tsx:5933](apps/app/src/routes/obligations.tsx:5933))
is **unchanged** — it's the cascade-aware structural dependency wiring,
and ripping it out would lose auto-unblock behavior on parent
completion. The meeting's "K-1 to manual" intent applies to _creation_,
not _editing_.

Follow-up needed before the K-1 dropdown can be retired:

1. Server: add `obligations.addReviewNote` mutation (writes
   `ObligationReviewNote` row with `noteType: 'review_note'`).
2. Client: wire the `CreateObligationDialog` notes textarea to that
   mutation in a follow-up commit.
3. Drawer: surface review notes prominently next to / above the
   structural blocker picker so users know where to put partner info.

## Routing / placement

- **Today page header** ([routes/dashboard.tsx:149-154](apps/app/src/routes/dashboard.tsx:149)) —
  `<CreateObligationDialog />` is the first action, before "Import
  clients". The verb-led primary button matches the surface's other
  action-led rows.
- **Client detail PageHeader actions** ([features/clients/ClientFactsWorkspace.tsx:1037-1057](apps/app/src/features/clients/ClientFactsWorkspace.tsx:1037)) —
  inserted before "View all obligations" so the action-first order
  reads: add → view → audit.

## Trade-offs and what we didn't do

- **No notes persistence yet.** Documented above. Adding the server
  endpoint is a separate, additive change and stays out of this PR so
  the front-end pieces can land while the API contract is reviewed.
- **No inline create-new-client inside the combobox popover.** Tested
  the pattern; Dialog-inside-Popover fights for focus trap ownership and
  flickered when the Popover closed. The current
  "combobox + adjacent link" works fine and matches `CreateClientDialog`
  ergonomics elsewhere.
- **Status options are 3, not 10.** The obligation status enum carries
  10 legacy values; for a brand-new manual row, only `pending` /
  `waiting_on_client` / `blocked` are meaningful starting states. The
  rest are reached via lifecycle transitions, not creation.

## Verification

- `pnpm check` clean (627 files, 0 errors, 6 warnings — all
  pre-existing on this branch, none in the new files).
- Manual smoke trace (no browser this turn): URL state, focus, and
  callback wiring verified by reading the rendered structure.
- E2E: no new test yet — the surface should land in
  `e2e/tests/dashboard.spec.ts` and a client-detail spec when the notes
  endpoint ships.

## Files touched

- `apps/app/src/features/clients/ClientCombobox.tsx` (new)
- `apps/app/src/features/obligations/CreateObligationDialog.tsx` (new)
- `apps/app/src/features/clients/CreateClientDialog.tsx` (controlled-open
  - `hideTrigger`)
- `apps/app/src/routes/dashboard.tsx` (header action)
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` (PageHeader
  action)
- `docs/dev-log/2026-05-21-manual-obligation-creation.md` (this entry)
