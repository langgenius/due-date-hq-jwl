---
title: 'Calendar sync hides pre-subscription dropdown · Members drops dead column (clarify)'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: app-shell
---

# Two small dead-affordance polish items (critique /polish)

## Why

Two micro-fixes called out in the critique's "minor observations"
that landed in the same review scope.

### 1. Calendar sync — dropdown + two buttons did the same job

`/calendar` rendered, in this order, when no subscription was
active:

- **Privacy** dropdown (Redacted / Full)
- **Enable redacted feed** button (primary)
- **Enable full feed** button (outline)

Three ways to choose the same value. The dropdown's
`onValueChange` is wired to `onEnable(value)` so picking
"Full client names" from the picker immediately creates a feed —
identical to clicking "Enable full feed". A user looking at the
trio doesn't know which one is the real CTA.

### 2. Members — "Last active" column showed "Not recorded" on every row

The server doesn't track `lastActiveAt` yet, so the column
existed entirely to render the literal string "Not recorded" 5
times on the demo seed (and N times in any practice). A column of
"Not recorded" eats horizontal real estate to tell the user
nothing.

## What changed

### `apps/app/src/features/calendar/calendar-page.tsx`

The Privacy dropdown now only renders when `activeSubscription`
is truthy — i.e. when the feed already exists and the user wants
to swap mode. Pre-subscription, the buttons are the sole choice,
and they read what they do.

Once an active subscription exists, the dropdown returns as the
mode-swap control (clicking another option calls `onEnable` with
the new mode and the feed regenerates server-side).

### `apps/app/src/features/members/members-page.tsx`

Dropped the **Last active** TableHead and the matching TableCell.
Both columns gone until the backend grows a `lastActiveAt` field;
in-code comment marks the restore point so a future PR can put
the column back as a one-line revert.

## What was considered and not done

### Role-change confirmation dialog

The critique flagged: _"Member ROLE dropdowns are inline and Active
state visible — but no confirm step on role change. Owner →
Coordinator is a significant downgrade. Add confirm."_

The page already has the right primitive (`AlertDialog` is used
by the Remove flow with `DestructiveChangePreview`). Wiring a
`pendingRoleChange` state machine for downgrades-only is a
medium-sized refactor (not just a one-line gate). Worth doing —
but as its own change, not buried in this batch. Logged as a
follow-up.

## How to verify

`/calendar` with no active subscription (default for the demo
seed): the page renders just the two Enable buttons — no
duplicate dropdown above.

Then click **Enable redacted feed**, refresh: the dropdown
returns as the mode-swap, the buttons are replaced by Regenerate +
Disable.

`/members`: the table now ends at the **Joined** column. The
right-edge action menu (the `…`) is now adjacent to Joined with
no empty noise column between them.

## Files touched

- M `apps/app/src/features/calendar/calendar-page.tsx`
- M `apps/app/src/features/members/members-page.tsx`
