# 2026-05-22 · Sources method column removal

## Change

- Removed the `METHOD` column from `/rules/sources`.
- Removed the corresponding header filter and acquisition-method filtering state.
- Kept `CADENCE`, `WATCH`, and `LAST CHECKED` visible because those remain user-facing
  operational signals for source freshness.

## Rationale

Acquisition method values such as `html`, `pdf`, and `manual` are internal source-ingest
implementation details. They made the Sources table harder to understand without adding a
clear CPA-facing decision point.

## Validation

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm exec vp check apps/app/src/features/rules/sources-tab.tsx docs/dev-log/2026-05-22-sources-method-column-removal.md apps/app/src/i18n/locales/en/messages.po apps/app/src/i18n/locales/zh-CN/messages.po apps/app/src/i18n/locales/en/messages.ts apps/app/src/i18n/locales/zh-CN/messages.ts`
- `pnpm --filter @duedatehq/app build`

`pnpm check` still fails on existing unrelated lint/type issues outside this change, including
`apps/app/src/components/patterns/breadcrumb.tsx`,
`apps/server/scripts/rules-concrete-drafts-source-snapshot.ts`,
`apps/app/src/components/patterns/kbd.tsx`,
`apps/server/src/procedures/obligation-queue/index.ts`, `apps/app/src/features/dashboard/actions-list.tsx`,
and `apps/app/src/routes/obligations.tsx`.
