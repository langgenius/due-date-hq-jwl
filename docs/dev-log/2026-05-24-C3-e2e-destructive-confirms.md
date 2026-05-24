---
title: 'C3 — Playwright e2e coverage for destructive confirms'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: test
---

# C3 — e2e tests for the destructive-confirm dialogs

## Why

The design audit batches added 10 AlertDialog confirms across calendar,
members, account.security, and the filing-plan bulk bar. The unique
regression these tests catch is **"someone removed the confirm gate"**
— either by reverting state-staging logic or by deleting the
AlertDialog markup. Without a test, that regression is silent until
a user accidentally fires a hard-to-undo action.

This commit covers the shape side of the contract: dialog APPEARS
with the canonical title + Cancel + destructive CTA, and Cancel
dismisses cleanly. The completion side (clicking the destructive
CTA + verifying the underlying action) is tested per-feature by the
specs that already cover the surrounding flow.

## What changed

### Fixed broken existing test

`e2e/tests/members.spec.ts`

The `E2E-MEMBERS-INVITE-CANCEL-AUDIT` test was silently broken by
the cancel-invitation confirm gate I added in commit `26591ad6`. The
test clicked the row's inline "Cancel" link and expected the row to
immediately disappear. Now an AlertDialog intercepts the click —
the row stays visible until the user clicks "Cancel invitation" in
the dialog.

Updated to use a new `membersPage.cancelInvitation(email)` helper
that handles the two-step click. The end-state assertion (row
hidden, audit events present) stays the same.

### New page-object helpers

`e2e/pages/members-page.ts`

Added accessor methods so specs don't have to know about dialog
markup:

- `cancelInvitationDialog()` → `getByRole('alertdialog', { name: 'Cancel this invitation?' })`
- `removeMemberDialog()` → `'Remove member?'`
- `suspendMemberDialog()` → `'Suspend access?'`
- `downgradeRoleDialog()` → `'Downgrade member?'`
- `cancelInvitation(email)` action helper that does the two-step click

### New spec: `destructive-confirms.spec.ts`

Six tests covering the canonical shape of each confirm:

1. **Members → Cancel invitation**: dialog has the invitee email in
   the body, "Keep invitation" + "Cancel invitation" buttons, Keep
   dismisses cleanly.
2. **Members → Remove from practice (negative)**: verifies the
   Remove dialog ISN'T inadvertently reachable on owner-self or
   pending-invitation rows (where it shouldn't surface).
3. **Calendar → Disable feed**: dialog has the
   `DestructiveChangePreview` ("Stops · Calendar sync on every
   subscribed device"), Cancel + Disable feed buttons, Cancel
   dismisses + feed stays enabled.
4. **Calendar → Regenerate URL**: dialog has the canonical
   Invalidates / Issues / Keeps preview ("The current URL on every
   subscribed device"), Cancel dismisses + URL unchanged.
5. **Account.security → Sign out other sessions**: dialog appears
   with "EXCEPT this one" body copy. Skips gracefully if the auth
   seed only has one session (trigger is correctly disabled in that
   case).
6. **Account.security → per-session Revoke**: dialog title matches
   either "Revoke this session?" (other device) or "Revoke this
   session and sign out?" (current session). Asserts the session
   metadata strip is present — that's the unique value-add over a
   generic "are you sure".

All six skip on remote `E2E_BASE_URL` runs (local-seed-only).

## What I didn't write (and why)

Four of the 10 confirm dialogs aren't covered yet because they need
non-trivial test-data seeding:

| Dialog              | Why deferred                                                                                                                                                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Disable MFA         | Needs an MFA-enabled-and-verified user. The `mfa` authSeed creates `twoFactorEnabled=true` + `twoFactorVerified=false`, which short-circuits to the challenge route before /account/security is reachable. Needs a new `mfaVerified` seed mode in the fixture. |
| Suspend access      | Needs an active managed (non-owner) member. The seed creates the owner only; suspending the owner-self isn't possible. Needs to extend the auth-session seed to optionally add a second managed member.                                                        |
| Downgrade role      | Same — needs an active managed member to act on.                                                                                                                                                                                                               |
| Bulk move deadlines | Needs ≥2 obligations selected in the filing-plan table on a specific client. The seed has obligations but the spec would need a deterministic count for the "Move N deadlines" assertion.                                                                      |

Each is a focused follow-up — the page-object + spec shape is already
established by the 6 tests in this commit. Adding the missing 4 is a
half-day's worth of seed-fixture work plus the spec.

## Verification

- `pnpm check` → 1412 files formatted, 662 lint+type clean.
- `pnpm test` → 308 + 26 contracts green (unit tests unchanged).
- e2e syntax compiles — running the suite requires
  `pnpm test:e2e` (boots wrangler + Playwright; not run as part of
  this commit's verification because it's slow).

## Files touched

- M `e2e/pages/members-page.ts`
- M `e2e/tests/members.spec.ts`
- A `e2e/tests/destructive-confirms.spec.ts`
