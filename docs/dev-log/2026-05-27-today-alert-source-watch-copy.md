# Today Alert Source Count Copy

## Context

The Today Alerts empty state showed "Monitoring 2 sources. Receiving correctly." In dev, that
count came from the mock Pulse source-health cache, not from the current Today work queue. The mock
source list was also stale: it watched IRS + a WA placeholder while the seeded Pulse examples use
IRS, CA FTB, NY DTF, and FL DOR.

## Change

- Kept the Today all-clear source line numeric only: it reports how many active sources are being
  monitored without naming the source families inline.
- Kept a sources link from the all-clear line so users can inspect the source table when they want
  the underlying details.
- Updated Pulse dev mock source health to match the seeded alert examples.
- Seeded `pulse.listAlerts({ limit: 50 })` so the Today Alerts section uses the same mock alert
  cache as the rest of the app.

## Validation

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/app test -- src/features/pulse/__dev__/mock-pulse.test.ts src/features/pulse/lib/source-health-labels.test.ts`
- `pnpm exec vp check apps/app/src/features/dashboard/needs-attention-section.tsx apps/app/src/features/pulse/__dev__/mock-pulse.ts apps/app/src/features/pulse/__dev__/mock-pulse.test.ts apps/app/src/features/pulse/lib/source-health-labels.ts apps/app/src/features/pulse/lib/source-health-labels.test.ts apps/app/src/i18n/locales/en/messages.po apps/app/src/i18n/locales/en/messages.ts apps/app/src/i18n/locales/zh-CN/messages.po apps/app/src/i18n/locales/zh-CN/messages.ts docs/dev-log/2026-05-27-today-alert-source-watch-copy.md`
- Authenticated local Today was checked on the available demo accounts. Those accounts currently
  have active seeded alerts, so the no-alert empty state was not visually reachable from demo data;
  the dashboard branch and Lingui catalogs now encode the numeric-only copy, while the focused tests
  cover the seeded mock source/cache contracts that feed this surface.
