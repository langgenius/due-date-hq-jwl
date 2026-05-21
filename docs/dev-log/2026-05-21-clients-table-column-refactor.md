---
title: 'Clients table: column refactor — drop Source, fold readiness into Next due, add Services + Other states, switch Owner to avatar'
date: 2026-05-21
author: 'Claude (Yuqi pairing)'
area: clients
---

# Clients table column refactor

## Context

Per the 2026-05-21 review, the `/clients` table read as a generic CRM
row when it should read as a CPA scan: "which client opens first, and
where does my work pile?" The existing 8-column layout had the right
ingredients but wrong order and one tile of pure noise (Source).

The columns were also stylistically out of step with the Obligations
queue — Owner was a plain text name in Clients, an avatar in
Obligations. A CPA scanning "is this mine?" across surfaces shouldn't
have to context-switch on visual shape.

## Change

### New column order

1. **Client** (240 px) — name + entity type subline + Pulse radar
   badge. Unchanged.
2. **Jurisdiction** (110 px) — primary filing state only, rendered as
   a single mono-token Badge. The "other states" go in their own
   column now.
3. **Next due** (200 px) — composite cell: due date + tax-code form +
   compact readiness chip stacked. Replaces the standalone Readiness
   column.
4. **Other states** (140 px) — outline-style Badge chips for filing
   states beyond the primary, capped at 3 visible with a `+N`
   overflow indicator.
5. **Services** (90 px, right) — count of unique tax-type services
   the practice manages for this client (distinct tax codes across
   filing profiles). The "scope" answer: 8 services means we file 8
   different forms for them.
6. **Open** (80 px, right) — count of currently-open obligations.
   Click navigates to `/obligations?client=X`. Same as before.
7. **Owner** (80 px) — 24 px **avatar** (initials, accent
   background when the row is yours, dashed outline when
   unassigned). Mirrors the obligations queue's `AssigneeAvatar`
   pattern. Surfaces `currentUserName` via the shared
   `useCurrentUserName` hook.
8. **Opportunities** (120 px) — sparkles + count badge. Unchanged.

Total nominal width: 1060 px.

### Deletions

- **Source column** is gone. Provenance trivia, no actionable
  follow-up. The underlying `sourceFilter` URL param and filter
  pipeline are still wired for deep links, but the column-header
  filter trigger is removed so users can't accidentally narrow by
  it. Same approach applied to the readiness filter (moved its
  actionable entry to the `Needs facts` banner from the prior
  action-strip change).
- **Standalone Readiness column** is gone — its chip lives inline in
  the Next due cell now, which means readiness reads together with
  the deadline it affects.
- `ClientSourceCell` component, `readinessOptions`, `sourceOptions`,
  `readinessLabels`, `sourceLabels`, `formatFilingJurisdictions`, and
  the `resolveUSFirmTimezone` + `useCurrentFirm` imports — all
  deleted from the list workspace. The corresponding code lives in
  `ClientDetailWorkspace` and is unaffected.

### New helpers (all in `ClientFactsWorkspace.tsx`)

- `getPrimaryFilingState(client)` — primary profile → `client.state` →
  first profile state → `null`.
- `getOtherFilingStates(client)` — filing states minus the primary.
- `getClientServicesCount(client)` — count of distinct tax-type codes
  across filing profiles. Scope-of-work signal.
- `ClientAssigneeAvatar` — local component mirroring the queue's
  `AssigneeAvatar` shape (24 px, accent-when-mine, dashed-when-empty).

## Consistency check against other tables

