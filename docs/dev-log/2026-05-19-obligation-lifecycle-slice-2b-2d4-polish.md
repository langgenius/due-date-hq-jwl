---
title: 'Obligation lifecycle v2: slice 2b/2d.4 polish — readable parent labels'
date: 2026-05-19
author: 'Claude'
area: obligations
---

# Obligation lifecycle v2: slice 2b/2d.4 polish — readable parent labels

## Context

Two parts of the K-1 dependency graph work shipped this morning with placeholder labels that left the parent obligation's identity bare:

1. **Slice 2b** (`BlockedByChip`): the chip on a `blocked` row reads "by #abc12345" — an 8-char slice of the parent's UUID. A preparer scanning the queue can't tell which upstream obligation is the blocker without clicking through.
2. **Slice 2d.4** (cascade audit reason): when a parent flips to `completed`, each unblocked child's audit row carries `reason: "Unblocked by parent obligation <full-uuid>."`. The Timeline tab renders this verbatim — also unreadable.

Both got `// v2.1: denormalize the parent's client name + tax type` TODOs in slice 2b's source. This is that v2.1 pass.

## Change

### `apps/app/src/features/obligations/blocked-by-chip.tsx`

- New optional prop `parentLabel?: string | null`. When present, the chip renders "by Lakeview Partnership · Form 1065" instead of "by #abc12345".
- Chip now max-width 220px with `truncate`, so long labels don't blow out the status cell.
- Falls back to the short-ID label when `parentLabel` is null/empty — covers the case where the parent isn't loaded in the current queue page (infinite scroll).

### `apps/app/src/routes/obligations.tsx`

- Imports `formatTaxType` from the dashboard helper.
- Status cell looks up the parent via the existing `rowsById` Map. If found, it composes `${parent.clientName} · ${formatTaxType(parent.taxType)}` and passes it as `parentLabel`. If the parent's not in the current page, `parentLabel` is null and the chip falls back to short ID.
- Added `rowsById` to the columns `useMemo` deps so the chip refreshes when new pages stream in.

### `apps/server/src/procedures/obligations/_service.ts`

- **Single-row cascade** (`updateObligationStatus`): when one or more children unblock, fetches the parent client name via `scoped.clients.findById(after.clientId)` and writes:
  ```
  Unblocked by Lakeview Partnership · federal_1065 (parent #a1b2c3d4).
  ```
  Skips the client lookup entirely when no children unblocked (zero-work path).
- **Bulk cascade** (`bulkUpdateObligationStatus`): uses `scoped.clients.findManyByIds` with a deduped set of parent client IDs so a 50-row bulk update fires one batch lookup instead of 50 individual queries. Each child's audit row gets:
  ```
  Unblocked by Lakeview Partnership · federal_1065 (parent #a1b2c3d4, bulk).
  ```
- The audit reason still carries the parent's full UUID (sliced to 8 chars for readability) so forensic search still works — the human label is additive, not a replacement.

### Why not use `formatTaxType` server-side?

The dashboard helper lives in `apps/app/src/features/dashboard/format-tax-type.ts` and isn't shared with the server. Moving it to `@duedatehq/core` is the right cleanup but out of scope here. The audit reason carries the raw `federal_1065`-style code; the Timeline UI can prettify it when rendering. Trade-off: audit rows in raw queries (admin tools, support escalations) read the technical code, which is fine for an audit trail.

## What you see now

**Queue (Obligations table, blocked row):**

```
Before:  [Blocked]  by #a1b2c3d4
After:   [Blocked]  by Lakeview Partnership · Form 1065
```

When the parent isn't on the current page, the chip stays as "by #a1b2c3d4" — graceful degradation.

**Timeline tab (auto-unblock event):**

```
Before:  Unblocked by parent obligation 6e0c1c9b-4f3a-44a8-bc1d-9f2e0123abcd.
After:   Unblocked by Lakeview Partnership · federal_1065 (parent #a1b2c3d4).
```

## What's not in this slice

- **Cross-page parent labels** — when the parent isn't loaded in the current queue page, the chip falls back to short ID. A future slice could fetch parent metadata in the queue endpoint (e.g., `joinBlockedByParent: true` flag) so the chip is always rich. Deferred until preparer feedback says the fallback is painful.
- **Prettified tax-type in audit reason** — would require moving `formatTaxType` to `@duedatehq/core`. Out of scope.
- **Cascade unit tests** — slice 2d.4 didn't add cascade-specific tests; this polish keeps the same coverage profile. Real test coverage for the cascade path is its own follow-up.

## Verification

- `pnpm check` — 0 errors, 0 warnings.
- `pnpm test` — all package tests pass (auth 17, ai 13, ui 72, db 182, server 203, app 40 suites).
- Manual: opened a `blocked` row, observed chip reads "by [Client] · Form [N]". Marked the parent `completed`, observed child Timeline picks up the readable reason string.
