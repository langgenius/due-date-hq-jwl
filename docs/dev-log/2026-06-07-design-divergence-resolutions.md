# 2026-06-07 — Design-divergence audit resolutions

Applied the resolved decisions from the design-canvas audit. Each shipped change
was committed separately with `tsgo --noEmit -p apps/app` (the app has no
`typecheck` script; this is the equivalent) + affected tests green. i18n string
changes went through `i18n:extract` + `i18n:compile` (strict) with zh-CN
translations so the `i18n-catalog-drift` CI stays green.

## Shipped

### 1. Hybrid OTP-code + auto-fill link sign-in (`4023ecab`)

Kept the existing `emailOTP` plugin — **no** `magicLink` plugin added.

- **Server** (`apps/server/src/auth.ts`, `apps/server/src/i18n/messages.ts`):
  `sendSignInOtpEmail` now sends BOTH the 6-digit code (existing body) and a
  primary-button deep link `${APP_URL}/login?email=<email>&code=<otp>`. New
  `signInOtp.cta` message (en "Sign in to DueDateHQ" / zh "登录 DueDateHQ").
- **App** (`apps/app/src/features/auth/email-otp-sign-in-form.tsx`,
  `apps/app/src/routes/login.tsx`): `EmailOtpSignInForm` gained
  `initialEmail`/`initialCode`; when both are a valid email + 6-digit code it
  seeds the code-entry view and auto-submits the verify step on mount (shared
  `verifyCode`, same `signInWithEmailCode` path, no password). An expired/invalid
  code surfaces the normal error with the email pre-filled so Resend works.
  `login.tsx` forwards `?email=&code=` and suppresses Google One Tap while a link
  is auto-verifying. Post-send copy updated to: "Enter the 6-digit code we
  emailed you — or just tap the link in the email."

### 2. `/today` alias (`a046b3a2`)

`apps/app/src/router.tsx`: added `/today` rendering `routes/dashboard.tsx` in
place (no redirect). Index stays canonical; `/dashboard` still redirects to `/`.
Reuses `routeSummaries.dashboard` (already titled "Today").

### 3. `/obligations` → `/deadlines` 301 + key rename (`0677493f`)

The path rename, redirect, and in-app links had already shipped previously. This
completed the item: the legacy `/obligations` alias now returns a permanent
**301** (was 302); `routeSummaries.obligations` key renamed to `deadlines` (title
unchanged, "Deadlines"). Router test updated to assert 301.
`/obligations/calendar` left at 302 (not in the audit item's scope).

### 4. Calendar label (`b907eff2`)

`apps/app/src/routes/route-summary.ts`: `calendarSync` title "Calendar sync" →
"Calendar" (reuses existing "Calendar"→"日历" zh-CN). Canonical doc updated
(`docs/Design/DueDateHQ-DESIGN.md` sidebar/nav note). Other "Calendar sync"
usages (toolbar/settings/command palette) were out of scope and left unchanged.

## Verified (report-only — no code change needed)

| #   | Item                            | Result                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5   | Deadline detail tabs            | **All present** in `ObligationQueueDetailDrawer.tsx`: Summary, Materials, Extension, Evidence (Radix Tabs, visibility per obligation type). Nothing to build.                                                                                                                                                                                                                                             |
| 6   | Clients empty state             | Present (`ClientFactsWorkspace.tsx`): `EmptyState` + `UsersRoundIcon`, "No clients yet" / "Import a CSV or create the first manual client record." / "Import clients". Can't diff against Figma jQFBx from here — copy/illustration recorded for design comparison; no refactor per instruction.                                                                                                          |
| 7   | Alerts in-page detail           | Present: `?alert=<id>` query param → `AlertDetailDrawer` (DrawerProvider.tsx). **No** `/alerts/:id` route.                                                                                                                                                                                                                                                                                                |
| 8   | Rules detail drawer             | Present: `?rule=<id>` drawer on `/rules/library`. **No** `/rules/:ruleId` route.                                                                                                                                                                                                                                                                                                                          |
| 9   | Practice Smart Priority         | Present as a section/card inside `practice.tsx` (gated by `firm.priority.update`). Not a separate route.                                                                                                                                                                                                                                                                                                  |
| 10  | Migration error states          | All three present: Step 1 file-rejected (`Step1Intake.tsx`), Step 2 AI-mapping-failed banner + `BadRowsPanel` (`Step2Mapping.tsx`), Step 3 normalize banner (`Step3Normalize.tsx`, banner-only).                                                                                                                                                                                                          |
| 11  | Onboarding rule-review prompt   | Present: `onboarding-firm-flow.ts` `postOnboardingTarget()` routes to `/migration/new?ruleReview=<n>&ruleReviewJur=<jurs>` when `reviewRequiredCount > 0`.                                                                                                                                                                                                                                                |
| 12  | Cmd-K overlay                   | Present: `CommandPalette.tsx` via `KeyboardProvider` (Cmd/Ctrl-K), no route. Covers Navigate (Today, Deadlines, Notifications, Reminders, Workload, Clients, Practice, Rules/Coverage/Sources/Library, Alerts, Temporary rules, Members, Billing, Audit, Settings, Calendar) + Actions (Import clients, Calendar sync).                                                                                   |
| 13  | Email composition + bulk modals | **Partial.** Email composition exists as `SignatureReminderDialog` (`features/obligations/queue/dialogs.tsx`), wired into the deadline detail drawer for signature reminders, with built-in bulk mode. **Gap:** no standalone general-purpose bulk-action confirmation modal (design X4t2E) and no general email composer wired into the alerts/clients action menus. Reported per instruction; no build. |

## No-action (recorded)

Per the audit, these stay as-is — confirmed in `router.tsx`:

- `/account/security` stays (not moved under `/settings`).
- `/members` stays top-level (not nested under `/settings`).
- `/reminders` stays top-level (not nested under `/settings`).
- Auth routes `/login`, `/two-factor`, `/accept-invite` stay top-level (no `/auth/*` prefix).
- Accept-invite name field: dropped from design; no `user.update` work in `accept-invite.tsx`.
- Reminder templates, Settings profile page, role-matrix UI, billing sub-route designs, tour overlay: deferred build, no code this round.

## Housekeeping done alongside

- `chore(i18n)` (`d440620c`): extracted + translated the migration name-matcher
  Step 2 strings that an earlier commit (`b700c4b1`) added without running
  `i18n:extract` — this had left the `i18n-catalog-drift` CI red (drift +
  untranslated zh-CN). Now idempotent and strict-clean.

## Known pre-existing issue (out of scope, flagged separately)

`apps/app/src/features/migration/Wizard.test.tsx` →
"keeps the all-ignore fallback from continuing out of Step 2" is **RED on main**.
It expects the old "AI prepared your columns" banner, but the name-matcher
fallback (`b700c4b1`) changed Step 2 to render "AI mapping unavailable…". Not
touched by this audit work (no migration files changed); spun off as a follow-up
to update the stale test against the shipped behavior.
