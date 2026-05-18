---
title: 'Sidebar identity cleanup — plan card out, user menu to header'
date: 2026-05-18
author: 'Claude'
area: app-shell
---

# Sidebar identity cleanup

## Context

After the
[Sidebar Tidy & Settings Hub](2026-05-18-sidebar-tidy-and-settings.md)
pass, the sidebar still carried three identity-related regions:

1. Firm switcher (top) with a meta-line `Owner · Pro · 5 seats`
2. Plan card (bottom) with `Pro · 5 seats · Manage` button
3. User row (bottom) with `[SM] Sarah Martinez · email`

Plan + seats was duplicated across (1) and (2). The firm-switcher meta
mixed three orthogonal concepts on a single breadcrumb — role (a
user-firm relationship), plan (a firm commercial fact), and seats
(another firm commercial fact). The Plan card was a navigation link
dressed as a status widget — clicking only deep-linked to
`/billing`. None of this was actionable in daily ops, but it occupied
the most-scanned surface in the app.

The four chrome questions the bottom-left was trying to answer:

- What workspace am I in? → firm switcher
- Who am I in this workspace? → mixed into firm switcher subtext
- What does this firm pay for? → duplicated in switcher subtext + Plan card
- Who am I as a user? → user row

The redesign collapses these onto exactly one surface per question.

## Change

- `app-shell.tsx` — delete `PlanStatusLink` and the entire
  `<SidebarFooter>` block. Move `<UserMenuTrigger>` out of the
  sidebar and into `<RouteHeader>` next to the notifications bell.
  `RouteHeader` now takes `user`, `firm`, `themePreference`,
  `switchThemePreference` so it can mount the trigger. `Sidebar`
  composition is now just `FirmSwitcherTrigger / Separator /
SidebarContent`.
- `app-shell-nav.tsx` — drop the role/plan/seats meta line from the
  firm-switcher trigger. `firmMeta()` is kept for use inside the
  switcher dropdown items (per-firm context still useful for
  multi-firm Sarah). Export `roleLabel` so the user menu can format
  the role for the new role-at-firm label line.
- `app-shell-user-menu.tsx` — convert `UserMenuTrigger` from a
  full-width sidebar row (avatar + name + email + chevron) to a
  28 px compact avatar button suitable for the header. The
  trigger now opens `align="end" side="bottom"`. Add a third line
  to the dropdown label — `${role} at ${firm.name}` — so role
  is visible inside the menu (the one place it shows up in chrome
  now). The old `UserAvatarWithStatus` helper is replaced with a
  `UserAvatar` that drops the online-presence dot (header avatars
  universally don't carry presence). `firm` is a new required
  prop.

## Sidebar/header shape (before → after)

```
BEFORE                              AFTER
──────                              ──────
[BD] Brightline Demo CPA            [BD] Brightline Demo CPA  ⌄
     Owner · Pro · 5 seats          Dashboard
─────                               Obligations
Dashboard                           Pulse                 [3]
Obligations                         Clients
Pulse                  [3]          Opportunities
Clients                             Rule library
Opportunities                       ─────
Rule library                        Settings
─────                               (no plan card)
Settings                            (no user row)
─────
[💳] Pro · 5 seats  [Manage]        Header right ──────
─────                                 ⌘K  🔔  [SM]
[SM] Sarah Martinez                 (UserMenuTrigger here,
     sarah.demo@duedatehq.test       avatar-only trigger, opens
                                     dropdown with name, email,
                                     "Owner at Brightline Demo CPA",
                                     Language, Theme, Demo account,
                                     Security, Sign out)
```

## Why this shape

1. **One fact, one place.** Plan/seats lives only inside the firm
   switcher dropdown (per-firm) and on `/billing`. Role lives only
   inside the user menu. Firm identity lives only in the firm
   switcher trigger. No double-renders.
2. **Identity scales inversely to focus.** Sarah's primary working
   surfaces are Dashboard, Obligations, Pulse — operational, not
   commercial. The chrome should not shout "you're Owner of a Pro
   plan with 5 seats" at her three times every glance.
3. **Universal top-right avatar pattern.** Linear, Stripe, GitHub,
   Notion, Vercel all put the personal account menu top-right.
   Moving the trigger there releases muscle memory rather than
   fighting it.
4. **Plan is an event, not ambient state.** A seat-cap or
   billing-attention banner can surface contextually when the plan
   becomes actionable; the rest of the time the user doesn't need
   to see it.

## Decisions made (and not made)

- **No top-bar firm switcher.** Option G2 considered moving the
  firm switcher into `RouteHeader`. Rejected for this pass — it's a
  bigger refactor than removing two chrome regions, and the current
  top-of-sidebar position matches Linear/Notion convention. Worth
  revisiting if/when we grow a breadcrumb pattern.
- **No always-on plan glance.** Option G1 considered slimming the
  Plan card to a 28 px row instead of deleting it. Rejected
  because the Plan card's only behavior is a link to `/billing` —
  one click via the user menu does the same thing, and seat-cap
  pressure should be handled by a future contextual banner, not
  ambient chrome.
- **Role appears once, in the user menu.** Not duplicated as a chip
  on the avatar or near the firm switcher. The firm-switcher
  dropdown items still carry per-firm role/plan/seats so a
  multi-firm Sarah can scan them when switching.

## Out of scope (next passes)

- Seat-cap / billing-attention contextual banner inside Dashboard
  (the safety net for losing the always-on plan glance).
- Top-bar firm switcher (Option G2) if the IA evolves to need a
  breadcrumb.
- Role chip on the avatar itself, if user testing shows people
  forget which role they're in across firms (currently you have
  to open the menu to see it).

## Validation

- `pnpm install` in this worktree (was a fresh worktree without
  node_modules).
- `pnpm --filter @duedatehq/app dev` started cleanly.
- Manual verification at `http://localhost:5173/`:
  - Sidebar shows `[BD] Brightline Demo CPA  ⌄` on a single line
    with no subtext; nav list flat; no bottom plan/user chrome.
  - Top-right header shows `⌘K  🔔  [SM]`. Clicking the avatar
    opens the dropdown with `Sarah Martinez / sarah.demo@... /
Owner at Brightline Demo CPA / Language / Theme / Demo
account / Security / Sign out`.
  - Firm switcher dropdown still shows per-firm meta:
    `Archive Solo Practice · Owner · Solo · 1 seat`,
    `Brightline Demo CPA · Owner · Pro · 5 seats`.
