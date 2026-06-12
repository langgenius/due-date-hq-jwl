# Settings profile timezone removal

Date: 2026-06-12

Removed the read-only Timezone row from `/settings/profile` Personal info.
Timezone remains a practice-level setting owned by `/practice`, consistent
with `docs/dev-file/05-Frontend-Architecture.md`.

## What changed

- `apps/app/src/routes/settings.profile.tsx` no longer imports
  `useFirmPermission()` just to surface the practice timezone in the personal
  account card.
- Active-session timestamps on the page still format with
  `usePracticeTimezone()`, so security history continues to render in the
  active practice timezone without exposing a duplicate account-level setting.
