---
title: 'Reconcile the three sidebar/Today/Pulse alert counts'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: app-shell
---

# Sidebar Alerts badge: one truth instead of three (critique P0)

## Why

The critique flagged a trust-breaking inconsistency: the word "alerts"
counted three different numbers in three places.

| Surface                       | Count seen | Source                                                      |
| ----------------------------- | ---------- | ----------------------------------------------------------- |
| Sidebar `Alerts N` badge      | **2**      | `useInboxUnreadCount` → `notifications.unreadCount`         |
| `/` Today "Alerts N" header   | **3**      | `usePulseListAlertsQueryOptions(5)` → `pulse.listAlerts`    |
| `/rules/pulse` page card list | **4**      | `usePulseListHistoryQueryOptions(50)` → `pulse.listHistory` |

`useInboxUnreadCount` returns the unified Inbox unread total —
@-mentions, status notifications, audit-package-ready, system events.
None of those are Pulse alerts; they happened to overlap by accident
on this seed (and were silently going to diverge as more notification
categories ship — already flagged by the in-source TODO at
`app-shell-nav.tsx:534`).

The Pulse-page count is intentionally a broader **history** view —
fine to differ, but the sidebar and Today both claim the daily
"how many active Pulse alerts" surface and must agree.

## What changed

### `apps/app/src/components/patterns/app-shell-nav.tsx`

- New hook `useActivePulseAlertCount` pulls from `pulse.listAlerts`
  with the same `limit` Today uses, so the two surfaces share a
  single React Query cache entry. Replaces `useInboxUnreadCount`
  for the sidebar Alerts badge only — the bell popover still uses
  the inbox-wide unread count (different concept; it's the unified
  Inbox after all).
- Added `SIDEBAR_PULSE_LIMIT = 50` constant alongside
  `CLIENTS_LIST_INPUT`, mirrored in `needs-attention-section`.
- Imported `usePulseListAlertsQueryOptions` from
  `@/features/pulse/api`.
- Resolved the stale `TODO(alerts-vocab 2026-05-22)` block —
  comment now describes the cache-shared invariant instead of
  warning the future reader to fix it.

### `apps/app/src/features/dashboard/needs-attention-section.tsx`

Bumped the alert limit from 5 → `TODAY_ALERTS_LIMIT = 50`. Same
value the sidebar uses. The visible-card slice (`VISIBLE_ALERTS = 2`)
and the overflow tile (`+N more`) keep working off of the
`alerts.length` post-fetch, so the displayed UI is unchanged for
typical 1–5 active-alert workloads, but the count next to the
heading is now truthful when there are > 5 active alerts.

## How to verify

In the running app, with the demo seed:

- Sidebar: `Alerts 3`
- `/` Today: `Alerts 3`
- `/rules/pulse`: 4 cards listed (history view — intentionally broader)

Before this change the same surfaces read 2 / 3 / 4 respectively.

## Out of scope

- The Pulse history page's bigger count is a deliberate design
  choice (history vs active). If the discrepancy creates confusion
  in user testing, the page header could grow an "Active 3 ·
  History 4" two-up — separate change.
- Eventually `notifications.unreadCount` will gain a category
  filter (`pulse | mention | status | ...`). When it does, the
  sidebar could swap to `notifications.unreadCount({category:'pulse'})`
  and consolidate to a single endpoint. Not needed now —
  `pulse.listAlerts` already gives us the right count.

## Files touched

- M `apps/app/src/components/patterns/app-shell-nav.tsx`
- M `apps/app/src/features/dashboard/needs-attention-section.tsx`
