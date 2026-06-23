# Post-action behaviour audit

**Date:** 2026-06-23 · **Method:** multi-agent sweep (one agent per mutation
file, 38 files) against the canonical 5-criterion pattern from the /alerts
detail drawer: **toast · invalidate · in-flight guard · landing · audit-log**.

**165 action buttons audited · 43 deviations — 0 P0 · 6 P1 · 13 P2 · 15 P3.**
No critical defects. The dominant themes: (1) the in-card `StageActions` buttons
never receive `isPending`, and (2) success-toast omitted on a few bulk/
consequential actions.

## Scoreboard (na excluded)

| Criterion                    | Pass | Miss/partial                    |
| ---------------------------- | ---- | ------------------------------- |
| Toast (both branches)        | ~115 | ~20 (success-only / error-only) |
| Invalidate                   | ~95  | 3                               |
| In-flight guard              | ~110 | ~12                             |
| Landing (advance/close/stay) | ~70  | 0                               |
| Audit log                    | ~45  | 0                               |

## P1 — high impact

**Missing success toast on a bulk/consequential action**

- `Mark all notifications as read` — `alerts-notifications-bell.tsx:184` (error-only).
- `Add team note to alert thread` — `AlertTeamNotes.tsx` onSuccess (no success toast).
- `Request audit evidence package` — `audit-log-page.tsx` onSuccess (no confirmation).
- `Delete practice (confirm)` — `practice.tsx:275` — **no toast either branch**; onError only `setError` which renders OUTSIDE the open dialog → failed destructive delete shows zero feedback.

**onSuccess never invalidates the queries it changed**

- `Apply entity-type reclassification` — `ClassificationImpactDialog.tsx:199` (delegates freshness to parent only).
- `PenaltyInputDialog "Save changes"` — `dialogs.tsx:1046` (relies on caller's `onSaved`).

## P2 — meaningful

**Missing in-flight guard (in-card `StageActions` cluster — one shared fix)**

- Change status / Mark filed, Mark 8879 signed / Submit e-file, Update prep stage, Update review stage — all in `ObligationQueueDetailDrawer.tsx` via `StageActions.tsx`, guarded on footer/hotkey but NOT on the in-card buttons (StageActions takes no `isPending`). Thread the mutation `isPending` into `StageActions`.
- `Remove checklist item` — `ObligationQueueDetailDrawer.tsx:909` (row remove not disabled on pending → double-fire delete).
- `Assign / clear owner (sheet mode)` — sheet radio items + "Clear assignee" not guarded.
- `Bulk reassign owner` — `obligations.tsx` FloatingActionBar items lack `disabled={…isPending}`.
- `Load sample/demo data` — `clients.tsx:587` no guard → double-click seeds duplicate rows.

**Member-management toasts (members-page.tsx)**

- Suspend member, Remove member — no toast either branch. Resend invitation — success but no error toast.

**Billing**

- `Open Stripe billing portal` — no toast either branch (inline Alert only); justified but deviates.

## P3 — minor / mostly justified

- Undo-from-toast / banner TextLinks not guarded (sonner action can't disable mid-flight; idempotent-ish).
- Mark-all-read (notifications page) success-toast omitted (badge clears = implicit).
- Inline checklist edit / batch docs-received / pin-unpin omit success toast (defensible optimistic).
- `Send morning digest preview` doesn't invalidate `listMorningDigestRuns` (run won't show until refetch).
- Settings-table member actions use a shared `mutationError` Alert vs toast (consistent within page).
- `Create custom rule` invalidates only `rules.key()`, not obligations/dashboard/audit fan-out.
- `Copy AI recap` flips to "Copied" even if clipboard write rejects (no `.catch`).

## Systemic patterns (fix these to clear most of the list)

1. **`StageActions` never receives `isPending`** — one prop + disable closes 5 P2s.
2. **Success toast omitted on bulk/consequential actions** — uniform `toast.success` in onSuccess (keep optimistic toggles silent).
3. **Secondary triggers skip the guard the primary path has** — audit every mutation's FULL trigger set (toast actions, sheet dropdowns, bulk menus), not just the canonical button.
4. **A few mutations rely on the caller to invalidate** — co-locate invalidation with the mutation (Classification, PenaltyInput).

## Recommended fix order

1. The 6 P1s (toasts + the two invalidate gaps) — small, high-value.
2. The `StageActions` `isPending` thread (one change, clears 5 P2s).
3. The remaining P2 guards (checklist remove, sheet assign, bulk assign, sample-data seed).
4. P3s as a mechanical mop-up (optional; several are justified).
