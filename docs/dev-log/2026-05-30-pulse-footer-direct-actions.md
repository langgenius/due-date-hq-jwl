# Pulse Footer Direct Actions

## Context

The Pulse detail footer actions `Dismiss`, `Snooze 24h`, and `Mark reviewed`
opened the shared reason dialog. In the detail review workflow these actions are
already explicit enough, and the extra dialog slowed down no-action alerts.

## Change

- Made the Pulse detail footer `Dismiss`, `Snooze 24h`, and `Mark reviewed`
  actions call their mutations directly.
- Kept right-bottom toast feedback for each action.
- Made dismiss, snooze, and mark-reviewed audit reasons optional at the contract
  boundary.
- Added default DB-level audit reasons when the caller does not supply a typed
  reason.
- Kept the existing reason dialog for list-row quick actions that still collect
  typed reasons.

## Validation

- `pnpm --filter @duedatehq/app test -- PulseDetailDrawer AlertsListPage`
- `pnpm --filter @duedatehq/contracts test -- contracts.test.ts`
- `pnpm --filter @duedatehq/db test -- pulse.test.ts`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- Browser smoke on
  `/rules/pulse?mockPulse=1&alert=eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee` confirmed
  the detail footer renders `Dismiss`, `Snooze 24h`, and `Mark reviewed`
  with no reason textarea or framework overlay.
