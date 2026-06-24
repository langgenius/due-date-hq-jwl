# Auth/onboarding polish · welcome offer + Team-trial grant · first-run tour

_2026-06-24. Branch `claude/peaceful-hertz-897271`._

A batch across the new-user path: visual polish on login/onboarding, the marketing
"3 months of Team free" questionnaire moved in-app as a gated onboarding step (now
actually granting the plan), a copy fix, and a short first-run tour on `/today`.

## Auth / onboarding visual polish

- **Scroll-center fix (P0).** `CenteredAuthScreen` used `items-center justify-center
  overflow-y-auto` — on a viewport shorter than the form, the centered overflow
  pushed the top above an unreachable scroll origin, so the onboarding page title
  ("Set up your practice") + step indicator never rendered on a laptop. Switched to
  `flex-col` + an `m-auto` inner block (centers when there's room, collapses to a
  reachable top when it overflows). Fixes onboarding steps 1–2, two-factor,
  accept-invite. `features/auth/auth-chrome.tsx`.
- **Onboarding hierarchy.** Lifted the step eyebrow + title + value line out of the
  card to a page-level hero (position + scale contrast, on-canon — no effects).
  Off-scale type → tokens (`text-[28px]`→`text-2xl`, `text-[11px]`→`text-caption`,
  `tracking-[1.4px]`→`tracking-[0.08em]`); dropped `font-medium` off the body
  subtitle. `routes/onboarding.tsx`.
- **Login → brand navy.** Replaced the generic gray "D" mark with the canonical navy
  `BrandMark`; unified the h1 tracking with onboarding. The product-story panel went
  from a decorative gradient + `blur-[120px]` glow + `shadow-[0_30px_80px…]`
  (blur ≫ the ≥24 ceiling, against §2.1 "color is semantic, no decorative glows") to
  a confident solid `bg-brand-ink` panel — the light app window floats on navy,
  promise text white (`text-text-primary-on-surface`), `shadow-overlay`.
  `routes/login.tsx`.
- **Federal copy fix.** The rule-review step glossed every row "This **state**
  publishes its own filing calendar…", but the review set includes Federal (not a
  state). → "This **jurisdiction**…" (and "Review # **jurisdictions**").
  `features/onboarding/rule-review-prompt.tsx`.

## Welcome offer questionnaire (onboarding step 1)

The marketing `/get-started` questionnaire (removed from marketing by the parallel
session; its CTAs now point at app login) moved in-app as a **dedicated welcome
step**. Name/email come from sign-in and the firm name from practice setup, so only
the three qualitative questions remain (focus / tools / pain), built from app
primitives (`CenteredAuthScreen`, `ToggleChip`, `Button`, `Textarea`) so it reads as
the natural first beat of onboarding. `features/onboarding/welcome-offer-step.tsx` +
`step-dots.tsx` (extracted from onboarding.tsx); wired into `routes/onboarding.tsx`
as a `phase` state (`welcome`→`practice`), practice setup bumped to step 2.

Decisions (Yuqi): placement = dedicated welcome step; **survey gates the trial** —
the CTA "Claim 3 months of Team free" carries the answers forward, "Skip for now"
forgoes the offer.

## 3-month Team-trial grant

Claiming the offer now actually grants the plan (no DB migration — mirrors how demo
Team firms are seeded):

- `FirmCreateInputSchema.grantTeamTrialMonths?` (`packages/contracts`).
- `FirmsRepo.grantTeamTrial` on the port (`packages/ports/tenants.ts`).
- `makeFirmsRepo.grantTeamTrial` (`packages/db/repo/firms.ts`): sets
  `firm_profile.plan='team'` + seatLimit 10, inserts a `subscription` row
  (`status='trialing'`, trial window now → +months, null Stripe).
- `firms.create` grants when the flag is set; `onboarding-firm-flow` forwards it;
  `onboarding.tsx` passes `grantTeamTrialMonths: 3` only when the offer was claimed.

Verified: db repo unit test (4/4) + server procedure tests (9/9: grants-on-claim,
skips-on-skip) + typecheck across contracts/ports/db/server/app. No downgrade cron
yet, so the 3-month expiry isn't enforced — `trialEnd` is recorded for a future job.
**Still TODO:** persist the questionnaire answers (focus/tools/pain) — currently only
in the `practiceCreated` analytics event.

## First-run tour (`/today`)

A short, once-only spotlight tour on the dashboard: 4 steps highlight the stable
sidebar nav (Today → Alerts → Deadlines → Rule library) so it orients a new user even
when the dashboard is still empty. `features/onboarding/first-run-tour.tsx` anchors to
nav rows via a `data-tour-href` attribute (locale-proof, added on `NavMenuItem` in
`app-shell-nav.tsx`), dims the rest with a box-shadow cutout, persists "seen" in
localStorage, supports Esc/arrows/Enter, respects reduced-motion, and self-skips when
it can't anchor (collapsed rail / mobile). Mounted in `routes/dashboard.tsx`. Decision
(Yuqi): one orientation tour on `/today` only — not per-page tours; other pages teach
through their own design / empty states.

## i18n

`pnpm i18n:extract` run — new `<Trans>` strings are in the app catalogs; **32 zh-CN
strings are currently missing** (welcome step, Federal copy, tour) and fall back to
English until translated.
