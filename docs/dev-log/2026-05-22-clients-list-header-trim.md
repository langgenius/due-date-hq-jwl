---
title: 'Commit 2: STATES column merge + create/import split button'
date: 2026-05-22
author: 'Yuqi pairing with Claude'
area: ux
---

# Clients list — header trim (L-7 + L-1)

Second commit from `docs/Design/clients-list-and-detail-critique-2026-05-22.md`.
Two adjacent simplifications on the /clients list page.

## L-7 — Merge `OTHER STATES` into the primary `STATES` column

### Before

Two columns side by side:

- `Jurisdiction` → primary filing state (filled secondary badge), single token
- `Other states` → array of additional filing states (outline badges), hidden by default

Two columns to scan for what is one logical signal ("which states does
this client file in?"). Splitting them across two headers also forced
the user's eye to track two cells per row to answer one question.

### After

One column:

```
STATES ▾
─────────
[PA] [NJ]            ← primary filled, others outline, gap-1 wrap
[CA]                 ← single-state clients still read clean
[NY] [MA] [OR] +2    ← overflow chip when >3 states
```

- Header reads `States` (plural)
- Cell renders **primary first** (filled secondary badge), additional
  states inline as **outline badges**
- Max 2 additional badges visible + `+N` overflow with full list in `title`
- Column width `160px` (was 110 + 140 = 250 across two columns)

The retired `id: 'otherStates'` column entry is deleted; its
`columnVisibility: { otherStates: false }` flag also removed (the
column no longer exists, so don't carry a vestigial visibility flag).

`getOtherFilingStates(client)` helper stays — still used by the
merged cell. Doc comment updated to reflect new home.

## L-1 — Replace two-peer-buttons with a split button

### Before

Three header buttons, two of which were "create-or-import" peers:

```
[ Import history ]   [ Import clients ]   [ + Add client ]
   (ghost)             (outline)            (primary)
```

`Import clients` and `+ Add client` competed for visual weight even
though one is an everyday create action and the other is
onboarding-only.

### After

```
[ Import history ]   [ + New client ][ ▾ ]
   (ghost)             (primary split button)
```

- New `ClientsCreateSplitButton` composes:
  - Main button = `+ New client` (primary, opens `CreateClientDialog`
    directly — no detour)
  - Chevron-down dropdown — currently lists only the **alternative**
    `Import from CSV…` (default action lives in the main button, not
    duplicated in the menu; GitHub merge-button convention)
- `Import history` stays as its own ghost button — it's a "view past
  runs" action, not part of the create-or-import cluster.

`CreateClientDialog` itself didn't change; we use its existing
controlled `open` / `onOpenChange` / `hideTrigger` props so the split
button drives it from outside.

## Files

- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
  - Merged primary + other states inline in `accessorKey: 'state'`
    column cell
  - Deleted standalone `id: 'otherStates'` column entry
  - Removed `otherStates: false` from `initialState.columnVisibility`
  - Updated `getOtherFilingStates` doc comment
  - Updated the column-order comment block
- A `apps/app/src/features/clients/ClientsCreateSplitButton.tsx` — new
  wrapper for split-button + dialog
- M `apps/app/src/routes/clients.tsx` — swap `[Import clients] +
CreateClientDialog` for `ClientsCreateSplitButton`, drop unused
  `FileSearchIcon` import
- M en + zh-CN message catalogs (2 new strings: `Import from CSV…`,
  `More create options`)
- A this dev-log

## Verification

- `npx tsc --noEmit -p apps/app/tsconfig.json` → clean
- `pnpm --filter @duedatehq/app i18n:compile --strict` → clean
- Manual:
  - Single-state client (most demo clients) shows one filled badge
  - Multi-state client renders primary filled + others outline in same
    cell; overflow shows `+N` with `title` listing the rest
  - Header `STATES ▾` opens the existing state filter (no regression
    on filter behavior)
  - `+ New client` button opens dialog
  - Chevron next to it opens menu with single `Import from CSV…` item;
    click → migration wizard opens
  - `Import history` button still ghost, still opens history drawer

## What's not in this commit

- L-8 (3 summary cards → SurfaceSummaryStrip) — N/A for our codebase.
  We already use `SurfaceSummaryStrip` on `/clients` (the
  `ClientsActionStrip` built earlier). The 3-card layout in the
  reference screenshot came from a different fork.
- L-3 (filter UI matches Obligations / column-header popovers) — our
  filters already use `TableHeaderMultiFilter` in column headers. The
  reference screenshot's standalone chip row was from the other fork.
  Verified `Entity ▾ State ▾ Tier ▾ Package ▾` is not present in our
  actual code.

So L-3 and L-8 are effectively no-ops here — both already correct in
our build. The sequencing doc inherited those items from the reference
screenshot critique and should treat them as **already-done** going
forward.

## What's next

Commit 3 (renamed: was list filter parity, now goes straight to detail
header refactor since L-3/L-8 don't apply):

- D-2 — Detail header full hybrid (big title + inline identity chips +
  utility icons + Archive + Add deadline + tone-coded subtitle)
- D-3 — Split `ClientAlertsBand` into header chip + dedicated alert
  section

The L-9 STATE ALERT banner work is still scoped to whichever surface
shows that aggregate signal. We'll come back to it when D-3 lands and
we can decide if it stays on /clients list (banner above table) or
moves to /clients/[id] (per-client alert section).
