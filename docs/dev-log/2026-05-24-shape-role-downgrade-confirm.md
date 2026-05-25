---
title: 'Member role-change confirm gate on downgrades (shape)'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: members
---

# Confirm dialog before downgrading a member's role (critique /polish)

## Why

`/members` role dropdowns fired the role-change mutation instantly
on dropdown pick. A misclick on Priya's row — Partner → Coordinator
— silently stripped sign-off authority, member admin, and billing
access with no undo path beyond the audit log.

The critique flagged this as a P3 minor; the existing Remove flow
already has the right pattern (`AlertDialog` +
`DestructiveChangePreview`). Adopt that for downgrades; upgrades
and sideways moves still apply directly.

## What changed

### `apps/app/src/features/members/member-model.ts`

Two new exports:

- `ROLE_PRIVILEGE_RANK` — Owner 100 / Partner 80 / Manager 60 /
  Preparer 40 / Coordinator 20. Numerically scored so the gap
  between roles is testable.
- `isRoleDowngrade(from, to)` — returns true when
  `rank[to] < rank[from]`. Owner sits at 100 because the role
  control here never targets it (owner-only moves happen
  elsewhere).
- `roleDowngradeImpact(from, to)` — returns
  `{ removes, keeps }` strings that vary by the privilege gap
  crossed. Four cases:
  - Crosses both the partner (80→60) AND the manager (60→40)
    thresholds: removes member admin + billing + sign-off.
  - Crosses only the partner threshold: removes member admin +
    billing.
  - Crosses only the manager threshold: removes sign-off.
  - Crosses neither (lateral or near-lateral): generic "elevated
    workflow scopes" copy.

### `apps/app/src/features/members/member-model.test.ts`

Two new tests:

- `flags downgrades but not upgrades or sideways moves` — locks
  `isRoleDowngrade` semantics.
- `describes downgrade impact based on the privilege gap crossed`
  — locks all four `roleDowngradeImpact` branches.

### `apps/app/src/features/members/members-page.tsx`

- New state: `pendingRoleChange: { member, fromRole, toRole } |
null` — mirrors the existing `pendingRemoval` slot.
- `onRoleChange` callback for the active members table now looks
  up the member, calls `isRoleDowngrade`, and either:
  - Sets `pendingRoleChange` → opens AlertDialog (downgrade), or
  - Calls `updateRoleMutation.mutate({memberId, role})` directly
    (upgrade or sideways).
- `updateRoleMutation.onSuccess` clears `pendingRoleChange` so
  the dialog dismisses on the mutation completing.
- New `<AlertDialog>` block following the Remove dialog, with:
  - Title: "Downgrade member?"
  - Description: "{name} will drop from {fromLabel} to {toLabel}."
  - `<DestructiveChangePreview>` lines from
    `roleDowngradeImpact`.
  - Destructive-primary CTA: "Downgrade role".

## How to verify

`/members` with the demo seed:

1. Open Priya Shah's Role dropdown (currently **Partner**).
2. Pick **Coordinator** (a two-step downgrade across both
   thresholds).
3. Confirm dialog opens:
   - Title: _Downgrade member?_
   - Description: _Priya Shah will drop from Partner to
     Coordinator._
   - Removes: _Member admin, billing access, and review sign-off_.
   - Keeps: _Client assignments and existing work_.
   - Cancel + Downgrade role buttons.
4. Hit Cancel → no mutation, dropdown reverts to Partner on next
   render.
5. Re-open dropdown, pick **Coordinator**, click **Downgrade
   role** → mutation fires, dialog closes, dropdown now reads
   Coordinator.

For upgrades (pick Manager from Preparer): no dialog, mutation
fires directly. Same for sideways moves (Preparer → Coordinator
in a hypothetical seed where someone moves laterally — same rank
neighborhood — actually that's a downgrade too because Preparer
40 > Coordinator 20. The "sideways" case is only Preparer →
Preparer which the dropdown wouldn't let you do anyway).

Unit-test coverage:

```
pnpm --filter @duedatehq/app test member-model
```

5 tests, all green.

## What was deliberately not added

- **Confirm on upgrades.** Upgrades grant new privileges; that's a
  positive action and adding a confirm step would be friction-tax
  on the recipient and the actor.
- **Per-role custom copy.** Each downgrade has its own custom
  "removes" / "keeps" copy via the four-branch
  `roleDowngradeImpact` helper. Could add per-(fromRole, toRole)
  pair custom strings if a particular downgrade needs distinct
  language; deferred until product asks.
- **Component-level test for the dialog flow.** Base UI Select
  resists synthetic events in jsdom, so a full
  members-page render test would need a real browser harness.
  Unit-level test on the model covers the decision logic; the
  dialog wiring follows the proven Remove-dialog pattern
  verbatim, so the integration risk is bounded.

## Files touched

- M `apps/app/src/features/members/member-model.ts`
- M `apps/app/src/features/members/member-model.test.ts`
- M `apps/app/src/features/members/members-page.tsx`
