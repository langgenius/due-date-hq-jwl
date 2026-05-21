# Status taxonomy migration map

> Research audit · 2026-05-21. Pre-implementation map for converging the obligation status enum to the canonical 6-state model from `docs/Design/obligation-lifecycle-design-brief.md`. **No code changes were made.** This doc is the spec for the follow-up PR.

**Background.** Three taxonomies coexist today:

1. **Legacy (8 values, all currently still in the contract):** `pending | in_progress | done | extended | paid | waiting_on_client | review | not_applicable`.
2. **Lifecycle v2 transition shim (legacy 8 + 2 additions):** `+ blocked + completed`. Gated by the `?lifecycle=v2` URL param via `useLifecycleV2()`; default-on as of branch `design/preview-integration`. Labels and dropdown options swap (see §2 below).
3. **Canonical target (6 values, per brief + MEMORY):** `not_started | waiting_on_client | blocked | in_review | filed | completed`.

The 6-state model is achieved today as **labels-only re-skinning over the legacy enum values** — see `useLifecycleV2StatusLabels`, where `pending` displays as "Not started," `review` displays as "In review," `done` displays as "Filed." The underlying database values are still the legacy strings. The destination state is: drop the legacy strings entirely, rename column values to the canonical strings, retire the labels indirection.

---

## Section 1 — Status values the contract defines today

### `ObligationStatusSchema` — `packages/contracts/src/shared/enums.ts:72-83`

```ts
z.enum([
  'pending',
  'in_progress',
  'done',
  'extended',
  'paid',
  'waiting_on_client',
  'review',
  'not_applicable',
  'blocked', // Lifecycle v2 addition (non-breaking)
  'completed', // Lifecycle v2 addition (non-breaking)
])
```

That is the single source of truth re-exported through `packages/contracts/src/index.ts:829` and pulled into every other contract:

- `packages/contracts/src/obligations.ts` — `ObligationCreateInputSchema.status`, `ObligationStatusUpdateInputSchema.status`, `ObligationBulkStatusUpdateInputSchema.status`, `AnnualRolloverTargetStatusSchema` (extracts `['pending', 'review']`).
- `packages/contracts/src/obligation-instance.ts:69` — `ObligationInstancePublicSchema.status`.
- `packages/contracts/src/obligation-queue.ts:55` — list filter `status: z.array(ObligationStatusSchema).max(8)`. (Note: `.max(8)` will need bumping once both legacy + canonical values coexist during transition.)
- `packages/contracts/src/dashboard.ts:70, 110, 154` — `DashboardLoadInput.status` (filter), `DashboardTopRow.status`, `DashboardFacetsOutput.statuses[].value`.
- `packages/contracts/src/pulse.ts:88` — `PulseAffectedClient.status`.
- `packages/contracts/src/shared/obligation.ts:12` — shared lite row.

### Schema-stability test — `packages/contracts/src/contracts.test.ts:438-452`

```ts
expect(ObligationStatusSchema.options).toEqual([
  'pending',
  'in_progress',
  'done',
  'extended',
  'paid',
  'waiting_on_client',
  'review',
  'not_applicable',
  'blocked',
  'completed',
])
```

A canary that fails if the enum drifts. The migration PR must update this test deliberately.

### Database column — `packages/db/src/schema/obligations.ts:189-206`

```ts
status: text('status', {
  enum: [
    'pending',
    'in_progress',
    'done',
    'extended',
    'paid',
    'waiting_on_client',
    'review',
    'not_applicable',
    'blocked',
    'completed',
  ],
})
  .notNull()
  .default('pending')
```

D1 SQLite enforces this enum at the application layer via Drizzle — SQLite itself stores `text`. There is **no CHECK constraint** at the SQL level (verified by inspecting `packages/db/migrations/0039_obligation_blocked_by.sql` and the absence of a CHECK in earlier migrations). That means D1 will accept any string at the DB layer and the enum is purely a TS/Zod contract.

### Core mirror — `packages/core/src/obligation-workflow/index.ts:4-15`

Re-declares the same 10 strings as `OBLIGATION_STATUSES`. The `OPEN_OBLIGATION_STATUSES` set is `pending | in_progress | waiting_on_client | review | blocked` (`packages/core/src/obligation-workflow/index.ts:26-32`); `CLOSED_OBLIGATION_STATUSES` is `done | extended | paid | not_applicable | completed` (`packages/core/src/obligation-workflow/index.ts:36-42`). Also defines `OBLIGATION_STATUS_DISPLAY_KEYS` (`index.ts:59-71`) mapping enum → display token (`pending → not_started`, `done → filed`, `review → needs_review` …) — this is the same labels-only indirection that the React `useLifecycleV2StatusLabels` hook duplicates client-side.

### Smart Priority mirror — `packages/core/src/priority/index.ts:38-48`

`SmartPriorityStatus` re-declares the 10-value union inline. Duplicate of `ObligationStatus`.

### `AnnualRolloverTargetStatusSchema` — `packages/contracts/src/obligations.ts:269-272`

```ts
ObligationStatusSchema.extract(['pending', 'review'])
```

Constrains annual rollover output to two legacy values. Becomes `['not_started', 'in_review']` post-migration.

---

## Section 2 — Consumers that branch on status

Enumeration. Files in **load order: contract → core → DB → server → app**. Each entry: path, line range, what it switches on, what changes for canonical 6-state.

### 2.1 — Contract / schema layer (canonical change)

| #   | File                                       | Lines   | What it does                                                     | Migration impact                                                                                           |
| --- | ------------------------------------------ | ------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | `packages/contracts/src/shared/enums.ts`   | 72-83   | Declares `ObligationStatusSchema`                                | **Rewrite enum to 6 values** at end of migration. Allow legacy values as union during transition (see §4). |
| 2   | `packages/contracts/src/obligations.ts`    | 269-272 | `AnnualRolloverTargetStatusSchema.extract(['pending','review'])` | Change extract list to `['not_started','in_review']`.                                                      |
| 3   | `packages/contracts/src/contracts.test.ts` | 438-452 | Snapshot test of enum options                                    | Update assertion to canonical 6 values.                                                                    |
| 4   | `packages/db/src/schema/obligations.ts`    | 189-206 | Drizzle column enum                                              | Rewrite enum + write a backfill migration. See §3.                                                         |

### 2.2 — Core (state machine + Smart Priority)

