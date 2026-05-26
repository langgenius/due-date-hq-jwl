# Client filing activity section removal

**Date:** 2026-05-26
**Branch:** `main`
**Scope:** Client detail `Client info` compliance posture panel

Yuqi clarified that the activity badges looked like deadline-generation controls even though client
deadlines are generated from active rules plus filing jurisdiction/profile facts. The static
client-level booleans were not the right surface for explaining generated deadlines.

## What changed

`apps/app/src/features/clients/ClientCompliancePosturePanel.tsx`:

- Removed the activity badge section from Compliance posture.
- Kept the scan-only identity facts: Federal EIN, tax year, owners, client since, and recent late
  filing count.
- Updated the component comment so the rule/profile relationship is explicit.

`apps/app/src/features/clients/ClientCompliancePosturePanel.test.tsx`:

- Added focused coverage that the panel still renders identity facts and no longer renders static
  filing activity tags.

`apps/app/src/i18n/locales/*/messages.po`:

- Removed the scoped catalog entries that only existed for the removed activity section.

## Verification

- `pnpm --filter @duedatehq/app test -- src/features/clients/ClientCompliancePosturePanel.test.tsx`
  — 2 tests passed
- `pnpm --dir apps/app exec tsc -p tsconfig.json --noEmit` — clean
- `git diff --check` — clean
- Browser validation on `/clients/hanxujiang?tab=info` — activity section absent, Compliance
  posture and Risk profile still present
