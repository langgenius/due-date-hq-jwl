---
title: 'Pulse dismiss/snooze stop using window.prompt() on the list page'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: clarify
---

# Pulse list-page dismiss/snooze → shared PulseReasonDialog

## Why

While walking surfaces I hadn't reviewed in this session, the
`/rules/pulse` list page (`AlertsListPage.tsx`) had two
`window.prompt()` calls — one for snooze-reason, one for dismiss-
reason. The browser-native prompt is hostile in this product
context:

- System-styled (not the app's font / color / spacing).
- Blocks the entire page synchronously — keyboard shortcuts that
  fire elsewhere stop working.
- Single-line input only — Pulse reasons go straight into the
  audit trail and benefit from multi-line breathing room.
- No character counter, no validation, no placeholder hint
  appropriate to the action (dismiss vs snooze have different
  semantics — dismiss is about relevance, snooze is about
  timing).
- No name of the alert the action targets — the user has to keep
  mental track of which row they're acting on.
- The drawer surface (`PulseDetailDrawer`) ALREADY had a proper
  `PulseReasonDialog` for the same flow. So the list-page and
  drawer disagreed about how to gather reasons for the same
  audit-trail-bound action.

## What changed

### Extracted `PulseReasonDialog` to a shared component

`apps/app/src/features/pulse/components/PulseReasonDialog.tsx` (new),
`apps/app/src/features/pulse/PulseDetailDrawer.tsx`,
`apps/app/src/features/pulse/AlertsListPage.tsx`

Moved the drawer's local `PulseReasonDialog` to its own file and
exported it. Both surfaces now import it. The component is fully
controlled (parent owns `action` + `reason` + `pending`) — it
never calls a mutation itself, so callers stay in charge of the
post-submit invalidate / toast / close flow.

The shape preserves the drawer's existing behavior verbatim:

- 500-char textarea with live counter
- action-aware placeholder ("Why is this alert not relevant?" vs
  "Why snooze — what unblocks it tomorrow?" vs "What did you
  review?")
- action-aware CTA label
- Cancel / Save footer
- `autoFocus` on the textarea so the user can start typing
  immediately
- `disabled` on every control while `pending`

### Wired the dialog into `AlertsListPage`

The list page now stages snooze/dismiss through a small
`reasonState` (action + alertId) + `reasonText` state pair —
mirrors the drawer's pattern. The `PulseAlertCard`'s
`onSnooze` / `onDismiss` callbacks just open the dialog; the
dialog's `onSubmit` reads `reasonState` and routes to the right
mutation.

The list page only exposes `dismiss` and `snooze` — `reviewed`
stays drawer-only because it depends on the affected-client
selection state the drawer holds. The component supports the
`reviewed` action; the list page just never opens the dialog
with that action.

### Replaced `window.alert()` in the audit-log export error path

`apps/app/src/features/audit/audit-log-page.tsx`

Same hostility, lower stakes — a failed audit-export request
showed a `window.alert()`. Replaced with the app's `toast.error`

- rpc-error-message description. Consistent with how the rest of
  the app surfaces mutation failures.

## Verification

- `pnpm check` → 1383 files formatted, 655 lint+type clean.
- `pnpm --filter @duedatehq/app test` → 295/295 green.
- Manual smoke (deferred to browser walk): open /rules/pulse,
  hit Dismiss on a matched alert; the new Dialog should appear
  with a textarea, character counter, and proper Cancel / Dismiss
  footer. Same for Snooze.

## Files touched

- A `apps/app/src/features/pulse/components/PulseReasonDialog.tsx`
- M `apps/app/src/features/pulse/PulseDetailDrawer.tsx`
- M `apps/app/src/features/pulse/AlertsListPage.tsx`
- M `apps/app/src/features/audit/audit-log-page.tsx`
