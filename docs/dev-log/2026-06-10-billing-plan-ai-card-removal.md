# Billing plan AI mini-card removal

**Date:** 2026-06-10
**Area:** billing

## Change

Removed the embedded AI mini-card from every visible `/billing` plan card. The plan
cards now render price, cadence, client/workspace/seat facts, and the plan feature
list without the extra AI capability panel.

## Docs

Updated `docs/product-design/billing/01-practice-entitlement-pricing.md` so the
protected app Billing chooser is explicitly scoped to price, workspace, seat, client,
and feature comparison rather than embedded AI capability panels.

## Validation

- `pnpm --filter @duedatehq/app exec tsc --noEmit --pretty false`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `git diff --check -- apps/app/src/routes/billing.tsx apps/app/src/i18n/locales/en/messages.po apps/app/src/i18n/locales/en/messages.ts apps/app/src/i18n/locales/zh-CN/messages.po apps/app/src/i18n/locales/zh-CN/messages.ts docs/dev-log/2026-06-10-billing-plan-ai-card-removal.md docs/product-design/billing/01-practice-entitlement-pricing.md`
- Browser verification on `http://localhost:5173/billing`: all four visible plan cards
  omit the AI mini-card and show only price, usage facts, and feature bullets.
