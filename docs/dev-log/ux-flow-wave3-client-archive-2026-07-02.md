# Client archive lifecycle (UX-flow wave 3, agent W3-C) — 2026-07-02

Audit finding (P1, client lifecycle cluster): "no archive flow — delete is the
only lifecycle action" and "delete is irreversible in the UI." Backend delete
was already a soft delete (`deletedAt`), but nothing in the product could see
or reverse it.

## Schema decision: `archived_at`, separate from `deleted_at`

Reusing `deletedAt` as "archive" was considered and rejected:

- `deleted_at` is contractually the PRD §8.1 purge path (30d grace → hard
  delete). The purge cron doesn't exist *yet*, but conflating the two states
  would make archived clients purge-eligible the day it ships.
- `client.deleted` audit rows must keep meaning "removed", not "parked".
- `client_filing_profile.archived_at` was already the in-house archive
  precedent.

Migration `packages/db/migrations/0081_client_archived_at.sql` (applied
locally). NULL = active; restore sets it back to NULL.

## What shipped

- **DB** — `client.archived_at` column; repo `archive()` / `restore()`
  (tenant-scoped, idempotent, blocked on deleted rows); `listByFirm` gains
  `archived: 'exclude' | 'only' | 'all'` (default exclude);
  `countActiveClients` excludes archived (plan clientLimit + usage meter).
  `findById` still returns archived rows so the detail page stays reachable.
- **Truth guards** — every query that filtered `isNull(client.deletedAt)` on
  obligation surfaces now also filters `isNull(client.archivedAt)`:
  obligation-queue (deadlines list/lookup/facets), dashboard (x3), calendar
  ICS feed, reminder dispatch job, morning-digest job. Every claim in the
  archive dialog copy maps to one of these guards.
- **Contracts** — `clients.archive` / `clients.restore` (both return
  `{ client, auditId }`), `listByFirm` input `archived?: 'only' | 'all'`,
  `ClientPublic.archivedAt`; audit actions `client.archived` /
  `client.restored` registered in `ClientAuditActions`.
- **Server** — archive/restore handlers: `CLIENT_WRITE_ROLES` gate, no-op
  short-circuit (rename precedent), audit write, dashboard-brief refresh.
- **App**
  - Client-detail kebab: "Archive client" (active) / "Restore client"
    (archived), write-gated; persistent archived banner on the detail page
    with inline Restore.
  - Archive confirm dialog states exactly what happens (hidden from list /
    Deadlines / Today / calendar feeds / reminder emails; stops counting
    toward the plan limit; nothing deleted; restorable).
  - Delete confirm now says there's no in-app undo and offers **Archive
    instead** as the reversible alternative.
  - /clients: quiet "Archived (N)" header button (renders only when N > 0)
    opens the ArchivedClientsDrawer (`?archived=open`, deep-linkable — the
    archive toast's "View archived" action lands here) listing archived
    clients with archived date, View, and Restore.
  - Audit log labels/presenters for the two new actions; zh-CN translations
    for all new strings.

## Verified

- tsgo clean: packages/db, packages/contracts, packages/ports, apps/server,
  apps/app.
- vitest: db repo tests (incl. new archive/restore/list-filter tests), server
  clients/obligations/migration procedure tests, app clients/audit tests.
- Live (Playwright vs :5414, isolated e2e firm): archive via kebab → dialog →
  banner → gone from /clients and /deadlines → "Archived (1)" button → drawer
  row → Restore → back everywhere; delete dialog → "Archive instead" →
  archived; banner Restore link works; `client.archived` + `client.restored`
  audit rows confirmed in local D1.

Known unrelated: `packages/contracts` has one failing test from the
concurrent W3-A rule-generation work (`duplicateObligationIds`), not from
this change.
