# Settings — Profile / your account (Pencil o8zYZ)

Date: 2026-06-07

New route `/settings/profile` implementing the Pencil "your account"
canvas: Personal info, Security, Preferences, Danger zone — inside the
shared `SettingsShell` rail introduced with the permissions matrix.

## What shipped

- `apps/app/src/routes/settings.profile.tsx` — four restyled cards
  matching the canvas (rounded-2xl, hairline header divider, danger-zone
  destructive border).

## Functional wiring

- **Personal info** — name + email read live from the better-auth
  session (`useSession`); timezone from the current firm
  (`useFirmPermission().firm.timezone`, falling back to the practice
  timezone provider). Avatar initials derive from the live name via
  `initialsFromName`.
- **Security** — fully wired, reusing the exact RPC flows from
  `account.security.tsx`:
  - 2FA enable / verify (via `TwoFactorSetupPanel`) / disable, all with
    the existing confirm dialogs.
  - Active sessions list from `security.status`, per-session Revoke +
    "Sign out everywhere" with confirm dialogs; revoking the current
    session navigates to /login. Device icon inferred from user-agent.
  - Loading / error states handled inline (Skeleton / message) so the
    rest of the page still renders.

## TODO(data) — disabled controls, no fake no-ops

- **Avatar Upload / Remove** — no profile-image upload RPC (avatars come
  from the OAuth provider). Buttons disabled.
- **Full name / Email edit + "Change" link** — no `user.updateProfile`
  RPC; rendered read-only.
- **Preferences** (Language, Date format, Time format, Week starts on) —
  no user-preferences store. Static defaults shown; selects render as
  read-only fields, segmented toggles are visual-only (`aria-disabled`).
- **Export all my data** — no `account.export` RPC. Button disabled.
- **Delete account** — no `account.delete` RPC. Button disabled.

## Pixel compromises

- The canvas "Email" field shows a blue "Change" affordance; with no
  email-change RPC it's rendered in `text-text-disabled` with a "not
  available yet" title rather than a live link.
- Timezone / Language / Date-format are styled as the canvas's
  select-look inputs but are read-only value rows (chevron retained for
  visual parity) until their backing stores exist.
- All colors mapped to existing tokens (no raw hex, no new theme
  colors): accent avatar `bg-state-accent-hover` / `text-text-accent`,
  2FA "Enabled" chip `bg-state-success-hover` / `text-text-success`,
  danger border `border-state-destructive-hover-alt`.
