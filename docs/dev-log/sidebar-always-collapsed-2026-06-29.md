# Sidebar: always collapsed (Today no longer expands)

**Date:** 2026-06-29
**Files:** `apps/app/src/components/patterns/app-shell.tsx` (`AppShell`, `SidebarRouteSync`)

## Why

Yuqi: "keep the sidebar UX clean — it is always collapsed even on Today." The rail had a per-route
default that EXPANDED on the landing path (`/`) and collapsed everywhere else, so Today opened with a
wide labelled sidebar while the rest of the app showed the slim icon rail — inconsistent.

## What changed

- `AppShell` seeds `initialRouteCollapsed={true}` unconditionally (was `pathname !== '/'`), so a reload
  on any route — Today included — lands collapsed with no expand→collapse flash.
- `SidebarRouteSync` now `setRouteCollapsed(true)` on every navigation (was `pathname !== '/'`), so the
  rail re-collapses across all routes.

The manual toggle / `[` hotkey still expands the current page; it's cleared on the next navigation, so
the default everywhere is the clean collapsed icon rail.

## Verification

Live-verified: `/` (Today) and `/today` both land collapsed (icon-only rail). `tsgo` clean; no console
errors.
