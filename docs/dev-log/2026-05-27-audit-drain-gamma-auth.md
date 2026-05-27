# 2026-05-27 — Audit drain pass (Agent γ / auth + onboarding): 3 findings shipped, 14 verified-shipped

## Scope

Drain pass owned by Agent γ over the auth + onboarding entry surfaces:

- `apps/app/src/routes/login.tsx`
- `apps/app/src/routes/two-factor.tsx`
- `apps/app/src/routes/accept-invite.tsx`
- `apps/app/src/routes/onboarding.tsx`
- `apps/app/src/routes/_entry-layout.tsx`
- `apps/app/src/features/auth/email-otp-sign-in-form.tsx`
- `apps/app/src/features/onboarding/state-rule-activation-selector.tsx`

Base commit: `c583b334` (post-batch-1 drain). Branch: `design/audit-drain-gamma-auth`.

The owner-files for this batch are tightly scoped — F4-01 / F4-04 already
shipped in batch 1 on `account-security-two-factor-setup.tsx` and that file
is explicitly excluded from this drain to avoid stomping batch 1's work.
Likewise the ε agent owns notifications / workload / opportunities / audit
/ reminders / calendar, so those folders are untouched.

## What

### F1-03 — Trust pill above the CTA on `/login` (P1)

`apps/app/src/routes/login.tsx`. The pill
`Encrypted · 7-day session · SSO-ready` used to sit at the very bottom of
the page, below the OTP form, after the user had already decided whether
to type their email. Trust signals do their job *before* the credential
moment — a first-time visitor hesitating at the email box is the exact
reader who needs to see that reassurance to make the leap, and a footer
trust pill arrives one decision too late.

Moved the pill to sit between the sub-headline and the Google SSO button.
Removed the now-duplicate pill below the legal block. Pure JSX reorder —
no token changes, no copy changes, semantics preserved.

The Step 6 UX audit `#4` flagged the green-dot pre-action (status-done
before the user has succeeded at anything) — that's a separate visual-
rhythm conversation and stays deferred; this drain only relocates the
existing pill.

### F5-13 — Trust pill above the CTA on `/onboarding` (P1)

`apps/app/src/routes/onboarding.tsx`. Same shape as F1-03. The pill
`Encrypted · Saves on continue · Renamable later` teaches "this is
reversible" — which is the reassurance the user needs *before* clicking
Continue and committing the practice name + state-rule activation set,
not after. Sitting below the CTA, the pill is only seen after the
nervous-click already happened.

Moved to sit below the sub-headline (parallels F1-03 placement on
`/login`). The old slot below the Continue button is now empty; the
prior `#20` (Step 6) comment that justified the "Saves on continue"
copy is preserved as a back-reference pointer to the new location so
the rationale chain stays readable.

### Step 6 UX audit `#6` — Keyboard hint that Enter on the email field submits

`apps/app/src/features/auth/email-otp-sign-in-form.tsx`. The Step 6
audit marked this `❌ not drift — standard HTML behavior` (HTML forms
already submit on Enter from any input). The drain task list flagged
it as worth a tiny hint for a first-time user who's typed their email
and paused.

Added a small centered microcopy line under the "Email me a code"
button: `or press [Enter]` with a `<kbd>` element rendered in a quiet
mono caption. The submit semantics are already correct via HTML form
default — this is a discoverability nudge, not a behavior change.

Translation handling: 1 new msgid `or press <0>Enter</0>` with
zh-CN `或按 <0>Enter</0>`. Lingui's component-interpolation token
`<0>` wraps the kbd. CPA-vocabulary irrelevant here (auth surface,
keyboard noun).

## Verified-shipped (no code change this batch)

For each finding below: walked the relevant file and confirmed the
fix is already on `HEAD` from prior `feat/step-7-onboarding-polish`
or `audit-drain-batch-1` work. Listing them as verified so the audit
ledger zeroes the entry out rather than leaving them as
indeterminate / re-investigate-later.

