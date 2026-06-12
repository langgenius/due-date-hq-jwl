# Settings profile language selector

Date: 2026-06-12

Wired the `/settings/profile` Preferences language field to the same locale
switching source used by the bottom-left account menu.

## What changed

- `apps/app/src/routes/settings.profile.tsx` now reads `useLocaleSwitch()` and
  renders a real dropdown for `SUPPORTED_LOCALES`.
- The selected value uses shared `LOCALE_LABELS`, so Profile displays the same
  English / 简体中文 choices as the account menu.
- The language dropdown content uses the shared `--anchor-width` menu sizing
  convention so the popup matches the trigger field width.
- Date and time format controls now persist browser-local display preferences
  through `apps/app/src/lib/display-preference-store.ts`.
- Active-session timestamps on Profile render through those display preferences
  so the date dropdown and 12h / 24h toggle have immediate visible behavior.
- Removed the week-start control from Profile Preferences.