| #   | File                                                  | Lines   | What it does                                                                                                                 | Migration impact                                                                                                                  |
| --- | ----------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 5   | `packages/core/src/obligation-workflow/index.ts`      | 4-15    | `OBLIGATION_STATUSES` constant                                                                                               | Replace with 6 values.                                                                                                            |
| 6   | `packages/core/src/obligation-workflow/index.ts`      | 26-32   | `OPEN_OBLIGATION_STATUSES` set                                                                                               | Becomes `['not_started','waiting_on_client','blocked','in_review']`.                                                              |
| 7   | `packages/core/src/obligation-workflow/index.ts`      | 36-42   | `CLOSED_OBLIGATION_STATUSES` set                                                                                             | Becomes `['filed','completed']`. Drops `done`, `extended`, `paid`, `not_applicable`.                                              |
| 8   | `packages/core/src/obligation-workflow/index.ts`      | 47-71   | `ObligationStatusDisplayKey` + `OBLIGATION_STATUS_DISPLAY_KEYS` (identity map under new names)                               | **Delete entirely** — display keys collapse into the enum.                                                                        |
| 9   | `packages/core/src/obligation-workflow/index.ts`      | 83-91   | `defaultReadinessForStatus` — branches on `waiting_on_client`, `review`, and `isClosedObligationStatus`                      | Rename `review → in_review`. Closed-set membership recomputed.                                                                    |
| 10  | `packages/core/src/obligation-workflow/index.ts`      | 109-202 | `OBLIGATION_TRANSITIONS` matrix — full from→to legal-transitions table                                                       | **Rewrite** for the 6-state matrix. `done`/`extended`/`paid`/`not_applicable` source rows deleted.                                |
| 11  | `packages/core/src/obligation-workflow/index.ts`      | 213-236 | `deriveObligationReadiness` — branches on `waiting_on_client`, `review`, `isClosedObligationStatus`                          | Same rename + closed-set updates.                                                                                                 |
| 12  | `packages/core/src/obligation-workflow/index.test.ts` | 18-145  | Exhaustive state-machine tests                                                                                               | Rewrite to canonical names.                                                                                                       |
| 13  | `packages/core/src/priority/index.ts`                 | 38-48   | `SmartPriorityStatus` union                                                                                                  | Replace with canonical 6.                                                                                                         |
| 14  | `packages/core/src/priority/index.ts`                 | 247-272 | `readinessFactor` — `input.status === 'waiting_on_client' \|\| input.status === 'review'` drives "Readiness pressure" weight | Rename `review → in_review`. (Smart Priority does NOT differentiate by `pending`/`done`/`completed` — only the two-branch check.) |

### 2.3 — Database repositories

| #   | File                                       | Lines    | What it does                                                                                                                                           | Migration impact                                                                                                                                                                                                                                |
| --- | ------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------- |
| 15  | `packages/db/src/repo/obligations.ts`      | 283      | `i.status ?? 'pending'` default                                                                                                                        | Rename `pending → not_started`.                                                                                                                                                                                                                 |
| 16  | `packages/db/src/repo/obligations.ts`      | 390      | `listAnnualRolloverSeeds` — `inArray(status, ['done','paid','extended'])` filters "closed" rows that can seed next year                                | New closed set: `['filed','completed']`. **Semantic shift** — `not_applicable` had been excluded as a seed already; `extended` no longer exists as a status (becomes deadline mutation per brief). Confirm with annual-rollover behavior tests. |
| 17  | `packages/db/src/repo/obligations.ts`      | 522-528  | `updateStatus` accepts `ObligationStatus`                                                                                                              | No code change, but the type narrows.                                                                                                                                                                                                           |
| 18  | `packages/db/src/repo/obligations.ts`      | 534-546  | `setEfileRejected` — flips status, used with `nextStatus: 'review'` from `_service.ts:406`                                                             | Caller passes `'in_review'` post-migration.                                                                                                                                                                                                     |
| 19  | `packages/db/src/repo/obligations.ts`      | 593-625  | `unblockChildrenOf` — child rows in `status='blocked'` flip to `status='pending'` after parent completes                                               | Change to `status='not_started'`.                                                                                                                                                                                                               |
| 20  | `packages/db/src/repo/dashboard.ts`        | 173-185  | `severityForDueDate(dueDate, asOfDate, status)` — `if (status === 'review'                                                                             |                                                                                                                                                                                                                                                 | days <= 14) return 'medium'` | Rename `review → in_review`. |
| 21  | `packages/db/src/repo/dashboard.ts`        | 401      | `if (row.status === 'review') needsReviewCount += 1`                                                                                                   | Rename.                                                                                                                                                                                                                                         |
| 22  | `packages/db/src/repo/dashboard.ts`        | 727      | Default `status: 'pending'` in test scaffolding                                                                                                        | Rename to `not_started`.                                                                                                                                                                                                                        |
| 23  | `packages/db/src/repo/workload.ts`         | 116-123  | `if (rawRow.status === 'waiting_on_client') row.waiting += 1` and `if (rawRow.status === 'review') row.review += 1` — drives Workload dashboard counts | Rename `review → in_review`. (`waiting_on_client` keeps its name.)                                                                                                                                                                              |
| 24  | `packages/db/src/repo/reminders.ts`        | 298-303  | `if (… \|\| row.status === 'review' \|\| …)` — suppresses client emails when an obligation is in review                                                | Rename `review → in_review`.                                                                                                                                                                                                                    |
| 25  | `packages/db/src/repo/readiness.ts`        | 31       | Default seed `status: 'in_progress'` in checklist fixture                                                                                              | `in_progress` is **retired** post-migration. Replace with `not_started` or remove.                                                                                                                                                              |
| 26  | `packages/db/src/repo/obligation-queue.ts` | 982-1062 | Facets builder — groups raw rows by `row.status` and emits `{ value, label, count }` for each distinct status in the firm                              | No code change beyond enum narrowing. Returns whatever statuses exist. Old DB values must be backfilled BEFORE the contract narrows or facets fail.                                                                                             |

### 2.4 — Server procedures (mutations + facets + jobs)

