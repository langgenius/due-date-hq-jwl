---
title: 'Re-critique punch-list + confirmation gates for hard-to-undo actions'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: clarify+audit
---

# Re-critique fixes + confirm gates for hard-to-undo actions

## Why

Two things landed in this batch:

1. **Three follow-ups from the 23-commit re-critique** — bugs and
   gaps surfaced when walking what shipped, none of which is worth
   its own commit but each worth fixing before another batch
   stacks on top.
2. **Confirmation gates on three hard-to-undo actions** — actions
   that fired a destructive mutation on a single click with no
   pre-action signal. The product already had a strong pattern
   (`AlertDialog` + `DestructiveChangePreview`, used for member
   remove + role downgrade); this just extends it to the gaps.

## What changed — re-critique follow-ups

### 1. `/` hotkey now works when the search box is collapsed

`apps/app/src/routes/obligations.tsx`

The Obligations queue search control collapses to a magnifier-only
button on first render (when no `?q=` is in the URL). The `/` hotkey
called `searchInputRef.current?.focus()`, but `inputRef.current` was
`null` because the `<Input>` element wasn't mounted — so the shortcut
silently no-op'd. Linear/Slack convention says `/` should always
land focus.

**Shape:** Lifted the `open` state out of `ObligationQueueSearchControl`
into the route. The hotkey now calls `setSearchOpen(true)` then
`requestAnimationFrame(() => searchInputRef.current?.focus())` —
the input mounts, then focus lands. The button-click expand path
already used the same RAF pattern, so the two entry points now share
the same expansion mechanism.

Pre-existing bug — not a regression from the useEffect cleanup, but
fixing it in the same area felt natural.

### 2. `opportunity.*` audit events get their own category

`packages/contracts/src/audit.ts`, `packages/db/src/repo/audit.ts`,
`packages/ports/src/shared.ts`, `apps/app/src/features/audit/audit-log-{model,page}.ts(x)`,
`packages/contracts/src/contracts.test.ts`

`AuditActionCategorySchema` was missing `'opportunity'`. So when a
reviewer filtered the audit log by category, opportunity dismissal
/ snooze / restore events disappeared from view (they fell through
into the "system" exclusion bucket, which is for events that match
no known prefix).

Three places needed the addition: the contracts enum (single source
of truth), the local copy in `packages/db/src/repo/audit.ts`, and the
local copy in `packages/ports/src/shared.ts`. Plus the UI category
options + the test that pins the enum order. The repo's
`CATEGORY_PREFIXES` map now also has `opportunity: ['opportunity.']`.

### 3. `humanizeOpportunityKey` produces "Retention check-in"

`apps/app/src/features/opportunities/opportunities-page.tsx`

The label for a dismissed opportunity was title-casing every
underscore-segment:

- `'retention_check_in'` → "Retention Check In" (looked like a
  product name)

The function comment promised "Retention check-in" — the editorial
form. Now it capitalizes the **first** segment only and joins the
remainder with hyphens, matching the natural English form.

## What changed — confirm gates

Three new `AlertDialog`s following the existing pattern. All three
guard hard-to-undo or hard-to-explain actions.

### Calendar — Regenerate URL + Disable feed

`apps/app/src/features/calendar/calendar-page.tsx`

Both actions previously fired on a single click. Regenerate is the
sharper one: it silently invalidates any URL already deployed in a
user's Google/Apple/Outlook calendar, with no notification to the
subscriber — the feed just stops syncing. Disable is a less surprising
break (the user knows they hit Disable) but the URL can't be revived
on re-enable, so old subscriptions still need to be re-pointed.

Both now go through `AlertDialog` + `DestructiveChangePreview`:

- **Regenerate URL**:
  - Removes: the current URL on every subscribed device
  - Adds: a fresh URL — same scope, same privacy mode
  - Keeps: the events themselves
- **Disable feed**:
  - Stops: calendar sync on every subscribed device
  - Adds: nothing — re-enabling later issues a brand-new URL
  - Keeps: deadlines and assignments inside DueDateHQ

Mirrors the existing `Remove member` dialog: destructive-primary CTA,
explicit "Cancel" path, on-settled-close so the dialog stays open
during the network roundtrip and clears itself only after success
or error.

### Members — Cancel invitation

`apps/app/src/features/members/members-page.tsx`

Cancel was an inline text-button next to "Resend" — same visual
weight, opposite outcome. A misclick invalidated the magic link the
recipient might be in the middle of opening, with no recovery.

Added a small confirm dialog (just title + description + cancel /
confirm — no `DestructiveChangePreview` because cancel-invite isn't
on the same severity tier as Remove). The description names the
invitee email so the user knows exactly which one they're killing:

> The magic link sent to {email} will stop working. You can
> re-invite them later, but the original link can't be revived.

### Clients — Bulk status change on filing-plan

`apps/app/src/features/clients/ClientFactsWorkspace.tsx`

The floating bulk-action bar's status dropdown applied the new
status instantly across every selected row. A stray year-level
checkbox plus a dropdown click could move dozens of deadlines with
zero pre-action signal — and although the move is reversible
through the same control, the cascade of audit-log entries it
creates isn't.

Now staged through an `AlertDialog`. The title scales with the
count:

- 1 selected → "Move this deadline to {status}?"
- N selected → "Move N deadlines to {status}?"

CTA mirrors: "Move deadline" / "Move deadlines". Description
explains that each row gets a status-change audit entry and that
the move is reversible through the same control. No
`DestructiveChangePreview` here — the action's tone is "are you
sure this is the cascade you wanted?", not "you're about to
destroy data".

## What I considered but didn't add

- **Mark all read** (Inbox). Bulk action across many items, but the
  read state is the read state — undo is "mark them unread" via the
  individual notification, but in practice nobody does that. Modern
  apps universally fire this without confirm. Skipped.
- **Single Dismiss** on an Opportunity. Reversible through the
  Recently dismissed disclosure right below the list. Adding a
  confirm here would feel paranoid. Skipped.
- **Reject pending rule** in the review modal. Already has the form's
  internal validation; the rejected rule remains in the rules list
  and can be re-opened. Hotkey `'R'` is a concern but `useAppHotkey`
  ignores editable targets, so accidental triggering inside an
  input is already handled. Skipped — but flagged as a future
  product call if firms start using the hotkey heavily.
- **Suspend / Reactivate member**. Reactivate is additive. Suspend
  is reversible. Both already surfaced through dropdown items
  inside a menu (two clicks already), not single-click. Skipped.

## Verification

- `pnpm check` → 1380 files formatted, 654 lint+type clean.
- `pnpm --filter @duedatehq/contracts --filter @duedatehq/app test` →
  26/26 + 295/295 green.
- Manual smoke (deferred to in-browser walk after sync-mirroring):
  press `/` on a fresh /obligations page; click Regenerate URL on
  the calendar page; click Cancel on a pending invitation; select
  multiple filing-plan rows and Move to status.

## Files touched

### Re-critique fixes

- M `apps/app/src/routes/obligations.tsx`
- M `apps/app/src/features/opportunities/opportunities-page.tsx`
- M `apps/app/src/features/audit/audit-log-model.ts`
- M `apps/app/src/features/audit/audit-log-page.tsx`
- M `packages/contracts/src/audit.ts`
- M `packages/contracts/src/contracts.test.ts`
- M `packages/db/src/repo/audit.ts`
- M `packages/ports/src/shared.ts`

### Confirm gates

- M `apps/app/src/features/calendar/calendar-page.tsx`
- M `apps/app/src/features/members/members-page.tsx`
- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
