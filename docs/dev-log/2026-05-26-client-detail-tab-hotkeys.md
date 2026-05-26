---
title: 'Client detail: 1/2/3/4 tab hotkeys'
date: 2026-05-26
author: 'Yuqi pairing with Claude'
area: ux
---

# Client detail — number-key tab switching

Critique sources:

- `docs/Design/clients-detail-critique-2026-05-26-post-revamp.md` P2
  (tab keys)
- The 4-tab body was added 2026-05-22 but never picked up keyboard
  affordances; J/K cycles between clients but there was no way to
  switch tabs without reaching for the mouse.

## What ships

`1` / `2` / `3` / `4` switch between Work / Client info /
Opportunities / Activity respectively. Wiring lives in
`ClientDetailWorkspace`, right next to the `useQueryState('tab',
…)` that owns `setActiveTab`.

Each hotkey:

- uses `useAppHotkey` (the project's canonical hotkey primitive —
  same path J/K + `?` use)
- gates on `useKeyboardShortcutsBlocked()` so the shortcuts go
  quiet inside text inputs, dialogs, drawers — matches the
  `ClientCycleArrows` contract
- registers `meta` (id, name, description, category: `navigate`,
  scope: `route`) so the global `?` shortcut sheet auto-discovers
  them. No extra UI work needed for discoverability.

## Why number keys and not letters

Letters collide with the broader app vocabulary (G-prefix
navigations, future J/K-style sequences inside the panels). Number
keys map cleanly to "tab N" — there are only four tabs, and the
left-to-right order is fixed, so the mental model is exactly
"first tab = 1, second = 2, …". Matches how spreadsheet apps
number sheet tabs.

## On-screen affordance

None for now. The `?` sheet covers discoverability. If telemetry
later shows underuse, we can add inline `<kbd>` hints below each
TabsTrigger that fade in on hover — but adding visual chrome
before users have shown they want it would be premature.