| Finding | File | Verified at |
| ------- | ---- | ----------- |
| F1-10   | `routes/login.tsx`             | Support mailto line broken out of legal block, sits between trust pill and Terms/Privacy |
| F2-01   | `routes/accept-invite.tsx`     | Missing-invite alert now carries `Sign in` + `Go to Today` buttons |
| F2-03   | `routes/accept-invite.tsx`     | `FieldSeparator` primitive replaces the hand-rolled grid; the same primitive is shared with login's separator concept |
| F2-05   | `routes/accept-invite.tsx`     | Skeleton wrapped in `role="status" aria-live="polite"` + sr-only `Loading invitation` label |
| F3-02   | `routes/two-factor.tsx`        | "Lost your authenticator?" support-email line under Verify button |
| F3-03   | `routes/two-factor.tsx`        | `autoFocus` on the code input |
| F3-04   | `routes/two-factor.tsx`        | `handleCodeChange` auto-submits on 6-digit completion, guarded by `!verifyMutation.isPending` |
| F3-05   | `routes/two-factor.tsx`        | Helper text names common authenticator apps |
| F3-06   | `routes/two-factor.tsx`        | Trust pill `Encrypted · 2FA-protected` added to CardContent |
| F5-01   | `routes/onboarding.tsx`        | Helper anchors default (most practices use 5–14 days) |
| F5-02   | `routes/onboarding.tsx`        | Copy provider-agnostic ("based on your account") |
| F5-04   | `routes/onboarding.tsx`        | Helper leads with the unit ("Days before each statutory deadline…") |
| F5-05   | `routes/onboarding.tsx`        | Label renamed to "Internal deadline lead time" |
| F5-07   | `features/onboarding/state-rule-activation-selector.tsx` | Label now `State rule coverage (optional)` + "Skip if you only need federal rules" |
| F5-08   | `features/onboarding/state-rule-activation-selector.tsx` | Source-defined-calendar warning rewritten to "state's own calendar" + "approve" |
| F10-09  | `routes/_entry-layout.tsx`     | `Skip to content` anchor with focus-visible styles |
| Step 6 `#19` | `features/onboarding/state-rule-activation-selector.tsx` | Same fix as F5-07 |
| Step 6 `#22` | `routes/two-factor.tsx`        | Same fix as F3-03 |

(Verified-shipped count: 14 distinct, plus 2 duplicates of F5-07/F3-03 so
the audit-ledger sees them closed too.)

## Skipped (out-of-scope for mechanical drain)

| Finding | Reason |
| ------- | ------ |
| F1-08   | Code-expiry countdown — adds state machine + tick interval. Deferred. |
| F5-09   | State grid touch target 28→44px — layout shift, not pure JSX. Deferred. |
| F10-03  | "All systems operational" status-page link — depends on a status page actually existing. Deferred. |
| F11-04  | 2FA verify error path forward — owned by ε's surfaces. Deferred. |
| Step 6 `#8` | "Redirecting to Google…" announce-once — acceptable; SSO page unloads before any tick interval would help. |
| Step 6 `#11` | "Signing in…" toast on accept-invite OTP→preview transition — already covered by the OTP button spinner + F2-05's `Loading invitation` skeleton. No gap to close. |

## i18n

One new msgid, translated in zh-CN:

| msgid | zh-CN |
| ----- | ----- |
| `or press <0>Enter</0>` | `或按 <0>Enter</0>` |

`pnpm i18n:extract` clean (1 added). `pnpm i18n:compile --strict` passes.

## Verification

- `cd apps/app && pnpm exec tsc --noEmit` — clean.
- `pnpm i18n:extract` — 1 new msgid; translated.
- `pnpm i18n:compile --strict` — pass.
- File ownership boundaries respected: did not touch
  `account-security-two-factor-setup.tsx` (batch 1 territory) or any of
  ε's feature folders. Only the seven files listed under Scope were
  modified.
