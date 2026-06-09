# /login split-screen redesign (Pencil node pW6pK), 2026-06-09

**Who/why:** Yuqi — "update the login page? 100% replicate, Node ID: pW6pK. use variables and tokens if you can."

## What shipped

`/login` was rebuilt from a centered single-column card (inside the shared
`EntryShell`) into the full-bleed two-column split from canvas node `pW6pK`:

- **Left column** — static product story (top-aligned): a brand anchor
  (`D DueDateHQ │ for CPA firms`), the "Every CPA deadline. / One source of
  truth." headline, the sub-paragraph, a "WHAT IT DOES" 3-cell capability card,
  a surface-link line (`/today /deadlines /alerts`), and a divider-separated
  trust strip (no password · 10-min expiry · data residency).
- **Right column** — a floating, vertically-centered sign-in card
  (`rounded-[20px]`, full `divider-subtle` border, soft drop shadow): brand
  lockup, "Welcome back" heading, Continue-with-Google button, "or continue
  with email" divider, the email field (inner mail icon + "Return ↵" hint), the
  blue "Send sign-in link →" CTA, a "Secured by one-time link" reassurance box,
  the "Already have a magic link? Open it now →" foot link, and the
  residency/compliance line.
- **Footer** — © · Terms · Privacy · Security on the left; version string +
  "US East" region pill on the right.

The whole page is locked to one viewport (`h-dvh` + `overflow-hidden`); the
split area fills the height above the footer and the card centers within it,
falling back to internal card scroll only on viewports too short to fit.

> Note: an earlier iteration of this redesign included a "TODAY · 5 DEADLINES
> NEED YOU" sample proof card in the left column; the canvas (pW6pK) dropped it
> in favor of the brand anchor + trust strip, and the code follows.

## Key decisions

1. **Decoupled from `EntryShell`.** The design has no top header and its own
   footer, so `/login` is now a standalone route in `router.tsx` (sibling to,
   not child of, the `EntryShell` layout). `/onboarding`, `/two-factor`,
   `/accept-invite` keep the shared shell unchanged.
2. **Email form built inline, not in the shared component.**
   `EmailOtpSignInForm` is also used by `/accept-invite`, so its visual
   treatment was left alone. `login.tsx` has a private `LoginEmailForm` that
   reproduces the same send → verify → resend state machine (and the
   `?email=&code=` deep-link auto-submit) against the same `@/lib/auth`
   helpers, styled to match pW6pK.
3. **All auth wiring preserved** — Google redirect + One Tap, optional
   Microsoft, email-OTP, `redirectTo`/`continue` open-redirect guards, the
   guest loader. No behavior change to sign-in itself.
4. **Tokens over raw hex** (per the "use variables and tokens" ask): colors map
   to `text-text-*`, `bg-bg-*` / `bg-background-default`, `border-divider-*`,
   `state-*-solid`, and the primary `Button`. The marketing rows/chips/ticks
   use `state-{destructive,warning,accent,success}-solid` + `text-text-*`.
5. **Responsive:** left column is `hidden lg:flex`; below `lg` the sign-in card
   takes the full width and the footer stacks. Pencil is the `xl` baseline.

## Known deviations from the canvas (flagged for Yuqi)

- **"Waiting on client" chip color.** Canvas used `#b9501a` (warm brown).
  Mapped to the app's semantic `text-text-warning` (`#c83d2f`), which is redder
  and sits close to the destructive red of the "Due in 2 days" chip — so the
  two warm chips read more alike than on the canvas. Kept the token for
  app-wide consistency; switch to an arbitrary hex if the visual split matters.
- **"Open it now →"** has no separate paste-link surface (a real magic link is
  a URL opened from the inbox), so it focuses the email field to begin sign-in.
- **No locale switcher** on `/login` anymore (the old `EntryShell` header had
  one; the canvas does not). Locale can still be changed on other entry
  surfaces. Revisit if i18n entry-point coverage is a concern.

## Left-column data = marketing, not fiction

The proof-card rows (Hudson Family, Mercer LLC, …) are illustrative samples on
a logged-out marketing surface — not the visitor's live data — so they don't
violate `feedback_no_fiction_on_canvas`.

## Verified

- Rendered at desktop (matches pW6pK) and mobile 375px (left column hides,
  card full-width, footer wraps). No console errors. Email field accepts
  input; Google/email handlers unchanged.
- `login.tsx` / `router.tsx` typecheck clean (unrelated pre-existing Workers
  type errors elsewhere in the workspace).

## Files

- `apps/app/src/routes/login.tsx` — full rewrite
- `apps/app/src/router.tsx` — `/login` moved out of `EntryShell`
