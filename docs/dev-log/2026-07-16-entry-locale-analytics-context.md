# Entry locale analytics context

## Context

Amplitude's built-in `Language` property reports the browser language, while the app can legitimately
activate a different Lingui locale from a marketing `?lng=` handoff or `localStorage["lng"]`. Because
the handoff query is removed before Amplitude initializes, an anonymous login event could show an
English browser language with a Chinese page title without exposing why.

## Change

- Made `bootstrapI18n()` return the resolved locale and its source without changing the existing
  priority order or URL cleanup behavior.
- Added `app_locale` and `locale_source` to analytics super properties before campaign capture and
  Amplitude initialization, so entry and authentication events carry the UI language context.
- Kept `app_locale` synchronized when an authenticated user switches the active Lingui locale;
  `locale_source` remains the immutable source of the current app bootstrap.
- Documented that Amplitude `Language` is a browser signal and must not be used as the app locale.
- Added regression coverage for query, persisted, browser, and default locale sources plus the
  startup analytics wiring and ordering.

## Validation

- `pnpm --filter @duedatehq/app exec vitest run src/i18n/provider.test.tsx src/main.test.tsx`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm format`
- `pnpm ready`
- `pnpm check:deps`
- `gitleaks git --staged --redact`
- `pnpm secrets:scan` — repository-wide scan still reports nine pre-existing local/ignored findings in
  `.claude/worktrees`, `apps/app/.env.local`, and `apps/server/.dev.vars`; none are part of this change.
