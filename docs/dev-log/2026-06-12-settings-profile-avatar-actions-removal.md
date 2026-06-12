# Settings profile avatar actions removal

Date: 2026-06-12

Removed the disabled avatar action placeholders from `/settings/profile`.

## What changed

- `apps/app/src/routes/settings.profile.tsx` no longer renders the inactive
  `Upload` and `Remove` profile-photo buttons.
- Removed the now-unused `UploadIcon` import and the stale upload-RPC TODO from
  the Profile card.
- The Personal info card now labels the circle as `Account initials` and
  describes it as `Used to identify your account across the workspace`,
  avoiding any upload, photo, avatar-change, or JPG/PNG requirement framing.
