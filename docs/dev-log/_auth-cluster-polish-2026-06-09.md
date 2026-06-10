# Auth cluster polish — 2FA, accept-invite, splash (Phase 1), 2026-06-09

**Who/why:** Yuqi — "polish the login flow and onboarding." Phase 1 (auth siblings)
brings 2FA, accept-invite, and splash in line with the new `/login` (pW6pK)
language. Canvas nodes: `uu9SI` (2FA), `e3FyUB` (accept-invite), `QGZta` (splash).

## Shared chrome (new)

`apps/app/src/features/auth/auth-chrome.tsx` — extracted so the full-bleed auth
screens stop re-inlining the same chrome:

- `AuthBrandAnchor` — 28px dark "D" mark + wordmark + hairline + "for CPA firms".
- `AuthStatusPill` — "All systems normal" (links to the status page).
- `AuthTrustLine` — the three divider-separated trust items (lock / mail-check /
  shield), shared with the login trust strip.
- `AuthFooter` — © · Terms · Privacy · Security + version + US-East region pill.
- `CenteredAuthScreen` — one-screen (`h-dvh` + `overflow-hidden`) shell: brand
  bar on top, centered content, trust line + footer pinned below.
- `AuthCard` — the white rounded-20, 520px centered card.

`apps/app/src/features/auth/otp-input.tsx` — new 6-box one-time-code input
(auto-advance, backspace/arrow nav, paste-to-fill). No OTP primitive existed.

## Screens

- **`/two-factor`** (`uu9SI`) — rebuilt on `CenteredAuthScreen` + `AuthCard` +
  `OtpInput`. Verify mutation + auto-submit-on-6-digits unchanged. Copy is
  truthful for TOTP (the code is *generated*, not "sent"); "Lost your
  authenticator?" is the live escape (recovery-code branch still deferred);
  "Not your device? Sign out" is wired to `signOut`.
- **`/accept-invite`** (`e3FyUB`) — rebuilt on the shared shell. Signed-in view
  leads with a "Firm invitation" pill → inviter→firm headline → context row
  (inviter avatar + "{org} · {role}" + "Invited by …") → accept CTA → "Use a
  different email" (signs out). Not-signed-in path keeps the shared
  `EmailOtpSignInForm` + SSO. The canvas name field stays dropped (display name
  comes from SSO/email); no decline endpoint exists, so no decline action.
- **`/splash`** (`QGZta`) — already a faithful build; micro-polish only (dark
  "D" mark to match the cluster, 15px date, card radius 14 + divider-subtle).

## Routing

`/two-factor` and `/accept-invite` are now **standalone full-bleed routes**
(outside `EntryShell`), same as `/login` — their canvas designs carry their own
brand bar + footer. `EntryShell` now wraps only `/onboarding`, `/migration/new`,
and `/readiness/:token`. `/splash` was already standalone.

## Gotcha fixed

A lingui macro error (`Multiple distinct JSX elements with the same placeholder
name 'link'`) from two `<a>` in one `<Trans>` on the accept-invite legal line.
The canvas legal line is plain text, so it's now plain text — matches design and
clears the macro. (Same family as the `lingui_plural_i18n_footgun` memory.)

## Verified (preview, signed-out / demo / temp-bypass)

- `/accept-invite` (signed-out): shared chrome + card render, no scroll.
- `/splash` (demo session): matches QGZta; honest empty recap for the demo acct.
- `/two-factor`: previewed via a **temporary** dev-only `?preview=1` loader
  bypass (added + reverted in this session) — 6 OTP cells, layout, no scroll.
- `login.tsx` / the five touched files typecheck clean; formatted.

## Token deviation (carried over)

Warm-status surfaces (e.g. the splash "due this week" strip) use the app's
`state-warning-*` tokens, which read redder than the canvas amber. Kept for
app-wide consistency; flag if the exact amber matters.

## Still using the old centered styling (intentionally, this phase)

`EmailOtpSignInForm` (shared with accept-invite's not-signed-in path) keeps its
existing field styling. `/login` keeps its own inline chrome rather than the new
shared `auth-chrome` components — its structure is locked. Both are candidates
for a later unify pass.

## Files

- New: `features/auth/auth-chrome.tsx`, `features/auth/otp-input.tsx`
- Rewritten: `routes/two-factor.tsx`, `routes/accept-invite.tsx`
- Polished: `routes/splash.tsx`
- Routing: `router.tsx` (two-factor + accept-invite decoupled from EntryShell)

## Next phases (per plan)

- Phase 2: onboarding firm setup (`E76U6Q`) + rule-review prompt (`U8eGg`).
- Phase 3: the 4-step migration import wizard (`KSJGY`/`IUWHX`, `UOKYQ`,
  `ni10S`, `rxWxK`, `E6VSub`, `iAJhJ`).
