# Navigation-pattern audit — fixes

**Date:** 2026-06-24
**Surfaces:** `apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx`,
`apps/app/src/features/alerts/AlertDetailDrawer.tsx`,
`apps/app/src/components/patterns/app-shell-nav.tsx`,
`apps/app/src/components/patterns/use-nav-v2.ts` (deleted).

Acting on the `/navigation-patterns` audit. The nav was fundamentally sound
(side-nav, real active states, breadcrumbs, separated utility nav); these close
the findings.

## #1 — Detail scroll-spy click-lag
The `Status · Materials · Record · Activity` strip on the deadline + alert
detail pages is a **scroll-spy table-of-contents** (clicking scrolls to a
section). The active underline is driven by `activeSection`, which only updated
once the smooth-scroll *settled* — so the marker lagged a beat behind the click.
Now both drawers **seed `activeSection` on click**, so the underline tracks the
click immediately; the onScroll handler still refines it as you scroll. (Kept
the slide-underline TOC styling — with accurate tracking it reads as intentional,
not a broken tab.)

## #2 — Converged the dual nav config
`useNavItems` / `NavGroups` carried a full **legacy** sidebar branch behind a
`useNavV2()` flag that was already default-on — so IA could differ by cohort
(legacy had Coverage first-class, a different order). Collapsed to the single
navV2 config and **deleted the legacy branch + `use-nav-v2.ts`**.
**Latent bug caught:** the `AlertsNotificationsBell` was rendered *only* in the
legacy footer → it was **unreachable under navV2**. Re-homed it into the navV2
footer (next to Audit log / Settings); verified live the bell now renders.

## #3 — "Audit" → "Activity" (disambiguation)
The deadline detail's **Audit** tab/section collided with the sidebar's
firm-wide **Audit log** (`/audit`). Renamed the tab label + section heading to
**Activity** (this deadline's history); the `HistoryIcon` already fit, and it
matches the existing analytics taxonomy (`'audit'` key → `'activity'`). The
"View in full audit log" link still bridges to the compliance record. (Revisits
the locked-4-tab *label* per the fix-all request; tab count/structure unchanged.)

## #4 — 8 destinations (no change)
Acknowledged as a watch-item, not a defect — grouped (primary / rules / practice
/ footer), within reason. Left as-is.

## Verify
`tsgo` app clean; `vp run @duedatehq/app#build` clean; `i18n:extract` 0-missing /
`compile --strict` passes (orphaned "Audit"/"Audit trail" + legacy "Operations"
strings dropped; "Activity" already in the catalog). Verified live: sidebar
renders all navV2 destinations + the bell; deadline detail nav reads
`Status · Materials · Record · Activity` with the underline tracking the active
section. Built across two streams (nav-converge agent + the drawer changes),
integrated via cherry-pick + central i18n regen.
