# 2026-06-07 — Design-divergence audit resolutions (Rounds 1 & 2)

Applied the resolved decisions from the design-canvas audit across two rounds.
Each shipped change was committed separately with `tsgo --noEmit -p apps/app`
(the app has no `typecheck` script; this is the equivalent) + affected tests
green. i18n string changes went through `i18n:extract` + `i18n:compile` (strict)
with zh-CN translations so the `i18n-catalog-drift` CI stays green.

Round 2 guidance: where the backend is already simpler/cleaner than the design
implies, the backend stays and the design adapts — so a couple of Round-2 items
(E4 owner gates) are intentionally **not** implemented because doing so would
regress an existing, cleaner permission model. See Round 2 below.

## Round 1 — shipped

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

---

# Round 2

Round 2 re-listed A1–A4 (already shipped in Round 1: A2 `a046b3a2`, A3
`0677493f`, A4 `b907eff2`, A1 `4023ecab`) and added a delta plus a large
verify/report batch.

## Round 2 — shipped

### A1 delta — large code + `continue=` link target (`9f1b5b7b`)

- Email now renders the 6-digit code in **large** readable text (was inline in
  the body sentence); `signInOtp.body` reduced to instruction + expiry (server
  i18n, en + zh; message test updated; `signInOtp.cta` now covered).
- Deep link gains `&continue=<post-sign-in target>`. OTP send has no redirect
  context, so it's emitted empty and `/login` falls back to `/`.
- `login.tsx` prefers an in-app `continue` over the page's own `redirectTo` for
  the post-auto-verify navigation. emailOTP plugin unchanged; no magicLink.

### E8 — dormant password column comment (`452bb1b8`)

`packages/db/src/schema/auth.ts`: comment noting `account.password` is part of
better-auth's standard adapter schema and intentionally dormant (emailOTP + OAuth
only), so future "drop unused column" PRs don't remove it.

## Round 2 — verify-and-report

Frame IDs (jQFBx, G6P12y, …) reference the Figma canvas, which isn't readable
from here; these report **what the code does today**.

