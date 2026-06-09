# Login screen refurbish — 2026-06-09

Polish pass on `/login`: fixed a width regression in the email sign-in
block, removed the fabricated "trusted by" social-proof strip, and let
the sign-in card settle as one centered unit. Visual/markup only — no
auth contract, data, or behaviour changes.

## Weird-width fix

The entry column is `flex flex-col items-center max-w-[400px]`. The
Google/Microsoft SSO buttons carried `w-full`, so they filled the 400px
column — but two siblings did **not**, so under `items-center` they
collapsed to their intrinsic content width and rendered narrow and
centered, visibly misaligned with the SSO buttons above:

- the email OTP `<form>` (both the email-entry and code-verify states)
  in `apps/app/src/features/auth/email-otp-sign-in-form.tsx`
- the `or` divider row in `apps/app/src/routes/login.tsx`

Added `w-full` to all three. The email field, **Email me a code** button,
and the divider hairlines now run flush to the same 400px measure as the
Google button.

## Removed the trust strip

Deleted `LoginTrustStrip` and its helpers (`TRUST_FIRMS`, `TrustStat`) —
the "TRUSTED BY 480+ TAX PRACTICES" firm chips and the
`12,400 / 23 SEC / 99.98%` stat row. Two reasons:

1. Those numbers were invented — they violate **no fiction on canvas**
   (every datum must trace to a real backend or be tagged NET-NEW).
2. With them gone the page is a single focused sign-in card; the entry
   layout's `justify-center` now does the vertical balancing instead of
   the page bottoming out on a decorative footer.

Dropped the now-unused `type ReactNode` import as a result.

## Untouched

The brand lockup + `PRIVATE BETA · JUN 2026` pill, the
`Encrypted · 7-day session · SSO-ready` security line (real, kept as the
trust signal), the support/legal lines, and all auth logic.
