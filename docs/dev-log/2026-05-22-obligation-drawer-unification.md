---
title: 'Obligation drawer: workspace/picker split — panel inline on workspaces, navigate from pickers, Sheet retired'
date: 2026-05-22
author: 'Claude (Yuqi pairing)'
area: obligations
---

# Obligation drawer: unified to one in-page panel shape

## Context

Before today, the obligation detail drawer rendered as **three
different shapes** depending on launch surface:

| Launch surface                            | Render shape                                 |
| ----------------------------------------- | -------------------------------------------- |
| `/obligations` queue row                  | In-page panel (right column of route layout) |
| `/clients/[id]` filing plan               | Sheet modal overlay                          |
| `/dashboard` action row                   | Sheet modal overlay                          |
| Anywhere else via `useObligationDrawer()` | Sheet modal overlay                          |

The cross-product look was a real mental-model tax. CPAs who ride
between dashboard / clients / queue saw the same content render
in three different ways. Internal consistency per-surface was fine;
external consistency across surfaces was the problem.

Today's call: **one shape across the app — in-page panel. No Sheet
anywhere.** Routes are categorized into two roles:

1. **Workspaces** (`/obligations`, `/clients/[id]`) — the page where
   a CPA actually _does work on_ obligations. These own a panel
   mount inline in their layout.
2. **Pickers** (`/` dashboard, anywhere else) — the page where a CPA
   _surfaces what to act on_, then sends themselves to the workspace.
   Clicking an obligation here navigates to `/obligations?id=…&drawer=obligation`.

The queue is the canonical workspace; pickers route there.

## Change

### 1. Client detail (`/clients/[id]`) mounts the panel inline

[`apps/app/src/features/clients/ClientFactsWorkspace.tsx`](apps/app/src/features/clients/ClientFactsWorkspace.tsx)

- Read `obligationId`, `activeTab`, `setActiveTab`, `closeDrawer`
  from `useObligationDrawer()`.
- Layout becomes 2-column when an obligation is selected: client
  content (identity / alerts / summary / tabs) on the left, panel
  (480px at xl+) on the right. PageHeader spans full width above so
  prev/next arrows + breadcrumb switcher + action cluster stay
  anchored regardless of panel state.
- Mounted `<ObligationQueueDetailDrawer mode="panel" ... />` in the
  right column. Same component, same J/K hotkeys as the queue's
  panel.

### 2. Dashboard stays a picker

[`apps/app/src/routes/dashboard.tsx`](apps/app/src/routes/dashboard.tsx) **does not** mount a panel.
Clicking an action row calls `openObligationDrawer(row.obligationId)`,
which — since `/` is not in `routeOwnsPanel` — navigates to
`/obligations?id=…&drawer=obligation`. The queue loads with that
obligation's panel already open.

Why no inline panel: the dashboard's job description is "what should
I act on this week?" — it surfaces options, then sends you to the
workspace. The queue has J/K cycling, the full tabs, the K-1
blocked-by picker with real `blockerCandidates`, and the penalty
dialog. Mounting a degraded version of that on dashboard would have
been a worse experience than the navigation.

### 3. Provider retired its Sheet mount

[`apps/app/src/features/obligations/ObligationDrawerProvider.tsx`](apps/app/src/features/obligations/ObligationDrawerProvider.tsx)

- `routeOwnsPanel = isQueueRoute || isClientDetailRoute`. Two
  workspaces.
- **Removed the `<ObligationQueueDetailDrawer ... />` Sheet
  fallback render entirely.** The provider is now a pure state
  holder + navigator.
- New rule for `openDrawer(id)`:
  - On the queue → write URL state.
  - On a workspace that owns a panel (client detail) → set local
    state (panel reads it from context).
  - **Anywhere else (dashboard, Pulse, Cmd+K, future surfaces) →
    navigate to `/obligations?id=…&drawer=obligation`.**
