# 2026-05-22 · Sources type labels

## Change

- Replaced technical source type values in `/rules/sources` with CPA-facing labels.
- The `TYPE` column and its header filter now use the same label map:
  - `instructions` → `Instructions`
  - `due_dates` → `Due dates`
  - `calendar` → `Calendar`
  - `publication` → `Publication`
  - `form` → `Form`
  - `emergency_relief` → `Relief notice`
  - `early_warning` → `Early alert`
  - `news` → `News`
  - `subscription` → `Email updates`

## Rationale

The previous values were mostly internal registry enums or abbreviations (`pub`,
`due_dates`, `early-warn`). They described implementation categories rather than the
kind of official source a CPA is scanning.

## Follow-up fix

The first implementation passed Lingui's `t` helper into `sourceTypeLabel`, which left
runtime tagged-template calls in the built route chunk and rendered blank labels. The
fixed implementation builds a translated `sourceTypeLabels` string map inside
`SourcesTab` and passes plain strings to the row/filter helpers.

## Validation

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm exec vp check apps/app/src/features/rules/sources-tab.tsx docs/dev-log/2026-05-22-sources-type-labels.md apps/app/src/i18n/locales/en/messages.po apps/app/src/i18n/locales/zh-CN/messages.po apps/app/src/i18n/locales/en/messages.ts apps/app/src/i18n/locales/zh-CN/messages.ts`
- `pnpm --filter @duedatehq/app build`

`pnpm check` still fails on an existing unrelated format issue in
`apps/server/scripts/rules-concrete-drafts-source-snapshot.ts`.
