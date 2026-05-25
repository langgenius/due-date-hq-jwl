# 2026-05-24 — Drop three "coming soon" stubs from client overflow menu

## Why

Same audit pass as the Unassigned-pill / Add-filing-state fix earlier
today. Yuqi: _"Don't put nonworking things."_

The `···` overflow menu on the client detail header listed four
actions, three of which were stubs that only fired a toast saying
"Pin to sidebar is coming soon" / "Download client PDF is coming
soon" / "Edit client info is coming soon". They looked clickable, but
delivered zero value — three slots in a discovery surface burned on
mock CTAs that the CPA gets nothing from.

Better: hide them until the real features land. The menu now only
shows "View audit log" (the one item that actually does something).
If the user lacks audit-read permission, the whole `···` button
disappears (no point rendering an empty dropdown).

## What changed

`apps/app/src/features/clients/ClientFactsWorkspace.tsx`

- Deleted three placeholder `DropdownMenuItem`s + the
  `announceComingSoon` helper that powered them.
- Hoisted the `canReadAudit === false` guard up to the component
  root so the whole `ClientHeaderOverflowMenu` returns `null` when
  there's nothing to show.
- Dropped now-unused icon imports (`PinIcon`, `DownloadIcon`,
  `PencilIcon`).
- Tightened the `ClientOwnerHeaderPill` empty state — the previous
  "No assignable members" disabled row gave the user no path
  forward. Now reads "No teammates yet — invite from Settings"
  with a `title` tooltip pointing at Settings → Members.

## Verification

- `pnpm exec tsc --noEmit` clean.
- `vp lint` 0/0.
- Net -42 lines.