| Pattern               | Obligations queue                              | Rule library                  | Clients table (after)                 |
| --------------------- | ---------------------------------------------- | ----------------------------- | ------------------------------------- |
| Owner / Assignee      | `AssigneeAvatar` (24 px, accent when mine)     | n/a (rule rows have no owner) | `ClientAssigneeAvatar` — same shape   |
| State / Jurisdiction  | Single mono Badge, `clientState` col           | `JurisdictionCode` (mono)     | Single mono Badge in Jurisdiction col |
| Tax code              | `formatTaxCode(taxType)` inline                | n/a                           | `<TaxCodeLabel>` inside Next due      |
| Numeric counts        | mono tabular-nums, right-aligned               | mono tabular-nums             | mono tabular-nums, right-aligned      |
| Header filter trigger | `TableHeaderMultiFilter`                       | `TableHeaderMultiFilter`      | `TableHeaderMultiFilter` (unchanged)  |
| Composite due cell    | Stacked due pill + date + statutory divergence | n/a                           | Stacked date + form + readiness chip  |

The Clients table now reads as the same kind of surface as the
Obligations queue: identical Owner pattern, identical Jurisdiction
shape, the same composite-cell discipline for the column that
carries the most semantic weight (Next due here, Due there).

## Why "Services" earns the slot

Open count is in-flight workload — useful, but it changes daily and
goes to zero when the practice is between deadlines. Services count
is **scope of engagement** — it changes only when the firm wins or
drops work for the client. Pairing the two answers two different
questions in adjacent columns:

- "How busy is this engagement?" → Open
- "How wide is this engagement?" → Services

A client with 8 services and 0 open is healthy, between deadlines.
8 services and 6 open is busy season. 2 services and 0 open is
either between deadlines or a thin engagement. The pair lets the CPA
read posture in a glance.

## Files changed (mine)

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — column
  array rewrite, new helpers, `ClientAssigneeAvatar`, deletions of
  Source/Readiness column machinery and the now-unused imports
  (`useCurrentFirm`, `resolveUSFirmTimezone`, `CLIENT_READINESS_FILTERS`,
  `CLIENT_SOURCE_FILTERS`). Added imports: `initialsFromName`,
  `useCurrentUserName`.
- `apps/app/src/features/clients/client-detail-model.ts` — earlier
  change (extended `ClientObligationListSummary` with
  `overdueCount` / `waitingOnClientCount`); unrelated to this column
  refactor but in the same diff.
- `docs/dev-log/2026-05-21-clients-table-column-refactor.md` — this
  entry.

The same `ClientFactsWorkspaceProps` shape is preserved so
`routes/clients.tsx` doesn't need any change — `readinessFilter`,
`sourceFilter`, and `onSourceFilterChange` props are still accepted
(filter pipeline still respects them when set via URL) but are no
longer destructured in the function body.

## Trade-offs and what we didn't do

- **Did not remove the `sourceFilter` / `readinessFilter` from the
  prop type.** Doing so requires touching `routes/clients.tsx` (call
  site) and the workspace would emit Skipped-prop warnings during a
  proper cleanup pass. Left as follow-up to keep this diff scoped to
  the table.
- **Did not surface the Other states column at narrower viewports
  with a popover.** When `+N` overflows on a thin screen the user
  still sees the count but has to hover to read the list. Consider a
  click-to-expand cell if that becomes friction.
- **Services count uses tax-types from filing profiles, not
  obligations.** This means a service shows up the moment the firm
  registers the tax type, even before the first obligation generates.
  That's intentional — services should reflect scope, not delivery.
- **Owner header still uses `TableHeaderMultiFilter` with text names
  in the picker dropdown.** The header keeps using the existing
  filter primitive; the cell uses the new avatar. Two consistent
  treatments — filter is "who's listed?" (need full name), cell is
  "is this mine?" (avatar is enough).

## Verification

- `pnpm check` — 9 errors / 17 warnings on the branch, none in any
  client-area file. Filterable: `grep -E "ClientFactsWorkspace|client-detail-model|client-readiness|/clients/"`
  over the check output returns nothing.
- Cross-table consistency confirmed against
  `apps/app/src/routes/obligations.tsx` and the rule library
  references in `apps/app/src/features/rules/`.
- No new ORPC calls; data already flows through the existing
  `clientsRoute` plumbing.
- E2E: no new spec yet. A `clients.spec.ts` check for "Owner column
  renders an avatar element, not a text name" would be the cheapest
  regression guard.