| #   | Result                                                                                                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | matches — Summary/Materials/Extension/Evidence tabs in `ObligationQueueDetailDrawer.tsx`.                                                                                                                                                                                                                                                               |
| B2  | matches (code side) — `ClientFactsWorkspace.tsx`: "No clients yet" / "Import a CSV or create the first manual client record." / "Import clients". Can't diff vs jQFBx from here.                                                                                                                                                                        |
| B3  | matches — alerts open in-page via `?alert=` (`AlertDetailDrawer`); no `/alerts/:id` route.                                                                                                                                                                                                                                                              |
| B4  | matches — rules open in-place via `?rule=` on `/rules/library`; no `/rules/:ruleId` route.                                                                                                                                                                                                                                                              |
| B5  | gap (vs "filter chip"): `rules.library.tsx` uses a **jurisdiction rail master-detail** (`?jurisdiction=` selection), not a filter-chip model. Functions; differs in pattern from G6P12y.                                                                                                                                                                |
| B6  | matches (pattern): rule create/update conflicts surface as error-code → `rpcErrorMessage()` + toast/inline (e.g. `version_conflict`), not a dedicated 409 modal.                                                                                                                                                                                        |
| B7  | matches — Smart Priority is a section inside `practice.tsx` (owner-gated), not a route.                                                                                                                                                                                                                                                                 |
| B8  | matches — three migration error states present (Step 1 file-rejected, Step 2 mapping banner + `BadRowsPanel`, Step 3 normalize banner).                                                                                                                                                                                                                 |
| B9  | matches — onboarding rule-review prompt present (`postOnboardingTarget` → `/migration/new?ruleReview=`).                                                                                                                                                                                                                                                |
| B10 | matches — global Cmd/Ctrl-K `CommandPalette` (no route); Navigate + Actions groups. Indexes navigation targets + import/calendar actions (not per-row deadlines/alerts/clients content).                                                                                                                                                                |
| B11 | partial — `SignatureReminderDialog` (email composition, bulk-capable) wired to the deadlines drawer; **gap**: no standalone bulk-action confirmation modal (X4t2E) and no general email composer on alerts/clients menus; toast family (I4MkF2) via sonner.                                                                                             |
| B12 | matches — `rules.preview.tsx` (`RulesPreviewRoute`→`GenerationPreviewTab`) and `rules.temporary.tsx` (`RulesTemporaryRoute`→`TemporaryRulesTab`) both export and load.                                                                                                                                                                                  |
| B13 | report — current error catalog: `error.tsx` `RouteErrorBoundary` (404 / route-failed-with-status / generic boundary), `fallback.tsx` (quiet hydrate fallbacks), `not-found.tsx` (in-shell 404). Backfilling design-only variants (vbXk1/J5vjP) needs the frames — not done.                                                                             |
| E1  | `/opportunities` has **no code route** and no `opportunities.tsx`; only comments/parity references. Likely stale canvas frame (BIc64) — flagged for canvas deletion, not built.                                                                                                                                                                         |
| E2  | gap — no annual-rollover **modal** UI in `obligations.tsx`/features; only an audit-event label `obligation.annual_rollover.created` exists. Design c7xPK is unimplemented (reported, not built).                                                                                                                                                        |
| E3  | `/deadlines` empty + skeleton present (`ObligationQueueEmptyState` + `<Skeleton>`); `/alerts`, `/alerts/history`, `/clients` empty states live in their feature components (present, delegated). Can't pixel-diff vs frames.                                                                                                                            |
| E4  | **not implemented (intentional)** — billing already gates read (owner/manager via `billing.read`) + write (owner via `billing.update`); practice obscures owner-only sections. A hard loader 403 would regress manager/member read access and contradict ROH-D11; `account.security` has no owner-gate to mirror (it's a personal page). Backend stays. |
| E5  | matches — `auth-capabilities.ts` fallback `microsoft:false, emailOtp:true`; `login.tsx` hides the Microsoft button unless `providers.microsoft`; emailOtp defaults true.                                                                                                                                                                                |
| E6  | no-op — invitation email has no "password" copy (`invitation.body` is "{inviterName} invited you…"; CTA "Accept invitation"). Already link-only.                                                                                                                                                                                                        |
| E7  | report — `notification-preferences-page.tsx`: 5 toggles (Email, In-app, Deadline reminders, Alerts, Unassigned work) + Morning digest (day-of-week, hour, preview, run history). Diff vs Y5UWd needs the frame.                                                                                                                                         |
| E9  | report — `settings.tsx` is a populated hub (Practice / Billing / Compliance / Automation) linking practice, members, workload, billing, audit, reminders, notification prefs, calendar. Not near-empty; recommend keeping as hub (option a). Does not link `/account/security` (lives in the user menu).                                                |
| E10 | report — onboarding is a single-page form: practice name → internal-deadline offset → monitoring start date → state-rule multi-select → submit (`activateOrCreateOnboardingFirm`). No multi-step wizard.                                                                                                                                                |
| E11 | matches — `STRIPE_PRICE_*` documented in `apps/server/.dev.vars.example` (PRO monthly/yearly required; SOLO/TEAM/FIRM optional).                                                                                                                                                                                                                        |
| E12 | no-op — the link-only MFA-disable string is intact (`account.security.tsx:359`).                                                                                                                                                                                                                                                                        |

## Round 2 — no-op / record-only (C, F)

Per the audit, these stay as-is (design is adapting): top-level auth routes (no
`/auth/*`), `/account/security`, `/members`, `/reminders` stay; `/migration/new`
is the canonical import URL; `/account/security/two-factor-setup` is the 2FA URL;
accept-invite collects no name (`displayNameFromEmail`); better-auth
`account.password` stays (now documented — E8); `/audit` is the single audit
route; deferred specs (reminder templates, tour overlay, settings profile /
role-matrix, billing sub-route placeholders) — no code. Canvas hygiene (F:
EXPLORATION/STATE-VARIANT tagging, orphan rectangles) is canvas-side only.
