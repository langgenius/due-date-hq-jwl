# 2026-05-24 — Owner picker: trigger ↔ checked item disagreed

## Why

Screenshot from Yuqi: the H1 owner pill said "A. Rivera ⌄" but
opening the picker showed "Unassigned" as the checked option. The
picker was lying about who the actual owner is.

Root cause: the picker resolved the "currently selected" id by
reverse-looking up the member name. The H1 pill renders the
abbreviated name format ("A. Rivera"), while
`members.listAssignable` returns full names ("Avery Patel"). The
name comparison never matched, so the radio group fell back to
`__unassigned__`.

## What changed

`apps/app/src/features/clients/ClientFactsWorkspace.tsx`

- Added an `assigneeId` prop to `ClientOwnerHeaderPill` and passed
  `client.assigneeId` from the workspace. The radio group now keys
  off the id (the actual primary key), not the display name.
- Added a "former teammate" row that surfaces when the client's
  current assignee is no longer in the assignable list (e.g., they
  left the firm). Disabled + italicised so it can't be re-selected
  but the picker stays honest about who's currently assigned.
- Normalised the Unassigned avatar from `size-4` → `size-5` so all
  rows in the menu share a single visual rhythm (the first row no
  longer sits visually lower than the rest).

## Verification

- `pnpm exec tsc --noEmit` clean.
- `vp lint` 0/0.
- `vp test apps/app/src/features/clients/` 17/17.

## Note

Filed this as a separate commit from the earlier wire-up
(ffa0178b) so the bug + the fix have an honest history. The
original commit shipped the rewire but the lookup was wrong;
this commit makes the lookup correct.
