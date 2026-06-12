# 2026-06-12 — Two-factor setup acknowledgement helper

User feedback on `/settings/profile`: after entering a 6-digit authenticator
code, the "Verify and enable" button still looked inert. The actual gate was
the recovery-code acknowledgement checkbox above the code field, but the action
gave no feedback about that dependency.

## Changes

- Kept the recovery-code acknowledgement requirement before enabling MFA.
- Kept the verification row visually unchanged; once a complete code is present,
  the verify button is clickable, and a missing recovery-code acknowledgement is
  explained through a toast instead of inline helper text.
- Routed the form submit path through the same guard, so pressing Enter cannot
  bypass the acknowledgement requirement.
- Hid the "Set up authenticator" action while a setup QR code is already
  pending, preventing a second click from rotating the server-side TOTP secret
  out from under the currently displayed/scanned QR code.
- Added setup-specific invalid-code guidance to the verification failure toast
  so users know to use the authenticator entry for the current QR code, or
  rescan it if setup was restarted, without changing the verification row's
  visible layout.
- Expanded that toast for Microsoft Authenticator specifically after local
  debugging showed the currently entered code did not match the current QR
  secret in any nearby TOTP window; likely causes are selecting an older
  duplicate DueDateHQ entry or a device clock that is not auto-synced.
- Deleted unverified stale `two_factor` setup rows before starting a new setup,
  so reload/retry flows do not leave Better Auth choosing an older pending
  secret.
- Added focused component coverage for the missing-acknowledgement toast path
  and the acknowledged submit path, plus server coverage for stale setup
  cleanup.

## Verification

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app test -- account-security-two-factor-setup.test.tsx`
- `pnpm --filter @duedatehq/server test -- auth-sessions.test.ts`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/app build`
- `pnpm --filter @duedatehq/server build`
