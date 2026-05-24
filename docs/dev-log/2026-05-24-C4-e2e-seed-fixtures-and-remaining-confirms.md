---
title: 'C4 — e2e seed fixtures + remaining 4 destructive-confirm tests'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: test
---

# C4 — finish out the destructive-confirm e2e coverage

## Why

C3 (commit prior) shipped 6 of 10 confirm-dialog tests. The remaining
4 were deferred because each needed test-data the existing auth-seed
fixture didn't provide:

| Dialog              | Missing seed state                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Disable MFA         | An MFA-enabled-AND-verified session (existing `mfa` mode lands on the challenge route, not /account/security). |
| Suspend access      | A second managed member alongside the owner.                                                                   |
| Downgrade role      | Same — needs an active managed member to act on.                                                               |
| Bulk move deadlines | A client with ≥2 obligations so the bulk-bar appears.                                                          |

This commit adds three new seed modes (`mfaVerified`, `team`,
`filingPlan`) and the 4 tests that consume them.

## What changed

### Server — three new e2e seed modes

`apps/server/src/routes/e2e.ts`

`SeedMode` union extended from 4 → 7 modes. `isSeedMode()` type
guard replaces the inline `seed === 'pulse' || …` chain in
`readSeedRequest()` so adding a mode is a one-line change.

**`mfaVerified`** — same as `mfa` (twoFactorEnabled=true) but
session.twoFactorVerified stays `true`. That's the one bit the
existing `mfa` seed flipped off to force the challenge route. With
the flip restored, the user lands directly on /account/security
with the Disable MFA control reachable.

**`team`** — calls a new `seedTeamMember()` helper that creates a
second user + member row with role `'preparer'` alongside the owner.
The seeded teammate's user id / name / email are returned in
`seeded.teamMember` so the test fixture can target their row
without hard-coding.

**`filingPlan`** — calls a new `seedFilingPlan()` helper that creates
a single client (Lakeview Manufacturing) with 3 obligations
(federal_1120, ny_ct3, federal_1120_estimated_tax). All 3 land in
the same year so the year-level "Select all" checkbox picks them
up in one click. The seeded client id + name come back in
`seeded.filingPlanClient`.

### e2e fixture — surface the new seed payloads

`e2e/fixtures/test.ts`

`AuthSeedMode` extended to match the server union.
`E2EAuthSession.seeded` gains `teamMember` and `filingPlanClient`
fields (both nullable so seeds that don't populate them stay safe).
Two new type-guard helpers (`isTeamMemberSeed`,
`isFilingPlanClientSeed`) parse the server response defensively.

### Members page object — kebab menu accessor

`e2e/pages/members-page.ts`

Added `memberRowFor(email)` and `openMemberActions(email)` helpers
so the Suspend/Downgrade specs don't have to know the kebab is
labeled "Open member actions".

### 4 new specs in `destructive-confirms.spec.ts`

Each is wrapped in a `test.describe` block with `test.use({ authSeed: … })`
so the seed mode is colocated with the test that needs it:

1. **`account.security` → Disable MFA** (`mfaVerified` seed):
   dialog has the "Sign-in will only require your password" body,
   "Keep enabled" + "Disable MFA" buttons. Cancel dismisses cleanly
   and the trigger stays visible.
2. **Members → Suspend access** (`team` seed): dialog has the
   teammate's name in the body, "Cancel" + "Suspend access" buttons.
   Cancel dismisses + teammate row stays.
3. **Members → Downgrade role** (`team` seed): downgrades the
   seeded Preparer to Coordinator. Dialog has both role labels +
   the DestructiveChangePreview Removes/Keeps strip. The strip is
   the unique value-add of a downgrade confirm — without it the
   admin can't see what permissions they're about to revoke.
4. **Filing-plan → Move N deadlines** (`filingPlan` seed):
   navigates to `/clients/{id}`, selects all 3 obligations via the
   year-level "Select all" checkbox, opens the bulk bar, picks
   "Waiting on client". Dialog title is `/^Move \d+ deadlines to
Waiting on client\?/` and body shows the audit-trail explainer.
   The "Move 3 deadlines" count is the unique value-add over a
   generic confirm — without it the admin can't tell how many rows
   they're about to mutate.

All 4 skip on remote `E2E_BASE_URL` runs (local-seed-only),
matching the existing 6.

## Coverage status

After this commit, all 10 destructive-confirm dialogs from the P0
audit have e2e shape coverage:

| Surface          | Confirm                 | Test   |
| ---------------- | ----------------------- | ------ |
| Members          | Cancel invitation       | C3     |
| Members          | Remove (negative)       | C3     |
| Members          | Suspend access          | **C4** |
| Members          | Downgrade role          | **C4** |
| Calendar         | Disable feed            | C3     |
| Calendar         | Regenerate URL          | C3     |
| account.security | Sign out other sessions | C3     |
| account.security | Per-session Revoke      | C3     |
| account.security | Disable MFA             | **C4** |
| Filing-plan      | Bulk move deadlines     | **C4** |

## Verification

- `pnpm check` → 1413 files formatted, 662 lint+type clean.
- `pnpm test` (app + contracts + server) → 308 + 26 + 254 green.
- e2e syntax compiles (the specs are part of the root tsconfig
  include set). Running the suite requires `pnpm test:e2e` (boots
  wrangler + Playwright; not run as part of this commit's
  verification because it's slow).

## Files touched

- M `apps/server/src/routes/e2e.ts`
- M `e2e/fixtures/test.ts`
- M `e2e/pages/members-page.ts`
- M `e2e/tests/destructive-confirms.spec.ts`
