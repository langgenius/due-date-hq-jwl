# Wire the active-alert count to one authoritative source

Date: 2026-06-08

Yuqi: "you need to wire them correctly." After unifying the count chip's _look_,
the _numbers_ still disagreed — the sidebar nav badge showed 8, the /alerts header
pill and the detail rail head showed 7.

## Root cause

"Active" has an authoritative server definition (`countActiveAlerts`,
`packages/db/src/repo/pulse/scoped.ts`): `status IN ('matched','partially_applied')`

- pulse approved + not expired, exposed as `orpc.pulse.activeCount`.

* Sidebar badge correctly read that endpoint (= 8).
* The header + rail computed their own count by filtering `status === 'matched'`
  on `listAlerts(50)` rows — which drops `partially_applied`, ignores the
  expiry/approval scoping, and is capped at the list limit (= 7).

## Fix

- New shared hook `useActiveAlertCount()` in `features/alerts/api.ts` wrapping
  `orpc.pulse.activeCount`.
- `routes/alerts.tsx` header and `AlertListRail` head now call it (removed the
  ad-hoc `matched` filters; the rail's Unresolved _tab_ still filters rows).
- `app-shell-nav.tsx` dropped its private copy of the hook and imports the shared
  one — one definition feeding all three surfaces.

## Verify

tsgo clean; `/alerts` sidebar badge, header pill, and detail rail head all read
"8 active" at 1512×861.
