# Firm switcher in the account menu (2026-06-15)

Yuqi: "how to change the company? … currently we cannot change from the
sidebar."

## Gap
`firms.switchActive({firmId})` + `firms.listMine()` were fully implemented
server-side (validate access → set active firm on session → audit), but
deliberately unsurfaced — a code comment in app-shell-nav called the sidebar
firm header a "static workspace identity" and kept switching server-only.
So the only ways to switch were onboarding or the demo-login. Meanwhile the
bottom account chip already rendered a `⇅` ChevronsUpDown icon + the firm
name as a subtitle — promising a switcher that did nothing.

## Decision (asked Yuqi)
Placement: **bottom account menu** (the chevron already implied it; one menu
for "who and where I am" — Vercel/Supabase pattern). Not the top header (the
documented static-identity decision stands for the single-firm common case).

## Build (app-shell-user-menu.tsx)
- New `FirmSwitcherItems` + a "Practices" group in the account dropdown,
  rendered **only when `firms.length > 1`** — single-firm users keep the calm
  static identity, so this adds zero chrome for the common case.
- Reuses the `firms.listMine` query the layout already warms (no extra
  request). Each firm row: square firm avatar + name + role, check on the
  current one; the current firm is disabled (no-op), and all rows disable
  while a switch is in flight.
- `firms.switchActive` mutation on click → on success `window.location
  .assign('/')`. A hard reload is the clean, race-free way to re-enter a new
  firm's context: every query is firm-scoped, so soft-invalidating dozens of
  cross-firm keys is fragile — the conventional workspace-switch behaviour is
  a full reload. Errors toast and stay put.
- Sits above Language/Theme: "which workspace" outranks preferences.

## Verify
tsgo clean (confirms FirmPublic.id/.role). Live: account menu opens with no
regression and the Practices section is correctly HIDDEN for the single-firm
demo user. The multi-firm render is type-checked and mirrors the proven
DemoAccountMenuItems pattern, but couldn't be eyeballed here — demo users
each belong to one firm, so there's no multi-firm session to open. Needs a
multi-firm account to screenshot. zh-CN: 4 strings filled; strict compile
green, no drift.
