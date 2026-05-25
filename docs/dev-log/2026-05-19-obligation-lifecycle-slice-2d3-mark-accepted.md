---
title: 'Obligation lifecycle v2: slice 2d.3 — Mark accepted button'
date: 2026-05-19
author: 'Claude'
area: obligations
---

# Obligation lifecycle v2: slice 2d.3 — Mark accepted button

## Context

Smallest of the four auto/manual transitions called out in the brief (§6). The other three are auto-transitions triggered by upstream events:

- **2d.1** — readiness checklist "K-1 missing" → `status='blocked'`
- **2d.2** — e-file accepted webhook → `status='completed'`
- **2d.4** — parent `completed` → child unblock cascade (shipped a8d7d72)

2d.3 is the **manual** acceptance path: a preparer files a return (status moves to `done`), then later confirms with the authority that it was accepted. Today the only way to mark it complete is to dig into the legacy status dropdown — easy to miss, and the language ("paid") doesn't fit non-payment returns like 1099 informational filings.

This slice surfaces the transition as a one-click action in the drawer header. Closes the "Filed ≠ Done" loop the brief calls out as PDF anti-pattern #3.

## Change

### `apps/app/src/routes/obligations.tsx`

**New local mutation in `ObligationQueueDetailDrawer`:**

```ts
const markAcceptedMutation = useMutation(
  orpc.obligations.updateStatus.mutationOptions({
    onSuccess: (result) => {
      invalidateDetail()
      toast.success(t`Marked accepted`, {
        description: t`Audit ${result.auditId.slice(0, 8)}`,
      })
    },
    onError: (err) => {
      toast.error(t`Couldn't mark accepted`, {
        description: rpcErrorMessage(err) ?? t`Please try again.`,
      })
    },
  }),
)
```

Reuses the existing `updateStatus` ORPC endpoint — no new server contract. The transition matrix (slice 2a) already permits `done → completed` and `paid → completed`, so the server-side guard catches any illegal entry path automatically.

**SheetHeader now flexes title against an action slot:**

```tsx
<SheetHeader className="border-b border-divider-subtle">
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0 flex-1">
      <SheetTitle>{row?.clientName ?? <Trans>Obligation detail</Trans>}</SheetTitle>
      <SheetDescription>
        {row ? `${row.taxType} - ${formatDate(row.currentDueDate)}` : null}
      </SheetDescription>
    </div>
    {lifecycleV2 && row && (row.status === 'done' || row.status === 'paid') ? (
      <Button
        size="sm"
        onClick={() => markAcceptedMutation.mutate({ id: row.id, status: 'completed' })}
        disabled={markAcceptedMutation.isPending}
      >
        <CheckCircle2Icon aria-hidden="true" />
        <Trans>Mark accepted</Trans>
      </Button>
    ) : null}
  </div>
</SheetHeader>
```

### Visibility rules

The button only renders when **all three** are true:

1. `?lifecycle=v2` flag is on — keeps legacy users on the dropdown
2. Detail row has loaded
3. Current status is `done` (filed) **or** `paid` (legacy state that folds into `completed`)

Both source statuses are covered because the v2 6-state model collapses `done`+`paid` into `filed → completed`. Pre-migration rows with `status='paid'` would otherwise have no path to `completed` until the data migration in slice 3.

### Why `CheckCircle2Icon`

Same icon used elsewhere in the codebase for "this is done" affordances. Filled circle reads more decisive than `CheckIcon` (just a tick) — appropriate for a terminal-state transition.

## What you see at `?lifecycle=v2`

Open any obligation drawer where the row has `status='done'` (a filed return). Top-right of the header, next to the close button:

```
┌─────────────────────────────────────────────────────────┐
│ Sarah Martinez                       [✓] Mark accepted │
│ Form 1065 - May 19, 2026                                │
└─────────────────────────────────────────────────────────┘
```

Click → toast "Marked accepted · Audit a1b2c3d4" → status pill flips to **Completed** → button disappears (current status is now `completed`, no longer matches the visibility rule).

If status is anything other than `done`/`paid`, the header looks unchanged.

## What's not in this slice

- **2d.1** (readiness → blocked) and **2d.2** (e-file → filed) auto-transitions — separate slices.
- **Confirmation step** — the click is immediate. Considered an `AlertDialog` ("Mark this filing as accepted?") but rejected: the transition is reversible via the status dropdown (`completed → ...` is admin-only today, but the legacy `done → review` unwind covers the rejection case), and the brief calls for "one click" explicitly. Audit log captures actor + timestamp for forensic recovery.
- **Bulk "Mark accepted"** from the queue selection toolbar — defer to slice 2e if user demand surfaces.
- **Auto-prompt** when an e-file acceptance webhook lands — that's slice 2d.2's job, separate path.

## Verification

- `pnpm check` — 0 errors, 0 warnings.
- `pnpm test` — all packages pass (auth 17, ai 13, ui 72, db 182, server 203, app 40 suites).
- Manual: opened a `done` obligation drawer at `?lifecycle=v2`, clicked the button, observed status pill flip to Completed and Timeline tab show a new audit entry.
