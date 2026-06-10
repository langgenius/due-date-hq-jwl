# Billing plan feature copy

**Date:** 2026-06-10
**Area:** billing

## Change

Rewrote the four visible `/billing` plan-card feature lists into the same four-row
comparison structure: Alert, History, Workflow, and Controls. The cards now describe
actual functional differences instead of repeating client, workspace, and seat quota
facts already shown above the divider.

- Free: live alerts, 30-day history, one-seat manual review, manual changes.
- Solo: live alerts, full history, one-owner review, migration preview.
- Pro: bulk alert actions, full history, shared deadline work, guided production imports.
- Team: priority alert review, full history, manager workload insights, migration review
  plus audit exports.

## Docs

Updated `docs/product-design/billing/01-practice-entitlement-pricing.md` to keep the
App Billing copy aligned with the implemented entitlement differences.

## Validation

- `pnpm --filter @duedatehq/app exec tsc --noEmit --pretty false`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `git diff --check -- apps/app/src/routes/billing.tsx apps/app/src/i18n/locales/en/messages.po apps/app/src/i18n/locales/en/messages.ts apps/app/src/i18n/locales/zh-CN/messages.po apps/app/src/i18n/locales/zh-CN/messages.ts docs/product-design/billing/01-practice-entitlement-pricing.md docs/dev-log/2026-06-10-billing-plan-feature-copy.md`
- Browser verification on `http://localhost:5173/billing`: all four cards render the
  aligned Alert / History / Workflow / Controls rows, old unstructured copy is absent,
  and the desktop plan grid shows no text truncation.
