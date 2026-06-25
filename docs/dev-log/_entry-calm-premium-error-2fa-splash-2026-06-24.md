# Entry surfaces: calm-premium error / 2FA / splash + AuthHeading consolidation

**Date:** 2026-06-24  
**Files:** `features/auth/auth-chrome.tsx`, `routes/error.tsx`, `routes/two-factor.tsx`, `routes/splash.tsx`

## What changed

### `AuthHeading` primitive (auth-chrome.tsx)

Added a canonical `AuthHeading` component exported from `features/auth/auth-chrome.tsx`. Consolidates the repeated `text-3xl font-semibold leading-[1.15] tracking-[-0.6px] text-text-primary` entry H1 pattern. Props: `children`, optional `className`, optional `as` (`'h1' | 'h2'`, default `'h1'`).

### `error.tsx` — calm centered composition (1.5/5 → ~4)

- Removed destructive-red `<Alert variant="destructive">` framing.
- Replaced with: brand anchor at top, a soft `ServerOffIcon` in a `bg-background-well-warm` stone well (no red), `AuthHeading` for the blame-free title, a calm body line (`font-normal` per weight canon).
- Copy reframed: "Something went wrong on our end" (system owns it, not the user).
- Action pair: primary "Try again" (with `RefreshCwIcon`), outline "Go to Today" (canonical home destination).
- Removed `TriangleAlertIcon` import; removed `Alert` import.

### `two-factor.tsx` — quiet security reassurance (2/5 → ~3.5)

- H1 onto `AuthHeading` (removes inline `text-3xl font-semibold …` duplication).
- Body description demoted to `font-normal` (was `font-medium` — weight canon: normal for body).
- Added a soft stone-well reassurance strip below the OTP field: `ShieldCheckIcon` (strokeWidth 1.5) + "Your account is protected by two-factor authentication." in `text-[11px] font-medium text-text-tertiary`. Uses `bg-background-well-warm`, not a colored alert.
- Added `ShieldCheckIcon` to lucide imports.

### `splash.tsx` — time-of-day warm greeting (2.5/5 → ~3.5)

- Added `timeOfDayGreeting` memo (computed from real `new Date().getHours()`): `'morning'` (< 12), `'afternoon'` (< 18), `'evening'` (≥ 18). Not fiction — real client clock.
- Replaced "Welcome back" / "Welcome back, {name}" with "Good morning/afternoon/evening" variants in all three heading branches (loading skeleton, with name, without name).
- Today date label demoted to `font-normal` (was `font-medium`).

## Not changed / deferred

- `account-security-two-factor-setup.tsx` — the `TwoFactorSetupPanel` lives inside a settings page shell (not a centered auth surface). Heading inside it is `<h3>` already. No AuthHeading needed.
- `accept-invite.tsx` — out of scope per the hard constraint (not in the five target files). Noted as a natural next consumer of `AuthHeading`.
- i18n extract/compile — deferred per task instructions (no extract/compile step).
