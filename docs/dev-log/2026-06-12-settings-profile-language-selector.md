# Settings profile language selector

Date: 2026-06-12

Wired the `/settings/profile` Preferences language field to the same locale
switching source used by the bottom-left account menu.

## What changed

- `apps/app/src/routes/settings.profile.tsx` now reads `useLocaleSwitch()` and
  renders a real dropdown for `SUPPORTED_LOCALES`.
- The selected value uses shared `LOCALE_LABELS`, so Profile displays the same
  English / 简体中文 choices as the account menu.
- Date format, time format, and week-start controls remain visual-only until a
  user-preferences store exists.
