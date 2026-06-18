# Interaction-states: error paths (audit batch 2)

_2026-06-18_

Batch 2 of the [full-app audit](../Design/full-app-audit-2026-06-18.md). Root cause:
`queryClient` uses `throwOnError: false` (main.tsx), so a failed query only sets
`isError` — surfaces that branch on `isLoading` alone render their EMPTY state on
error ("error-as-empty"). Fixed the genuine cases.

## Fixes

- **`rules.library.tsx`** — the 4 core queries (`rules`/`coverage`/`sources`/`temporary`)
  fell back to `?? []` with no error branch → a failed load rendered the "no rules"
  empty state. Added `coreQueryError` + `refetchCoreQueries`, and an `isError` branch
  (destructive `Alert` + Retry) as the first body branch, above the empty/content
  render. Mirrors the canonical AlertsListPage list error.
- **`AlertHistoryView.tsx`** — `historyQuery` had no error branch → failure showed
  "No handled alerts match this view." Added an `isError` table row (message + Retry)
  between the loading and empty rows.
- **`notifications-page.tsx`** — `markAllRead` had `onSuccess` but no `onError`
  (silent), inconsistent with `markRead`. Mirrored `markRead`'s error toast.

## Corrected an audit false-positive

The audit flagged 4 members-page mutations (role/suspend/reactivate/remove) as
silent-on-error. They are NOT: members-page already aggregates
`updateRole/suspend/reactivate/remove/resend/cancel` errors into one `mutationError`
destructive `Alert` banner (members-page.tsx:402). Adding toasts would double-surface
(banner + toast), against "one home per fact" — so the members change was reverted.
Audit doc updated to note this.

## Verification

- `tsgo --noEmit` → 0 errors; `vp check` clean on tracked files.
- 3 new strings translated to zh-CN (无法加载规则 / 无法加载已处理的提醒 / 无法全部标为已读);
  `compile --strict` passes; extract+compile idempotent. ("Retry" already in catalog.)
