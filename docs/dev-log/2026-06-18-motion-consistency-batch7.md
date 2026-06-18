# Motion consistency (audit batch 7)

_2026-06-18_

Batch 7 of the [full-app audit](../Design/full-app-audit-2026-06-18.md) — converge
motion stragglers onto the existing system (the system itself is mature; this is
cleanup, not new design).

## Changes

- **Neutral-row hover token converged** — 12 sites used `hover:bg-background-default-hover`
  (opaque gray-50) vs the majority `hover:bg-state-base-hover` (cool translucent, 58
  sites). Renamed all 12 to `state-base-hover` so every neutral row/tile/menu-item
  shares one hover feel: `stat-band`, `stat-tile`, `settings-sub-nav`, `blocked-by-chip`,
  `ClientSummaryStrip`, `alerts-notifications-bell`, `queue/dialogs`, `Step3Normalize`,
  `settings`, `obligations`, ui `sidebar`.
- **Sheet easing** (`ui/sheet.tsx`) — was the only overlay off the full-surface-slide
  grammar (`transition duration-200 ease-in-out`); aligned to `duration-300 ease-apple`
  like the drawer/sidebar family. (The opacity-only entry — a documented Base-UI-bug
  workaround — is unchanged.)
- **Dead shadow tokens removed** — `--shadow-2xl` (48px blur) and `--shadow-3xl` (64px)
  had zero call sites and both exceed the restrained-shadow blur≥24 ceiling. Deleted
  (matches the precedent that removed callerless `--animate-spin-slow`).

## Verification

- `tsgo --noEmit` → 0 errors; `vp check` clean; `@duedatehq/app#build` exit 0
  (confirms the deleted tokens have no consumers and `state-base-hover` resolves).
- No i18n impact (class/token only).
