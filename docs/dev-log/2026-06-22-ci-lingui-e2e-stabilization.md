# CI, Lingui, and E2E stabilization

_2026-06-22_

The latest main run had two real blockers: `vp check` found formatting drift in
recent rules/deadlines work, and Lingui strict compile found missing `zh-CN`
coverage after catalog extraction. Once those were fixed, the route test exposed a
stale selector around the jurisdiction rail review dot.

## Fixes

- Ran `vp check --fix` to normalize the formatting drift reported by CI.
- Re-ran Lingui extraction/compile and filled the missing `zh-CN` translations.
- Switched the rail review-dot title/ARIA copy to a Lingui plural message so
  `1 rule to review` and `# rules to review` are both grammatically stable.
- Updated the rules-library route test to assert the singular title copy.

## Verification

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/app test src/routes/rules.library.test.tsx --run`
- `pnpm run ci`
- `E2E_WORKER_PORT=8788 E2E_MARKETING_BASE_URL=http://127.0.0.1:4322 pnpm test:e2e`
