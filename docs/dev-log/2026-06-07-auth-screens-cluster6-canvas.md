# 2026-06-07 — Auth screens (Cluster 6) aligned to canvas

Restyled the three entry-flow auth surfaces to match the Pencil canvas
(`duedatehq_work.pen`, nodes pW6pK / uu9SI / e3FyUB) while keeping the shipped
behaviour intact. Real routes stay top-level — no `/auth/*` prefix was added.

## /login (`apps/app/src/routes/login.tsx`, node pW6pK)

- Centred the column and added a brand lockup (56px dark rounded mark + soft
  shadow) with a "PRIVATE BETA · JUN 2026" pill above the heading, so a
  referral visitor confirms the product before reading copy. Previously the
  route opened on a left-aligned H1 with no brand mark.
- Added a closing trust strip — "TRUSTED BY 480+ TAX PRACTICES", firm chips,
  and a SOC-2 / scale stat row (12,400 deadlines · 23 SEC triage · 99.98%
  uptime) — wrapping responsively inside the entry column.
- Kept the full hybrid sign-in: `EmailOtpSignInForm` with `initialEmail` /
  `initialCode` auto-verify, Google/Microsoft SSO, Google One Tap, and
  `?continue=` post-sign-in targeting. Only layout/alignment changed.
- New shared `EntryBrandLockup` + `EntryBetaPill`
  (`apps/app/src/features/auth/entry-brand-lockup.tsx`).

## /two-factor (`apps/app/src/routes/two-factor.tsx`, node uu9SI)

- Centred the card header; title → "Enter your 2FA code"; sub now names the
  product ("…6 digits you see for DueDateHQ"); CTA → "Verify and continue"
  (pending label stays "Verifying…").
- Kept the single `Input` control and the auto-submit-on-6-digits behaviour.
  The canvas's six-box display and recovery-code branch are NOT adopted — the
  recovery branch is deferred (F3-01) and the live escape stays the
  "Lost your authenticator?" support mailto.

## /accept-invite (`apps/app/src/routes/accept-invite.tsx`, node e3FyUB)

- Header now leads with a "Firm invitation" pill and promotes the
  inviter→firm line to the card title (was buried in the muted description).
- Signed-in state gains an "accept row" — inviter-initials avatar + "Joining
  as {role}" — derived from the existing invitation preview.
- Per product decision, the canvas's name input is intentionally omitted: the
  display name comes from the SSO provider / `displayNameFromEmail`, so there
  is no name field and no `user.update`.
- TODO(data): the canvas accept-row also shows an assigned client portfolio
  ("Hudson Wells · Brightline LLC · …"). The invitation preview contract has
  no such field; the sub-line is omitted until the contract exposes it.

## Verify

- `npx tsgo --noEmit -p apps/app` — 0 errors.
- `pnpm --dir apps/app test -- src/router.test.ts` — 50 passed (auth-loader
  redirects unchanged). `login.test.tsx` + `accept-invite.test.tsx` green.

i18n: `<Trans>` / `t` strings added; extract/compile deferred to the central
pass per project i18n rule.