| #   | File                                                         | Lines   | What it does                                                                                                                                                                       | Migration impact                                                                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 27  | `apps/server/src/procedures/obligations/_service.ts`         | 352-371 | `updateObligationStatus` — `if (after.status === 'completed') unblockChildrenOf(...)` cascade with audit row                                                                       | Keep. `completed` survives migration.                                                                                                                                                                                                                                                                                                  |
| 28  | `apps/server/src/procedures/obligations/_service.ts`         | 363-365 | Auto-unblock audit `before: { status: 'blocked' }`, `after: { status: 'pending' }`                                                                                                 | Rename `pending → not_started`.                                                                                                                                                                                                                                                                                                        |
| 29  | `apps/server/src/procedures/obligations/_service.ts`         | 388-440 | `markObligationFiledRejected` — guards `before.status !== 'done'` and writes `nextStatus: 'review'`                                                                                | Rename `done → filed`, `review → in_review`. Error message at line 401 references `before.status` directly so the new label flows through.                                                                                                                                                                                             |
| 30  | `apps/server/src/procedures/obligations/_service.ts`         | 469-520 | `updateBlockedBy` — guards parent's `status === 'completed'`, computes `nextStatus = nextParentId !== null ? 'blocked' : 'pending'`                                                | Rename `pending → not_started`.                                                                                                                                                                                                                                                                                                        |
| 31  | `apps/server/src/procedures/obligations/_service.ts`         | 522-623 | `bulkUpdateObligationStatus` — uses `isLegalObligationTransition` per row; `if (input.status === 'completed') unblockChildrenOf(...)` cascade                                      | Matrix re-applies under new names.                                                                                                                                                                                                                                                                                                     |
| 32  | `apps/server/src/procedures/obligations/_service.ts`         | 651     | `const nextStatus = 'extended'` in `decideObligationExtension`                                                                                                                     | **`extended` is retired as a status.** Per brief §10, "extended → audit-log replay" — the decision becomes a deadline mutation. Replace with `not_started` (or whatever the row's prior state was — audit-log lookup) **and** ensure the audit event still records the extension. Likely requires a small product decision in this PR. |
| 33  | `apps/server/src/procedures/obligations/_annual-rollover.ts` | 318-334 | Computes `targetStatus = preview.reminderReady ? 'pending' : 'review'` for new rollover rows                                                                                       | Rename → `'not_started' : 'in_review'`.                                                                                                                                                                                                                                                                                                |
| 34  | `apps/server/src/procedures/obligation-queue/index.ts`       | 117-124 | `ACTIVE_EXPORT_STATUSES = ['pending','in_progress','waiting_on_client','review','extended','blocked']` — defines which rows are included in queue export "filtered to active" mode | Becomes `['not_started','waiting_on_client','blocked','in_review']`. Removes `in_progress` + `extended` (both retired).                                                                                                                                                                                                                |
| 35  | `apps/server/src/procedures/obligation-queue/index.ts`       | 466     | CSV export `row.status` written as a column value                                                                                                                                  | No code change, label flows from row.                                                                                                                                                                                                                                                                                                  |
| 36  | `apps/server/src/procedures/obligation-queue/index.ts`       | 517     | PDF export line `${row.status}` formatted into description                                                                                                                         | No code change, label flows from row.                                                                                                                                                                                                                                                                                                  |
| 37  | `apps/server/src/procedures/obligation-queue/index.ts`       | 600     | ICS event description includes `${row.status}`                                                                                                                                     | No code change.                                                                                                                                                                                                                                                                                                                        |
| 38  | `apps/server/src/procedures/opportunities/index.ts`          | 69      | `!['done','paid','not_applicable'].includes(obligation.status)` — defines "open" for opportunities scoring                                                                         | Becomes `!['filed','completed'].includes(...)`. (`not_applicable` retires — rows hidden by filter, not by status.) Semantic shift: previously closed rows in `done` would be re-classified as `filed` and thus still excluded, but if a `done` row is migrated to `completed` instead, behavior is unchanged.                          |
| 39  | `apps/server/src/procedures/opportunities/index.ts`          | 72      | `obligation.status === 'waiting_on_client'` for retention check-in scoring                                                                                                         | No rename.                                                                                                                                                                                                                                                                                                                             |
| 40  | `apps/server/src/lib/ics.ts`                                 | 85      | `Status: ${input.row.status}` line in ICS event description                                                                                                                        | No code change; label rides on row.                                                                                                                                                                                                                                                                                                    |

### 2.5 — Audit-log presenters

| #   | File                                               | Lines   | What it does                                                                                                                                           | Migration impact                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | -------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 41  | `apps/app/src/features/audit/audit-change-view.ts` | 172     | `'obligation.status.updated': obligationStatusPresenter` route                                                                                         | No code change.                                                                                                                                                                                                                                                                                                                                                                                            |
| 42  | `apps/app/src/features/audit/audit-change-view.ts` | 305-318 | When `key === 'status'` && action starts with `obligation.`, formats value via `labels.statusLabels[value]`                                            | The labels map is now the canonical map; legacy values won't have a label entry. **Old audit rows in D1 will still carry legacy status strings** (`pending`, `done`, `review`, …) — the presenter falls through to `humanizeIdentifier` (line 316-318). For trustworthy audit replay, add a legacy → canonical alias inside `audit-log-labels.ts` `enumValues` (line 214 already does this for `pending`). |
| 43  | `apps/app/src/features/audit/audit-change-view.ts` | 437-446 | `obligationStatusPresenter` — formats `Deadline status changed from <previous> to <next>` headline using both before/after values from the audit event | Same: must format legacy values that exist in historical rows.                                                                                                                                                                                                                                                                                                                                             |
| 44  | `apps/app/src/features/audit/audit-log-labels.ts`  | 214     | `enumValues.pending: statusLabels.pending ?? t\`Pending\``                                                                                             | Already structured as a fallback. Add similar entries for `done`, `review`, `paid`, `extended`, `in_progress`, `not_applicable` so audit headlines for historical rows still humanize.                                                                                                                                                                                                                     |

### 2.6 — App: status pill rendering, dropdown, route filters

| #   | File                                                     | Lines      | What it does                                                                                                                                                                                                    | Migration impact                                                                                                                                                                                                                                                               |
| --- | -------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 45  | `apps/app/src/features/obligations/status-control.tsx`   | 27-38      | `ALL_STATUSES` — the 10-value array used as the dropdown universe                                                                                                                                               | Becomes 6 canonical.                                                                                                                                                                                                                                                           |
| 46  | `apps/app/src/features/obligations/status-control.tsx`   | 42-49      | `LIFECYCLE_V2_STATUSES` — the 6-state subset rendered in the dropdown when v2 is on                                                                                                                             | **Delete** (collapses into `ALL_STATUSES`).                                                                                                                                                                                                                                    |
| 47  | `apps/app/src/features/obligations/status-control.tsx`   | 51-65      | `STATUS_VARIANT` — pill color per status                                                                                                                                                                        | Rewrite for canonical names.                                                                                                                                                                                                                                                   |
| 48  | `apps/app/src/features/obligations/status-control.tsx`   | 67-81      | `STATUS_DOT` — dot tone per status                                                                                                                                                                              | Rewrite for canonical names.                                                                                                                                                                                                                                                   |
| 49  | `apps/app/src/features/obligations/status-control.tsx`   | 83-85      | `isObligationStatus` type guard                                                                                                                                                                                 | Recomputed from new `ALL_STATUSES`.                                                                                                                                                                                                                                            |
| 50  | `apps/app/src/features/obligations/status-control.tsx`   | 87-104     | `useStatusLabels` — legacy labels map (`pending: t\`Not started\``, `done: t\`Filed\``, …)                                                                                                                      | Becomes the canonical labels map. Function probably gets renamed (`useObligationStatusLabels`) to drop the "legacy" connotation.                                                                                                                                               |
| 51  | `apps/app/src/features/obligations/status-control.tsx`   | 106-125    | `useLifecycleV2StatusLabels` — labels-only re-skinning over legacy values                                                                                                                                       | **Delete entirely.**                                                                                                                                                                                                                                                           |
| 52  | `apps/app/src/features/obligations/status-control.tsx`   | 139-211    | `ObligationQueueStatusControl` — the dropdown component, takes `statuses?: readonly ObligationStatus[]` (defaults to `ALL_STATUSES`) and renders illegal-transition state via `isLegalObligationTransition`     | No structural change. The `statuses` prop becomes vestigial once `LIFECYCLE_V2_STATUSES` is deleted; can be removed.                                                                                                                                                           |
| 53  | `apps/app/src/features/obligations/use-lifecycle-v2.ts`  | 22-29      | `useLifecycleV2()` hook reads `?lifecycle` URL param                                                                                                                                                            | **Delete file** at end of migration. All callers go default-on.                                                                                                                                                                                                                |
| 54  | `apps/app/src/features/obligations/rejection-chip.tsx`   | 19-20      | `isRejectionVisible({ status, efileRejectedAt })` returns `status === 'review' && efileRejectedAt !== null`                                                                                                     | Rename `review → in_review`.                                                                                                                                                                                                                                                   |
| 55  | `apps/app/src/features/obligations/blocked-by-chip.tsx`  | 14-17      | Returns `status === 'blocked' && blockedByObligationInstanceId !== null`                                                                                                                                        | No rename.                                                                                                                                                                                                                                                                     |
| 56  | `apps/app/src/features/obligations/timeline.tsx`         | 14-22      | `MILESTONE_MAP` — maps legacy → v2 milestones (`paid → completed`, `done → done`, …)                                                                                                                            | Either delete the map (when statuses are already canonical, identity map) or rename keys to canonical strings.                                                                                                                                                                 |
| 57  | `apps/app/src/features/dashboard/actions-list.tsx`       | 14-31      | `statusLabel(status)` — local switch over `pending/in_progress/waiting_on_client/blocked/review/completed`. **Note `in_progress` is in the switch but never reachable on the v2 surface** — defensive fallback. | Replace `pending → not_started`, `review → in_review`. Drop `in_progress` case.                                                                                                                                                                                                |
| 58  | `apps/app/src/features/dashboard/actions-list.tsx`       | 58, 61     | `if (row.status === 'waiting_on_client')` and `if (row.status === 'review')` drive action-prompt copy ("Follow up for client materials" / "Complete CPA review and close the row")                              | Rename `review → in_review`.                                                                                                                                                                                                                                                   |
| 59  | `apps/app/src/features/clients/client-detail-model.ts`   | 10-16      | `OPEN_OBLIGATION_STATUSES = new Set([pending, in_progress, extended, waiting_on_client, review])` — drives client-detail open count                                                                             | Becomes `Set([not_started, waiting_on_client, blocked, in_review])`.                                                                                                                                                                                                           |
| 60  | `apps/app/src/features/clients/client-detail-model.ts`   | 87         | `obligation.status === 'review' \|\| obligation.readiness === 'needs_review'` for "needs review" badge                                                                                                          | Rename.                                                                                                                                                                                                                                                                        |
| 61  | `apps/app/src/features/clients/ClientFactsWorkspace.tsx` | 1281-1288  | `OPEN_FILING_PLAN_STATUSES = new Set([pending, in_progress, waiting_on_client, review, blocked, done])` — drives year-by-year open counts on filing-plan panel                                                  | Becomes `Set([not_started, waiting_on_client, blocked, in_review, filed])`. Note this currently treats `done` ("Filed") as still-open, matching the brief's "Filed ≠ Done" invariant.                                                                                          |
| 62  | `apps/app/src/features/clients/ClientFactsWorkspace.tsx` | 1263, 1273 | `o.status === 'extended'` — extension counter                                                                                                                                                                   | `extended` is retired as a status. The notion is preserved via `extensionState` / `extensionDecidedAt` on the same row. **Replace the count with `o.extensionDecision === 'applied' && o.extensionState !== 'rejected'`** or whatever the new "is extended" predicate becomes. |
| 63  | `apps/app/src/features/clients/ClientFactsWorkspace.tsx` | 1637-1660  | `ObligationStatusBadge` — local component branching on `done/paid → "Complete"`, `review → "Needs review"`, `waiting_on_client → "Waiting"`, fallback humanizes status                                          | Rewrite for canonical names. Note this is a **second status-pill component** distinct from the queue control — refactor opportunity to consolidate.                                                                                                                            |

### 2.7 — Routes (URL filter parsers + facet rendering)

| #   | File                                  | Lines        | What it does                                                                                                                                                                                                                                    | Migration impact                                                                                                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 64  | `apps/app/src/routes/obligations.tsx` | 187, 726-730 | `import { useLifecycleV2 }`; `const lifecycleV2 = useLifecycleV2(); … statusLabels = lifecycleV2 ? v2StatusLabels : legacyStatusLabels; statusDropdownOptions = lifecycleV2 ? LIFECYCLE_V2_STATUSES : ALL_STATUSES` — the flag's primary branch | **Collapse to `const statusLabels = useStatusLabels()`** and remove the dropdown-option toggle.                                                                                                                                                                                                                                                                   |
| 65  | `apps/app/src/routes/obligations.tsx` | 355-357      | URL filter parser `status: parseAsArrayOf(parseAsStringLiteral(ALL_STATUSES))`                                                                                                                                                                  | New `ALL_STATUSES` from `status-control.tsx`. `parseAsStringLiteral` will reject unknown values — **deep-linked URLs from before the migration that carry `?status=pending` will silently drop the filter.** Plan: add a one-time `?status` legacy-alias remapper in the parser (or accept the breakage in test/staging since URLs are ephemeral).                |
| 66  | `apps/app/src/routes/obligations.tsx` | 421-423      | `isObligationStatus(value)` against `ALL_STATUSES`                                                                                                                                                                                              | Recomputed.                                                                                                                                                                                                                                                                                                                                                       |
| 67  | `apps/app/src/routes/obligations.tsx` | 583          | `status: stringArrayFromUnknown(query.status).filter(isObligationStatus)` — sanitizes saved-view filter values                                                                                                                                  | Will silently drop legacy values from saved views unless we add an alias step. Saved views are stored as `query_json` in D1 (`packages/db/src/schema/obligation-saved-view.ts:20`); some legacy saved views may carry `status: ['pending']` etc. **Backfill: rewrite saved-view `query_json` in the same migration that backfills `obligation_instance.status`.** |
| 68  | `apps/app/src/routes/obligations.tsx` | 870-876      | Builds `statusOptions = ALL_STATUSES.map(...)` for the header filter dropdown                                                                                                                                                                   | Recomputed.                                                                                                                                                                                                                                                                                                                                                       |
| 69  | `apps/app/src/routes/obligations.tsx` | 1696, 1705   | `statusQuery.length === 1 && isObligationStatus(statusQuery[0]!) ? statusQuery[0] : 'all'` — tab scope; `scopeStatuses` derived from `statusFacetCounts`                                                                                        | Recomputed.                                                                                                                                                                                                                                                                                                                                                       |
| 70  | `apps/app/src/routes/obligations.tsx` | 1676-1689    | `statusFacetCounts` — combines server facet (`facetsQuery.data?.statuses`) and currently-visible rows                                                                                                                                           | Recomputed.                                                                                                                                                                                                                                                                                                                                                       |
| 71  | `apps/app/src/routes/obligations.tsx` | 2439-2452    | Bulk-status menu — `ALL_STATUSES.map(status => status === 'extended' ? <special> : <normal>)` — special-cases `extended` to open the memo modal                                                                                                 | `extended` no longer a status. The "Mark extended" action becomes a separate primary affordance (per brief §6) that mutates `currentDueDate` + writes an audit row, **not** a status change. Remove the `extended` branch from this dropdown entirely.                                                                                                            |
| 72  | `apps/app/src/routes/obligations.tsx` | 3800-3815    | `lifecycleV2 && row && (row.status === 'done' \|\| row.status === 'paid') ? <Mark accepted button>` — drawer header CTA appears for filed/paid rows                                                                                             | Rewrite to `row.status === 'filed'`. Drop the lifecycleV2 flag check; the button is unconditional in v2.                                                                                                                                                                                                                                                          |
| 73  | `apps/app/src/routes/obligations.tsx` | 5620-5641    | `stageIndexForStatus(status)` — switch over every legacy status mapping to one of 6 funnel stages (Scope / Collecting / Preparing / Signature / Filed / Completed)                                                                              | Rewrite for canonical names; collapses cleanly (`not_started → 0`, `waiting_on_client/blocked → 1`, `in_review → 2`, no Signature anchor today, `filed → 4`, `completed → 5`).                                                                                                                                                                                    |
| 74  | `apps/app/src/routes/obligations.tsx` | 5646-5652    | `STAGE_ANCHOR_STATUSES` — per-stage list of statuses that, when seen in an audit event, stamp the milestone with that event's createdAt                                                                                                         | Rewrite.                                                                                                                                                                                                                                                                                                                                                          |
| 75  | `apps/app/src/routes/obligations.tsx` | 5662-5674    | `mineStageTimestamps(auditEvents)` — reads `event.afterJson.status` from historical audit events and matches against `STAGE_ANCHOR_STATUSES`                                                                                                    | **Cross-version reads.** Historical events will carry legacy strings. The anchor lists must remain a **union of legacy + canonical names** for this function to keep working on old audit rows. Plan: keep the union in this one file even after the contract narrows, as a read-only compatibility shim.                                                         |
| 76  | `apps/app/src/routes/dashboard.tsx`   | 39-44        | `DASHBOARD_STATUS_FILTERS = ['pending','in_progress','waiting_on_client','review']` — URL filter whitelist for dashboard                                                                                                                        | Becomes `['not_started','waiting_on_client','in_review']`. `in_progress` retires. (`blocked` is omitted today — recheck if dashboard should expose it.)                                                                                                                                                                                                           |
| 77  | `apps/app/src/routes/dashboard.tsx`   | 71-73        | `status: parseAsArrayOf(parseAsStringLiteral(DASHBOARD_STATUS_FILTERS))` URL parser                                                                                                                                                             | Same migration risk as #65.                                                                                                                                                                                                                                                                                                                                       |
| 78  | `apps/app/src/routes/dashboard.tsx`   | 186-189      | `facets?.statuses.find((s) => s.value === 'blocked')?.count` and `... === 'waiting_on_client'` — drives ExposureStrip counters                                                                                                                  | No rename for those two, but verify with the canonical names.                                                                                                                                                                                                                                                                                                     |
| 79  | `apps/app/src/routes/clients.tsx`     | 50-56        | `OPEN_OBLIGATION_STATUSES = ['pending','in_progress','extended','waiting_on_client','review']` — fed into `OBLIGATIONS_LIST_INPUT.status`                                                                                                       | Becomes `['not_started','waiting_on_client','blocked','in_review']`. Drops `in_progress` + `extended`.                                                                                                                                                                                                                                                            |

### 2.8 — Cache invalidation triggers (no direct status branching, listed for completeness)

Status mutations trigger invalidation of these query keys in `apps/app/src/routes/obligations.tsx:994-1064`:

- `orpc.obligations.list.key()` (queue)
- `orpc.dashboard.load.key()` (dashboard)
- `orpc.obligations.getDeadlineTip.key()` (AI deadline tip)
- `orpc.audit.key()` (audit log)
- `orpc.workload.load.key()` (workload — only on bulk)

No code change required; the keys are stable. **But:** queries cached in user browsers across the migration will hold legacy-status rows in `tanstack-query`'s `queryCache`. Since the migration is online and rows get backfilled atomically, the worst case is one stale render; the standard `staleTime`/refetch path repairs it. Document this in the rollout note.

### 2.9 — Smart Priority (no weights by status, ranking-only signal)

`packages/core/src/priority/index.ts:247-272` `readinessFactor` is the only Smart Priority factor that reads status. It boolean-OR's two conditions (`waiting_on_client` OR `review`) into the "Readiness pressure" boost. **No status carries a numeric weight.** Migration impact: rename `review → in_review` in that function and update the test in `packages/core/src/priority/index.test.ts`.

### 2.10 — Email digests / notifications

Searched `apps/server/src/jobs/reminders/dispatch.ts` and `apps/server/src/jobs/dashboard-brief/consumer.ts`:

- `apps/server/src/jobs/reminders/dispatch.ts:308` — `if (!email || input.offsetDays === 0 || input.obligation.status === 'review') return` — suppresses client reminder emails when the obligation is in review (preparer-only deadline). **Rename `review → in_review`.**
- `apps/server/src/jobs/dashboard-brief/consumer.ts:82, 107` — passes `row.status` through to the AI-generated dashboard brief input. No branching, just plumbing.

No other email/notification path branches on status.

---

## Section 3 — Data migration scope

### Tables that store obligation status

**Primary:** `obligation_instance.status` (`packages/db/src/schema/obligations.ts:189-206`). Type: `text` with Drizzle enum (no SQL CHECK constraint). Default: `'pending'`.

**Secondary writes (status indirectly stored):**

1. **`audit_log` rows.** Every status transition writes an audit event with `before.status` / `after.status` JSON payloads. Historical rows preserve the _string at write time_. These rows are immutable for trust reasons (you don't rewrite history). Plan: keep the audit-log presenter aware of legacy values forever (see §2.5 #42, #43).
2. **`obligation_saved_view.query_json`.** Schema: `packages/db/src/schema/obligation-saved-view.ts:20` — `text('query_json', { mode: 'json' })`. Stores user-defined obligation queue filters including `{ status: ['pending', 'review', …] }`. **These need to be rewritten in the same migration that touches `obligation_instance.status`** or saved views silently lose their filter.
3. **`obligation_instance.extension_state`, `prep_stage`, `review_stage`** — these are distinct enums (see `packages/contracts/src/shared/enums.ts:118-172`); not the queue status. **Not affected**, but they are the underlying "where in the lifecycle" detail surfaces that the brief alludes to (the timeline tab).

**Not affected:**

- `obligation_instance.readiness_status` — `ObligationReadiness` (`ready | waiting | needs_review`). Separate 3-value enum, no overlap.
- `obligation_instance.blocked_by_obligation_instance_id` — already aligned with v2 model.
- `obligation_instance.efile_state`, `payment_state` — sub-state machines unaffected by the queue-status rename.

### Row-level remapping required

For every existing row of `obligation_instance` and every saved-view `query_json` entry that references the `status` field, apply this map exactly once during migration:

| Legacy value        | Target                        | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pending`           | `not_started`                 | Direct rename. Default value also updates.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `in_progress`       | `not_started`                 | Retired. Per brief §10: `in_progress → split` — manual baseline is `not_started`, the four auto-transition events (readiness flag, e-file submission, acceptance, parent completion) determine subsequent state. For a one-time backfill, send all live `in_progress` rows to `not_started`; readiness/prepStage already differentiate.                                                                                                                                                          |
| `waiting_on_client` | `waiting_on_client`           | Identity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `review`            | `in_review`                   | Rename.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `done`              | `filed`                       | Per brief §10 decision matrix: `done → completed` is also possible if the row was already accepted, but the heuristic for "should this row be `filed` vs `completed`?" needs a single rule. Simplest: if `efile_accepted_at IS NOT NULL` OR if the row's most recent audit event shows acceptance, → `completed`; else → `filed`.                                                                                                                                                                |
| `extended`          | replay from audit log         | Per brief §10: `extended → audit-log replay`. Find each `extended` row's previous status from `audit_log` (most recent transition into `extended`), and restore that. Where audit history is missing, default to `not_started`. **The extension itself is preserved on `extension_decision`, `extension_state`, `extension_filed_at`, `current_due_date` — none of those columns change.**                                                                                                       |
| `paid`              | `completed`                   | Per brief §10. Payment obligations fold into `completed`; the `obligation_type='payment'` column already distinguishes them.                                                                                                                                                                                                                                                                                                                                                                     |
| `not_applicable`    | `completed` (terminal hidden) | Per brief §5 ("`not_applicable` rows are hidden from the queue by default; surfaced only via an explicit filter toggle"). The brief doesn't explicitly say "rename"; an alternative is to keep `not_applicable` as a 7th retained state, but that breaks the "6 states" contract. **Recommend:** rename to `completed` + flip a new boolean `is_not_applicable` (or use an existing column like `prep_stage='not_required'`) to preserve the semantic. **Confirm with product before backfill.** |
| `blocked`           | `blocked`                     | Identity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `completed`         | `completed`                   | Identity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### Migration order at the SQL layer

1. **Add new column** `obligation_instance.status_v2 text` (nullable initially).
2. **Backfill** `status_v2` from `status` using the map above. For `extended`, JOIN the most recent matching `audit_log` row.
3. **Update Drizzle schema** to read `status` as a union of legacy + canonical strings (no SQL change yet — the column type is `text` and Drizzle enforces at the application layer).
4. **Swap reads** to `status_v2` (or do an `UPDATE obligation_instance SET status = status_v2` and drop `status_v2`). The latter is simpler since no SQL CHECK constraint exists.
5. **Backfill `obligation_saved_view.query_json`** with the same map applied to `query_json->>'status'` arrays.
6. **Narrow** the Drizzle enum + Zod schema to the canonical 6.
7. **Delete dead code** (`useLifecycleV2`, `LIFECYCLE_V2_STATUSES`, `useLifecycleV2StatusLabels`, etc.).

No SQL CHECK constraint means there's no DB-level "old enum violated" error to trip on. The risk is purely application-layer: a stale deploy of the frontend reading new D1 rows would see unknown values. Mitigated by deploying contract-narrowing **after** the data backfill completes.

---

## Section 4 — Suggested rollout order

Six PRs, each independently mergeable and each leaves the system in a working state.

### PR 1 — Widen schema to union of legacy + canonical

**Goal:** allow both legacy and canonical values in the contract during the transition window.

- `packages/contracts/src/shared/enums.ts:72-83` — add `not_started`, `in_review`, `filed` to `ObligationStatusSchema`. Now 13 values total.
- `packages/db/src/schema/obligations.ts:189-206` — same widening.
- `packages/core/src/obligation-workflow/index.ts:4-15` — same.
- `packages/core/src/priority/index.ts:38-48` — same.
- `packages/contracts/src/contracts.test.ts:438-452` — update assertion.
- `packages/contracts/src/obligation-queue.ts:55` and `packages/contracts/src/dashboard.ts:70` — bump `.max(8)` to `.max(13)` on the status array filter.
- **Add `OBLIGATION_STATUS_ALIASES`** in `packages/core/src/obligation-workflow/index.ts` — `{ pending: 'not_started', review: 'in_review', done: 'filed', paid: 'completed', extended: '<replay>', in_progress: 'not_started', not_applicable: 'completed' }`. Consumers that need to normalize old values can call this map.
- Update `OBLIGATION_TRANSITIONS` matrix to include arrows from canonical names.

**Risk:** Low. Pure widening — every legacy consumer still works, new canonical values are accepted by the schema.

### PR 2 — Database backfill

**Goal:** rewrite every D1 row to canonical names.

- New migration file in `packages/db/migrations/` that:
  1. Updates `obligation_instance.status` per the row-level map (§3).
  2. For `extended`: subquery against `audit_log` ordered by `created_at DESC` to find the previous status, fall back to `not_started`.
  3. Updates `obligation_instance.status` default from `'pending'` to `'not_started'`.
  4. Rewrites `obligation_saved_view.query_json` to swap legacy values inside the `status` array.
- New test: `packages/db/src/repo/obligations.test.ts` exercises the post-backfill repo to confirm reads return canonical values.

**Risk:** Medium. Atomic per-firm — if the migration fails midway, partial state. D1 doesn't support transactions across `ALTER` + `UPDATE` cleanly; backfills run as multi-statement scripts. Recommend deploying during a low-traffic window and writing the migration to be idempotent (`UPDATE … WHERE status IN (legacy)`).

### PR 3 — Swap UI defaults to canonical (data already backfilled)

**Goal:** rename references in code that have no behavioral effect beyond label flipping.

Files (all from §2):

- `apps/app/src/features/obligations/status-control.tsx` — `STATUS_VARIANT`, `STATUS_DOT`, `useStatusLabels`, `ALL_STATUSES`.
- `apps/app/src/routes/obligations.tsx` — `ALL_STATUSES` import, the `lifecycleV2 ? v2Labels : legacy` ternaries, `stageIndexForStatus`, `STAGE_ANCHOR_STATUSES`.
- `apps/app/src/routes/dashboard.tsx` — `DASHBOARD_STATUS_FILTERS`.
- `apps/app/src/routes/clients.tsx` — `OPEN_OBLIGATION_STATUSES`.
- `apps/app/src/features/clients/client-detail-model.ts` — `OPEN_OBLIGATION_STATUSES`.
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — `OPEN_FILING_PLAN_STATUSES`, `ObligationStatusBadge`, the `extended` count → replace with `extensionDecision === 'applied'`.
- `apps/app/src/features/dashboard/actions-list.tsx` — `statusLabel`, action-prompt branches.
- `apps/app/src/features/obligations/rejection-chip.tsx` — `review → in_review`.
- `apps/app/src/features/obligations/timeline.tsx` — `MILESTONE_MAP`.

Server-side renames (must ship together so contract calls match):

- `apps/server/src/procedures/obligations/_service.ts` — every `'pending'` / `'review'` / `'done'` / `'completed'` literal.
- `apps/server/src/procedures/obligation-queue/index.ts` — `ACTIVE_EXPORT_STATUSES`.
- `apps/server/src/procedures/opportunities/index.ts` — open-set filter.
- `apps/server/src/procedures/obligations/_annual-rollover.ts` — target-status assignment.
- `apps/server/src/jobs/reminders/dispatch.ts` — `review → in_review`.
- `packages/db/src/repo/obligations.ts` — `listAnnualRolloverSeeds`, `unblockChildrenOf`, defaults.
- `packages/db/src/repo/dashboard.ts:183,401,727` — severity branch + counter + fixture default.
- `packages/db/src/repo/workload.ts:120` — review counter.
- `packages/db/src/repo/reminders.ts:301` — review check.
- `packages/db/src/repo/readiness.ts:31` — `in_progress` → `not_started`.

State that lives client-side and needs invalidation:

- **URL params:** `?status=pending` deep links break. Either accept (URLs are ephemeral; transient breakage is acceptable for an internal tool) or add a parser-level alias step. Per audit doc §1: this is internal-firm, deep links are unlikely.
- **localStorage:** none of the parsers persist to localStorage (verified by `grep -rn "localStorage" apps/app/src/routes/`).
- **tanstack-query cached `queryKey`s:** key namespaces are stable (`orpc.obligations.list`), values inside the cache will be stale after migration but cleared on next refetch. Recommend bumping a query-version constant if present (none found).
- **Saved views (`query_json` in D1):** rewritten in PR 2.

**Risk:** Medium. This is the load-bearing PR; ~30 files. Worth careful review.

### PR 4 — Audit log presenter: forward-compat for legacy values

**Goal:** ensure historical audit rows still humanize.

- `apps/app/src/features/audit/audit-log-labels.ts:198-226` — add explicit `enumValues` entries for every legacy status string mapped to its display name.
- `apps/app/src/features/audit/audit-change-view.ts:305-318` — confirm fall-through path works.
- Add a small unit test: feed an audit event with `before.status='pending'`, `after.status='done'` and assert headline reads "Deadline status changed from Not started to Filed."

**Risk:** Low.

### PR 5 — Delete `useLifecycleV2` flag and v2 helpers

**Goal:** retire the flag + everything keyed on it.

- Delete `apps/app/src/features/obligations/use-lifecycle-v2.ts`.
- Delete `LIFECYCLE_V2_STATUSES` and `useLifecycleV2StatusLabels` exports from `status-control.tsx`.
- Remove all `useLifecycleV2()` call sites (2 in `routes/obligations.tsx`).
- Remove the `?lifecycle` URL param from `obligationQueueSearchParamsParsers`. (Not currently declared there — read directly from `useLocation`.)
- Update `docs/Design/obligation-lifecycle-design-brief.md` to reflect that the v2 model is the live model, not "in flight."

**Risk:** Low. Pure deletion.

### PR 6 — Narrow the contract enum to canonical 6

**Goal:** lock the door behind us.

- `packages/contracts/src/shared/enums.ts:72-83` — collapse to `['not_started','waiting_on_client','blocked','in_review','filed','completed']`.
- `packages/db/src/schema/obligations.ts:189-206` — same.
- `packages/core/src/obligation-workflow/index.ts:4-15` — same.
- `packages/core/src/priority/index.ts:38-48` — same.
- `packages/contracts/src/contracts.test.ts:438-452` — update assertion.
- `packages/contracts/src/obligation-queue.ts:55` and `packages/contracts/src/dashboard.ts:70` — bump `.max(13)` back to `.max(6)`.
- Delete `OBLIGATION_STATUS_ALIASES` from PR 1 (no consumers should still need it now that data is migrated and the schema is narrow).
- Delete `OBLIGATION_STATUS_DISPLAY_KEYS` / `ObligationStatusDisplayKey` from `packages/core/src/obligation-workflow/index.ts:47-71` (now redundant).
- Update `OBLIGATION_TRANSITIONS` matrix to the canonical-only 6×6 graph.
- `apps/app/src/routes/obligations.tsx:5646-5675` — the `mineStageTimestamps` legacy compatibility shim stays (`STAGE_ANCHOR_STATUSES` keeps a union of legacy+canonical anchor strings for historical audit-event reading). This is the only legacy-aware code that survives PR 6.

**Risk:** Medium. If any backfill row was missed, the schema rejects it. The contract test in `contracts.test.ts:438` is the canary. Recommend running a one-time query against staging D1 to confirm zero rows have non-canonical values before merging.

---

## Section 5 — Acceptance criteria

The migration is "done" when all of these hold:

1. **Schema is narrow.**

   ```bash
   grep -rn "'pending'\|'in_progress'\|'done'\|'extended'\|'paid'\|'not_applicable'\|'review'" packages/contracts/src
   ```

   Returns **zero matches** in `obligations.ts`, `obligation-instance.ts`, `dashboard.ts`, `obligation-queue.ts`, `shared/enums.ts`, `pulse.ts`, `shared/obligation.ts`, `contracts.test.ts`.
   _Exception allowed:_ `enumValues` legacy entries in `apps/app/src/features/audit/audit-log-labels.ts` for displaying historical audit rows.

2. **No `useLifecycleV2`.**

   ```bash
   find apps packages -name "use-lifecycle-v2*"
   grep -rn "useLifecycleV2\|LIFECYCLE_V2_STATUSES\|useLifecycleV2StatusLabels" apps packages
   ```

   Both return zero results.

3. **No `?lifecycle=v2` URL handling.**

   ```bash
   grep -rn "'lifecycle'\|lifecycle=v2" apps
   ```

   Returns zero results in source files.

4. **App layer uses canonical names.**

   ```bash
   grep -rn "'pending'\|'review'\|'done'\|'paid'\|'extended'\|'in_progress'\|'not_applicable'" apps/app/src apps/server/src packages/db/src/repo packages/core/src
   ```

   Returns zero results that reference obligation status (allowed: email outbox `status: 'pending'`, AI insight `status: 'pending'`, member invitation `status: 'pending'`, reminder delivery `status: 'pending'`, AI insight `status: 'ready'`, calendar subscription `status: 'active'`, rule status `status: 'active'/'verified'/'accepted'/'rejected'`, pulse `matchStatus`, readiness response `'ready'/'not_yet'/'need_help'` — all are unrelated enums).

5. **Database rows are all canonical.**

   ```sql
   SELECT status, COUNT(*) FROM obligation_instance GROUP BY status;
   ```

   Returns only rows where `status IN ('not_started','waiting_on_client','blocked','in_review','filed','completed')`.

6. **Saved views are canonical.**

   ```sql
   SELECT id FROM obligation_saved_view WHERE query_json LIKE '%"pending"%' OR query_json LIKE '%"review"%' OR query_json LIKE '%"done"%' OR query_json LIKE '%"paid"%' OR query_json LIKE '%"extended"%' OR query_json LIKE '%"in_progress"%' OR query_json LIKE '%"not_applicable"%';
   ```

   Returns zero rows.

7. **Contract test passes with canonical enum.**
   `packages/contracts/src/contracts.test.ts:438-452` asserts `ObligationStatusSchema.options.toEqual(['not_started','waiting_on_client','blocked','in_review','filed','completed'])`.

8. **State machine is 6×6.**
   `packages/core/src/obligation-workflow/index.ts` `OBLIGATION_TRANSITIONS` has exactly 6 source keys and the matrix encodes the brief §6 + §10 decision log.

9. **Audit log presenter handles historical legacy values without crashing.**
   Unit test in `apps/app/src/features/audit/audit-log-model.test.ts` exercises an audit row with `before.status='pending', after.status='done'` and asserts the rendered headline humanizes via the labels-fallback map.

10. **Path-to-Filing chevron in the drawer still mines stage timestamps from historical audit events.**
    `apps/app/src/routes/obligations.tsx:5646-5674` keeps the union-of-legacy+canonical anchor lists; manual smoke test on a row with audit events predating the migration shows the milestone stamps still populate.

---

## Appendix A — Files surveyed (consumer file count)

Total **31 production source files** branch on obligation status outside the contract enum declarations:

**Contract / schema (4)**

- `packages/contracts/src/shared/enums.ts`
- `packages/contracts/src/obligations.ts`
- `packages/contracts/src/contracts.test.ts`
- `packages/db/src/schema/obligations.ts`

**Core (2)**

- `packages/core/src/obligation-workflow/index.ts`
- `packages/core/src/priority/index.ts`

**DB repos (6)**

- `packages/db/src/repo/obligations.ts`
- `packages/db/src/repo/dashboard.ts`
- `packages/db/src/repo/obligation-queue.ts`
- `packages/db/src/repo/workload.ts`
- `packages/db/src/repo/reminders.ts`
- `packages/db/src/repo/readiness.ts`

**Server procedures + jobs + ICS (6)**

- `apps/server/src/procedures/obligations/_service.ts`
- `apps/server/src/procedures/obligations/_annual-rollover.ts`
- `apps/server/src/procedures/obligation-queue/index.ts`
- `apps/server/src/procedures/opportunities/index.ts`
- `apps/server/src/jobs/reminders/dispatch.ts`
- `apps/server/src/lib/ics.ts`

**App UI (13)**

- `apps/app/src/routes/obligations.tsx`
- `apps/app/src/routes/dashboard.tsx`
- `apps/app/src/routes/clients.tsx`
- `apps/app/src/features/obligations/status-control.tsx`
- `apps/app/src/features/obligations/use-lifecycle-v2.ts`
- `apps/app/src/features/obligations/rejection-chip.tsx`
- `apps/app/src/features/obligations/blocked-by-chip.tsx`
- `apps/app/src/features/obligations/timeline.tsx`
- `apps/app/src/features/dashboard/actions-list.tsx`
- `apps/app/src/features/clients/client-detail-model.ts`
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
- `apps/app/src/features/audit/audit-change-view.ts`
- `apps/app/src/features/audit/audit-log-labels.ts`

Test files are not counted; each consumer file has at least one corresponding `.test.ts` that needs updating in lockstep.
