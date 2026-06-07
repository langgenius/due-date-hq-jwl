# Settings — Permissions role matrix (Pencil fuEMm)

Date: 2026-06-07

New route `/settings/permissions` implementing the Pencil role-matrix
canvas. Functional + pixel pass with a shared settings sub-nav.

## What shipped

- `apps/app/src/features/settings/settings-sub-nav.tsx` — shared
  `SettingsSubNav` (Profile / Team / Permissions / Reminders /
  Notifications / Billing) + `SettingsShell` two-column scaffold (sticky
  rail + scrolling content, stacks at mobile). Each entry points at the
  route that already owns the surface (`/members`, `/reminders`,
  `/notifications/preferences`, `/billing`). Active item derives from the
  path via `NavLink`.
- `apps/app/src/routes/settings.permissions.tsx` — the matrix:
  scopes (Clients / Deadlines / Rules / Alerts / Billing / Members /
  Audit log) × actions (View / Create / Edit / Delete / Approve /
  Export). Header role selector switches the displayed column across all
  five firm roles (owner shown for reference).
- Registered both routes in `router.tsx`; added `settingsProfile` +
  `settingsPermissions` route summaries.

## Functional wiring

- Cells are computed from the **real** permission model
  (`FIRM_PERMISSION_ROLES` + `hasFirmPermission`) in
  `@duedatehq/core/permissions` — not fabricated. Each (scope, action)
  maps onto the single `FirmPermission` that actually governs it; the
  backend model is coarser than a full CRUD grid, so actions with no
  distinct permission render an inert "—" cell instead of a fake toggle.
- Member counts per role come from `members.listCurrent` (active members
  only), feeding the role-selector subtitles and the footer summary.
- Coordinator dollar-visibility (`coordinatorCanSeeDollars`) flows
  through `hasFirmPermission` so the matrix respects that firm setting.

## TODO(data)

- No per-role override store / save mutation exists — the role→permission
  map is the single source of truth, so this surface is **read-only**.
  Save / Discard are rendered disabled (no no-op handler) and a notice
  explains overrides aren't available yet. Wire to an override RPC when
  the contract lands.

## Pixel compromises

- The canvas shows an amber "3 overrides on Preparer defaults" banner +
  "Revert to defaults" button. With no override backend that copy would
  be fabricated, so the banner is repurposed into an honest read-only
  notice using `bg-background-section` (no new amber theme token).
- Cell check/cross pills use `bg-state-success-hover` / `text-text-success`
  and `bg-background-section` / `text-text-muted` mapped from the canvas
  green/grey fills (tokens only, no raw hex).
