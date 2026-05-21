---
title: 'Cross-surface client peek: hover-revealed eye icon on /clients rows AND /obligations rows'
date: 2026-05-21
author: 'Claude (Yuqi pairing)'
area: clients
---

# Cross-surface client peek

## Context

The Client detail drawer (`ClientDetailDrawer`, mounted via
`ClientDrawerProvider`) was added in commit `a745867` so users on
`/obligations` and `/dashboard` could glance at a client without
losing their triage context. But the affordance was only reachable
from one place: the **obligation drawer's** title (clicking the
client name in the open obligation drawer). From the **table rows
themselves**, there was no quick path to the client drawer — only
the row click, which opens the obligation drawer instead.

That made the drawer a second-class citizen: it existed, but you had
to open one drawer to find the entrance to another.

## Change

Add a hover-revealed peek icon (Eye) directly on every row that
shows a client name, in both surfaces. Clicking the icon opens the
client drawer in place. The row's primary click target is unchanged:

| Surface            | Row primary click                     | Peek icon click    |
| ------------------ | ------------------------------------- | ------------------ |
| `/clients` row     | Navigate to `/clients/[id]` full page | Open client drawer |
| `/obligations` row | Open obligation drawer                | Open client drawer |

The icon is:

- Visible only on row hover (or keyboard focus).
- 24–28 px hit area, right-aligned in the Client cell.
- `text-text-tertiary` resting, `text-text-primary` on hover.
- `aria-label={t``Peek ${clientName} details``}`, `title="Peek client details"`.
- `event.stopPropagation()` keeps the row's primary click intact.

On `/clients`, an additional ⌘-click / Ctrl-click shortcut on the
row also opens the drawer for power users.

## Files

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
  - Import: `EyeIcon`, `useClientDrawer`.
  - Hook: `const { openDrawer: openClientDrawer } = useClientDrawer()`
    at the top of the workspace.
  - Client cell now wraps name + radar badge in a flex row with a
    trailing `<button>` peek icon.
  - `<TableRow>` gets `group` class so the cell can `group-hover` the
    icon.
  - Row `onClick` branches on `event.metaKey || event.ctrlKey` to
    open the drawer instead of navigating.
- `apps/app/src/routes/obligations.tsx`
  - Import: `EyeIcon`.
  - Hook: `const { openDrawer: openClientPeekDrawer } = useClientDrawer()`
    in `ObligationQueueRoute` (alongside the existing
    `currentUserName` hook).
  - Client cell wraps the existing span in a flex row with a
    trailing peek button. Stop-propagation prevents the row's
    obligation-drawer click from firing.
  - `<TableRow>` gets the `group` class so hover reveals the icon.
  - `openClientPeekDrawer` added to the columns `useMemo` deps.

## Why both surfaces

A CPA looking at the obligations queue often needs to answer "wait,
which client is this and what's their state?" — currently a two-step:
open the obligation drawer, then click the client name in its header.
The peek icon makes it one click from the table row.

On `/clients`, the icon is the discoverable lane for the same pattern
the row's ⌘-click implements for power users — hover to learn the
affordance exists, then graduate to the keyboard shortcut.

The result: anywhere a client name appears in the app, a single
hover + click takes you to the same read-only glance. The drawer's
"Open full page" footer link is the escalation lane to deep work.

## Trade-offs and what we didn't do

- **Dashboard action rows are not yet wired.** The dashboard's
  `DashboardActionsList` renders client names too. Same pattern
  applies; left as a small follow-up.
- **No standalone "Open client" page link from the queue row.** The
  full-page client surface is still reachable via the drawer's
  footer link or the workspace's "Open" button — not duplicating it
  in the row to keep the cell clean.
- **Icon defaults to hidden, not always-visible.** Always-visible
  costs visual weight on a 50-row table. Hover-reveal is the
  established pattern (Linear, Notion, etc.) and the keyboard focus
  case is covered via `focus-visible:opacity-100`.

## Verification

- `pnpm check` — 1 error and 15 warnings on the branch. None in
  files I touched. The error is a pre-existing `as LibraryView`
  cast in the other session's `rules.library.tsx` WIP.
- The `useClientDrawer` hook is provided by
  `ClientDrawerProvider` mounted in `apps/app/src/routes/_layout.tsx`,
  so both call sites resolve cleanly.
- Manual trace: row click flow still goes to its original
  destination (page on `/clients`, obligation drawer on
  `/obligations`); peek icon stops propagation and opens the client
  drawer; drawer renders the existing `ClientDetailDrawer` content
  (read-only summary + alerts band + compliance posture + "Open full
  page" link).
