# Dev log — sidebar default: only Today expanded, every other page collapsed (2026-06-09)

Behavioral change to the sidebar collapse state machine. Previously the rail
defaulted **expanded** on every page (and every nav click force-expanded). Now the
default is **route-driven**: Today (`/`) lands expanded; every other route lands
collapsed. Verified live across nav, manual toggle, and hard reload.

Touches `packages/ui/src/components/ui/sidebar.tsx` (provider) and
`apps/app/src/components/patterns/app-shell.tsx` (route wiring). No data/contract
changes.

## State model (`SidebarProvider`)

New precedence:

```
collapsed = manualOverride ?? (routeCollapsed || autoCollapsed)
```

- **`routeCollapsed`** — the per-page default. Set by the app shell on every
  navigation: `false` on `/` (Today), `true` everywhere else. Seeded from the
  initial landing path so a non-Today reload starts collapsed with no
  expand→collapse flash. Session-only, never persisted.
- **`manualOverride`** (`true | false | null`) — the user's explicit toggle for
  the **current page only**. Replaces the old `userCollapsed`. Cleared on every
  navigation (`setRouteCollapsed` resets it), so an override never leaks to the
  next page.
- **`autoCollapsed`** — unchanged channel still driven by panel surfaces
  (`obligations.tsx`, `AlertDetailDrawer`, `ClientDetailDrawer`, `coverage-tab`,
  `ImportHistoryDrawer`). With the route default now collapsing every non-Today
  page, `autoCollapsed` only matters on Today (which has no panel). Crucially,
  because `routeCollapsed` is OR'd in, a panel's `setAutoCollapsed(false)` (panel
  closed) can **no longer expand** a non-Today page — fixing the conflict that
  would otherwise pop the rail open when a detail drawer closes.

`toggleCollapsed` now just pins `manualOverride = !collapsed`.
`notifySidebarNavigation` no longer force-expands — it drops the override + hover
so the destination lands at its route default (clicking "Deadlines" lands
collapsed, since Deadlines isn't Today). The old `blockNextAutoCollapse` one-shot
ref is removed (it only existed to absorb the destination's auto-collapse after a
force-expand, which no longer happens).

## Route wiring (`app-shell.tsx`)

- `AppShell` seeds `<SidebarProvider initialRouteCollapsed={pathname !== '/'}>`.
- New module-level `SidebarRouteSync` (rendered inside the provider, alongside
  `SidebarKeyboardBindings`) runs `setRouteCollapsed(pathname !== '/')` on every
  pathname change.

## Verified (dev preview, `data-collapsed`)

| Action                   | Result                               |
| ------------------------ | ------------------------------------ |
| Land on Today `/`        | expanded                             |
| Nav → `/alerts`          | collapsed                            |
| Nav → back to Today      | expanded                             |
| Manual toggle on Today   | collapsed (override holds)           |
| Nav → `/clients`         | collapsed                            |
| Nav → back to Today      | expanded (override cleared, no leak) |
| Hard reload on `/alerts` | collapsed (seed, no flash)           |