- Removed now-unused `paidPlanActive`, `useFirmPermission`, and
  `ObligationQueueDetailDrawer` imports.
- Exposed `activeTab` + `setActiveTab` in the context so the panel
  mounts on the workspaces drive the same tab state regardless of
  where the obligation was opened.
- Docstring rewritten around the workspace/picker split.

## What stays the same

- All existing keyboard shortcuts (J/K on the queue, in-panel tab
  navigation, etc.) are unchanged — same `<ObligationQueueDetailDrawer>`
  component renders in both workspaces.
- Single-source-of-truth state: `obligationId` + `activeTab` live
  on the provider so navigation between workspaces stays in sync.
- The slim `ClientDetailDrawer` (client peek) is unrelated and
  unchanged.

## What stays intentionally distinct

- **`/clients` list row click → full page.** That's the _client_
  surface, not the obligation surface. The user explicitly chose
  page-first there. Unification is about obligation viewing, not
  client viewing.
- **Client peek icon → slim `ClientDetailDrawer` (Sheet).** That
  drawer is read-only for client context, separate code path,
  separate provider. Unifying it to a page panel is a separate IA
  decision.

## Trade-offs and what we didn't do

- **No URL state for the panel on client detail.** The obligation
  panel state is in-memory; refresh closes it. Adding `?obligation=ID`
  would make the panel deep-linkable but requires per-route URL
  plumbing. Deferred — same trade-off the client detail dev-log
  flagged yesterday.
- **No persistence of which tab was last viewed in the panel.**
  `activeTab` resets to 'readiness' on each `openDrawer(id)` call.
  Mirrors the previous Sheet behavior; could persist if usage shows
  it matters.
- **Limited context outside the queue.** When the panel renders on
  `/clients/[id]`, the K-1 blocked-by picker has no
  `blockerCandidates` and the `onNeedsInput` penalty dialog is a
  no-op. Users hitting those can navigate to `/obligations` via the
  panel's "Open in queue" affordance.

## Verification

- `pnpm check` — 1 error / 15 warnings on the branch. **None in
  any obligation- or dashboard-area file I touched.** Lone error
  is the pre-existing `as LibraryView` cast in the other session's
  `rules.library-v2.tsx`.
- No call site changes for `openObligationDrawer(id)` — the API is
  unchanged. The shape change is purely in the provider's mounting
  logic + the workspaces' layouts.

## Try it

1. Visit `/` (dashboard). Click any action row → browser navigates
   to `/obligations?id=…&drawer=obligation` and the queue loads
   with that obligation's panel already open on the right.
2. Visit `/clients/<id>` → click an obligation in the filing plan
   → panel slides in on the right of the client page, no
   navigation.
3. Visit `/obligations` → row click → URL updates, panel opens
   inline (the original behavior).
4. The same panel, same content, same shortcuts everywhere.

## Files

- `apps/app/src/features/obligations/ObligationDrawerProvider.tsx`
  — Sheet mount removed; routeOwnsPanel covers queue + client
  detail; navigate-fallback for picker / off-route callers;
  docstring rewritten.
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` —
  context hook reads expanded, layout splits into client content +
  obligation panel column.
- `apps/app/src/routes/dashboard.tsx` — uses `openDrawer(id)` as a
  navigation trigger (no inline panel; no layout split).
- `apps/app/src/features/dashboard/actions-list.tsx` — entire row
  becomes the click target so dashboard's job (pick → send to
  workspace) is one click, not hover-then-button.

## Follow-up

- Consider URL-persisting the obligation panel state on client
  detail (`?obligation=ID`) for shareability.
- If telemetry shows users routinely cycling obligations within
  the client detail panel, lift `activeTab` defaults from
  'readiness' to the last-viewed tab.
- If `/rules/pulse` ever opens an obligation, the navigate-fallback
  ensures it lands cleanly on `/obligations` with the panel
  showing.
