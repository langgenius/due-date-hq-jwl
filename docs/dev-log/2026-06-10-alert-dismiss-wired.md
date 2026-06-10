# Alert detail — wire the dismiss action (handoff Phase 2)

**Date:** 2026-06-10
**Design source:** `docs/dev-log/2026-06-10-design-handoff-index.md` (Phase 2, item 4 —
"Dismiss handler wired — fix the lying keyboard hint")

## Problem

The alert detail footer rendered two keyboard hints — `A` Apply and `D` Dismiss —
plus the "Every decision captured to audit ledger" note, but **neither key had a
handler**. There was also no Dismiss button anywhere in the footer. The
`pulse.dismiss` mutation already existed server-side (audit-logged), so this was
purely a missing client wiring.

## Change (`apps/app/src/features/alerts/AlertDetailDrawer.tsx`)

- **`dismissMutation`** (`orpc.pulse.dismiss`) — `onSuccess` invalidates + toasts
  "Alert dismissed" + `onClose()` (dismiss resolves the alert, like apply); added
  to `isMutating`.
- **`canDismiss`** = alert still awaiting a decision (not applied / reviewed /
  reverted / dismissed / source-revoked) **and** `canApply` (so read-only users
  don't get it). `handleDismiss` fires the mutation when allowed.
- **Dismiss button** added to `DrawerActions`' left (secondary) cluster — ghost
  `size="sm"` with an X icon, gated on `canDismiss` (+ new `onDismiss` prop).
- **Keyboard effect** makes both hints real: `D` → dismiss (when open); `A` →
  the primary decision (Apply's verification gate, or Mark reviewed for
  review_only alerts — skipped while re-verification is incomplete, matching the
  footer button's gate). Ignores typing in inputs/textareas + modifier combos.

No new mutation, no contract change — the server endpoint + audit already exist.

## Verified

Live on `/alerts`: the Dismiss button renders enabled on an open alert; clicking
it fires the mutation and surfaces the "Alert dismissed" toast. `A`/`D` route
through the same handlers as the footer buttons. `tsgo` clean (the unrelated
`panels.tsx` error in the working tree is concurrent work, not part of this
change).

## Not done this slice (follow-ups in the handoff index)

- Status-chip timestamp suffix ("Dismissed · Mar 5") needs the Phase-1 contract
  migration (`dismissedAt` / `appliedAt` on `PulseAlertPublic`) — deferred.
- Swapping `DrawerActions` wholesale for the `DecisionActions` component — the
  drawer's footer has heavy permission/state gating; left intact, only the
  Dismiss affordance added.
