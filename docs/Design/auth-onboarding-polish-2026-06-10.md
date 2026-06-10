# Auth & onboarding polish — implementation brief (2026-06-10)

**Audience:** Claude Code (implementer)  
**Designer:** Yuqi  
**Reference canvas:** `~/Desktop/duedatehq_work.pen`  
**Reference route (DONE — do not change):** `apps/app/src/routes/login.tsx` (Pencil `pW6pK`)

This brief brings the polished Pencil designs for the remaining auth + onboarding screens into code. **The login page is already done** and is the canonical pattern — match its voice, tokens, and shadow restraint, but do not refactor it.

---

## Scope

| Route                   | Status                    | Pencil node | Action                          |
| ----------------------- | ------------------------- | ----------- | ------------------------------- |
| `/login`                | ✅ Done                   | `pW6pK`     | **No changes.** Reference only. |
| `/two-factor`           | Implemented, needs polish | `uu9SI`     | Update card per design.         |
| `/accept-invite`        | Implemented, needs polish | `e3FyUB`    | Update card per design.         |
| `/onboarding`           | Implemented, needs polish | `E76U6Q`    | Update card per design.         |
| `/auth/magic-link-sent` | **Missing**               | `S2xaP`     | **Build new route.**            |

**Out of scope (do NOT touch):**

- `apps/server/src/auth.ts` — auth backend (better-auth, Cloudflare D1)
- Any auth endpoint or session logic
- `_entry-layout.tsx` (`EntryShell`) — shared shell already in production
- `/login` route
- `/migration/new` polish — separate pass
- Email templates, organization invitation flow, OAuth callback URLs

---

## Design language (extracted from `pW6pK` + Pencil polish session)

These rules govern every screen in this brief.

### 1. Shadows — restrained

- **No outer shadows on full cards.** Border + body→white bg contrast carries the lift. The login card had `shadow-[0_8px_32px_-4px_rgba(16,24,40,0.08)]` — that's fine because it's the only such shadow on the route. For new/updated cards, **default to no card shadow**.
- **Micro-shadows OK** on small affordance elements where they signal interactive state — active tab toggle, active segmented-control option, primary button. Cap at `shadow-[0_1px_2px_rgba(16,24,40,0.06)]` — never larger.
- **Never `blur ≥ 24px`** anywhere outside a modal-over-scrim.

> Memory ref: `feedback_restrained_shadows.md`

### 2. Corner radius — fixed scale

`rounded-xl` (12) wrappers and primary buttons · `rounded-lg` (8) inputs, chips, smaller buttons · `rounded-full` pills/avatars · `rounded-2xl` (16) only on hero entry cards (like login's right column) · **never freelance `rounded-[14px]` etc.**

> Memory ref: `feedback_no_random_rounded_corners.md`

### 3. Token mapping (Pencil → Tailwind)

| Pencil variable                           | Tailwind utility (or class)                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| `$ddhq-bg-body`                           | `bg-bg-canvas`                                                               |
| `$ddhq-bg-default`                        | `bg-background-default`                                                      |
| `$ddhq-bg-subtle`                         | `bg-bg-subtle`                                                               |
| `$ddhq-text-primary`                      | `text-text-primary`                                                          |
| `$ddhq-text-secondary`                    | `text-text-secondary`                                                        |
| `$ddhq-text-tertiary`                     | `text-text-tertiary`                                                         |
| `$ddhq-text-muted`                        | `text-text-muted`                                                            |
| `$ddhq-text-accent`                       | `text-text-accent`                                                           |
| `$ddhq-text-success`                      | `text-status-done` (or `text-state-success-*` — match neighbors)             |
| `$ddhq-divider-subtle`                    | `border-divider-subtle`                                                      |
| `$ddhq-divider-regular`                   | `border-divider-regular`                                                     |
| `$ddhq-state-accent-solid`                | `bg-state-accent-solid` (button); use the `<Button>` primitive when possible |
| `$ddhq-state-warning-solid`               | `bg-state-warning-solid` / `bg-status-attention`                             |
| `Geist 16px / weight 500 / -0.3 tracking` | `text-base font-medium tracking-[-0.3px]`                                    |
| `JetBrains Mono`                          | `font-mono`                                                                  |

**Rule:** Use Tailwind utilities mapped to CSS vars. **Do not hardcode hex colors** (except for brand logos: Google's 4-color G, Microsoft's 4-square — those are already in `login.tsx` as `GoogleIcon` / `MicrosoftIcon` SVG components, extract them to a shared file if more than one route needs them).

### 4. Typography rhythm (cards)

- **Eyebrow** — `text-[10px] sm:text-[11px] font-semibold tracking-[1.4px] uppercase text-text-tertiary` (or `text-text-muted` for the quietest tier)
- **H1** — `text-[28px] sm:text-[30px] font-semibold leading-[1.15] tracking-[-0.6px] text-text-primary`
- **Subhead** — `text-sm font-medium leading-relaxed text-text-tertiary` (`leading-[1.55]` if you want exact)
- **Body** — `text-sm font-normal leading-relaxed text-text-secondary`
- **Footnote / italic source line** — `text-[11px] font-medium italic text-text-tertiary`
- **Inputs** — `h-12 rounded-xl border border-divider-regular bg-background-default px-3.5 text-sm` (matches login)
- **Primary CTA** — use `<Button>` from `@duedatehq/ui` at `size="lg"` with the existing accent variant; full-width via `className="w-full"`
- **Mono numerals** (countdowns, OTP digits, build hashes) — `font-mono`

### 5. Voice

Direct, declarative, friendly. _"We page you when it matters."_ not _"Best-in-class observability layer."_ Avoid invented metrics, customer counts, dollar amounts, named testimonials, or press citations — none of those trace to anything real. If you need example data, use the existing demo client placeholders (`hudson`, `patel`, `kim`, `mercer`).

> Memory ref: `feedback_no_fiction_on_canvas.md`

---

## Per-screen specs

### A. `/two-factor` — polish (Pencil `uu9SI`)

**File:** `apps/app/src/routes/two-factor.tsx`

**Keep:** the existing loader, redirect, auto-submit-on-6-digits behavior, all error handling, all better-auth calls. Card shell stays inside `EntryShell`. **TOTP only — no SMS/email/resend** (per Q1).

**Update card content to match Pencil `uu9SI`:**

1. **Heading** — `"Enter your 2FA code"` _(existing copy — keep)_
2. **Subhead** — `"Open your authenticator app and enter the 6 digits you see for DueDateHQ."` _(existing copy — keep)_
3. **Code-input row** — render **six separate digit cells** instead of a single `<input type="text">`. Spec per cell:
   - `w-14 h-16 rounded-xl border border-divider-regular bg-background-default flex items-center justify-center`
   - Active (focused) cell gets `border-state-accent-solid ring-2 ring-state-accent-active-alt`
   - Filled digit: `font-mono text-2xl font-semibold text-text-primary`
   - `inputMode="numeric"` and `autoComplete="one-time-code"` on each cell so iOS / 1Password autofill works
   - Implementation tip: one hidden `<input>` for the actual value + six `<span>` overlays driven by index; or a controlled array of six `<input maxLength={1}>` with arrow-key + paste handling. Either is fine — keep auto-advance and paste-distributes-across-cells.
4. **Above the cells** — small label row, left side only:
   - `text-xs font-semibold text-text-secondary` reading `"Verification code"`
   - **No masked-email hint on the right** — there is no email send for TOTP, so claiming "sent to m\*\*\*@whitmore.cpa" would be fiction. Leave the right side empty, or render a `text-[11px] italic text-text-muted` factual helper like `"6-digit code from your authenticator app"` (this matches the existing route's helper at `two-factor.tsx:107-110`).
5. **Below the cells** — **no resend countdown.** Replace with a single italic hint row + the backup-code escape:
   - Left: small clock icon (`size-3 text-text-muted`) + `text-[11px] italic text-text-tertiary` reading `"Codes refresh every 30 seconds in your authenticator app."`
   - Right: text-link to the existing recovery escape — `<button>` styled `text-xs font-semibold text-text-accent` reading `"Use a backup code"`. **Wire it to whatever the current route does today** (the existing route is at `two-factor.tsx:138-148`; it's a `mailto:` to support). If/when backup-code login is exposed through better-auth, this link gets pointed at it.
6. **Primary CTA** — `"Verify and continue"` _(existing copy — keep)_. Full-width below. Auto-submits when the 6th cell fills.
7. **Shadow** — remove any heavy `shadow-[...]` on the card. Border + bg is enough.

### B. `/accept-invite` — polish (Pencil `e3FyUB`)

**File:** `apps/app/src/routes/accept-invite.tsx`

**Keep:** loader (which fetches invitation via `/api/auth/organization/get-invitation`), all accept/decline handlers, the existing `EmailOtpSignInForm` for unsigned-in users.

**Update card content to match Pencil `e3FyUB`:**

1. **Eyebrow** — small badge above the heading: `"YOU'RE INVITED"` in an accent-tinted pill — `inline-flex items-center gap-1.5 rounded-full bg-state-accent-hover-alt px-2.5 py-1 text-[10px] font-bold tracking-[1.4px] uppercase text-text-accent`
2. **Heading** — `"{senderName} invited you to {firmName}"` using the data the loader already returns from the invitation lookup.
3. **Subhead** — `"You'll join with the role and permissions assigned to this invitation. You can change profile details anytime in settings."`
4. **Role/firm card** — a single inset row inside the main card, summarizing what's being offered:
   - `rounded-xl border border-divider-subtle bg-bg-subtle px-4 py-3 flex items-center gap-3`
   - 32×32 firm avatar circle (if no logo, initials from the firm name on `bg-bg-subtle` with `text-text-secondary` initials)
   - Two-line stack: `font-semibold text-sm text-text-primary` firm name; `text-xs text-text-tertiary` row reading `Role · {role} · {teamSize ?? '—'}`
5. **Your email** — show the existing OTP form **only when the invitee is unsigned-in**. Don't restyle the form internals — `EmailOtpSignInForm` is shared.
6. **Primary CTA** — `"Accept invitation"` full-width. Existing handler.
7. **Secondary** — `"Use a different email"` text-link below the CTA, centered, `text-xs text-text-tertiary` with `text-text-accent` for the actionable word. Clears the email cookie + reloads form, OR navigates to `/login`. Don't add a "decline" button unless the existing route already had one; preserve current flow.
8. **Shadow** — no card shadow.

### C. `/onboarding` — polish (Pencil `E76U6Q`)

**File:** `apps/app/src/routes/onboarding.tsx`

**Keep:** loader (gates on missing `activeOrganizationId`), the `activateOrCreateOnboardingFirm` mutation, all 5 fields, all field validation, the post-success redirect. **Real fields stay** — practice name, monitoring start date, internal deadline offset, time zone, state rule activation. The Pencil mock's "firm name / team size / obligation focus" was _illustrative of the visual rhythm_, not a schema swap. Per Q2 we render `Step 1 of 3 · Practice` using the canonical `ONBOARDING_STEPS` array already in the file.

**Update card to match Pencil `E76U6Q`:**

1. **Above the card** — the step indicator row. Source `ONBOARDING_STEPS` from the existing constant (`onboarding.tsx:31-36`):
   - Layout: `inline-flex items-center gap-3`
   - Left side: `text-[11px] font-semibold tracking-[1.4px] uppercase text-text-tertiary` reading `"STEP 1 OF 3"` (use the `ACTIVE_STEP_INDEX + 1` / `ONBOARDING_STEPS.length` pattern so it stays in sync with the constant)
   - Then a 3-dot tracker: three `size-1.5 rounded-full` dots; index 0 (Practice — active) is `bg-state-accent-solid`, the other two are `bg-bg-subtle`
   - Trailing label: `text-[11px] font-medium text-text-secondary` showing `ONBOARDING_STEPS[ACTIVE_STEP_INDEX]` (i.e. `"Practice"`)
   - Optional tiny secondary line below the row: `text-[11px] italic text-text-muted` reading `"Then: rules, then clients."` (paraphrases steps 2 + 3, which live at `/migration/new`).
2. **Heading** — `"Set up your practice"` _(existing copy — keep)_
3. **Subhead** — `"Five fields the engine needs before it can schedule anything. Edit anytime in Settings."` _(existing copy — keep)_
4. **Field rhythm** — every field group:
   - Label `<label className="text-xs font-semibold text-text-secondary">…</label>` + a `text-[11px] italic text-text-muted` helper on the right (the existing route already uses a `FieldHeaderRow` component with this shape — extend it, don't replace it)
   - Inputs (`<Input>`, `<IsoDatePicker>`, `<FirmTimezoneSelect>`, `<StateRuleActivationSelector>`) use the existing components. Only update the wrapper styling to match the login rhythm — `h-12 rounded-xl border border-divider-regular bg-background-default px-3.5 text-sm` on the underlying `<input>` if it's not already this.
5. **State activation selector** — the existing `<StateRuleActivationSelector>` is a grid of US states + DC. **Do not replace it with the Pencil mock's flat chip multiselect** — the existing component already handles real backend wiring. Just match its visual rhythm: chips should look like the mock's chip spec when wrapped (see below) if a redesign of that component is in scope; otherwise leave it.
6. **Multi-select chip styling** (when used inside the state selector or elsewhere):
   - Inactive: `inline-flex items-center gap-1.5 rounded-full border border-divider-regular bg-background-default px-3 py-1.5 text-xs font-medium text-text-secondary`
   - Active: `bg-state-accent-solid text-text-primary-on-surface border-transparent` with a leading `<CheckIcon className="size-3" />`
7. **Primary CTA** — `"Create practice · activate jurisdictions"` _(existing copy — keep)_ with `<ArrowRightIcon />`. Existing handler.
8. **Skip link** — per Q4. Below the CTA, centered. `<button type="button">` styled as a text link:
   - Copy: `"I'll set this up later — start with the defaults"`
   - `className="mt-2 self-center text-xs font-medium italic text-text-tertiary underline underline-offset-4 decoration-divider-regular hover:text-text-secondary hover:decoration-text-tertiary"`
   - Behavior: call the same `activateOrCreateOnboardingFirm` mutation with the current default form values (the form already initializes them at `onboarding.tsx:149-159`). No new mutation needed.
   - On success: sonner toast `"Practice created with defaults. You can edit anything in Settings → Practice."` Then run `navigate(postOnboardingTarget(result, redirectTo))` — same redirect path as the primary CTA.
9. **Existing legal/footer copy** — keep `"DueDateHQ will create filing plans from the first applicable deadline on or after your monitoring start date. By continuing you agree to the Terms and Privacy Policy."` It already does its job; don't replace it.
10. **Shadow** — no card shadow.

### D. `/auth/magic-link-sent` — NEW route (Pencil `S2xaP`)

**File to create:** `apps/app/src/routes/auth.magic-link-sent.tsx`

**Why it's needed:** today `/login`'s email-OTP form transitions inline to the code-entry step on the same page. Per Q3 we keep that inline flow working — this new route is **additive**: a dedicated wait/instructional surface a user can opt into via an "I'll wait for the email" link on `/login`'s OTP step, or that a future email template can deep-link to as a fallback when the deep-link `?code=` is missing.

**Router wiring** — mirror the existing entry-route pattern (`router.tsx:372-381`):

```tsx
{
  path: '/auth/magic-link-sent',
  loader: magicLinkSentLoader,
  handle: routeHandle(routeSummaries.magicLinkSent),
  HydrateFallback: EntryRouteHydrateFallback,
  lazy: async () => {
    const { MagicLinkSentRoute } = await import('@/routes/auth.magic-link-sent')
    return { Component: MagicLinkSentRoute }
  },
}
```

Add this **as a child of `EntryShell`** (not standalone like `/login`). Register the `routeSummaries.magicLinkSent` entry alongside the other summaries in the same file.

**Loader** (`magicLinkSentLoader`) — mirror the no-validation convention used by `/accept-invite` at `accept-invite.tsx:73`:

- Read `?email=` from the URL via `request.url`.
- If missing or not a syntactically-valid email, `redirect('/login')`.
- No session check (signed-out users land here legitimately).
- Return `{ email }` for the component.

**Mutations:** none on mount. The two actions on the page both call existing functions:

- **Resend** → `sendEmailSignInCode(email)` from `apps/app/src/lib/auth.ts:121-128`. Throws on error (handle with a sonner toast). **Rate limit: 3 calls per 60 seconds** (`packages/auth/src/index.ts:29-31`) — see countdown spec below.
- **Change email** → `navigate('/login?email=' + encodeURIComponent(email))` — back to `/login` with the email prefilled.

**Card content per `S2xaP`:**

1. **Brand lockup** — use the existing `EntryBrandLockup` component (centered, 56px mark, no pill).
2. **Hero icon** — 64px rounded-full tinted circle: `flex size-16 items-center justify-center rounded-full bg-state-accent-hover-alt`. Inside: `<MailCheckIcon className="size-7 text-state-accent-solid" />`.
3. **Heading** — `"Check your inbox"` (H1 spec).
4. **Subhead** — `"We sent a one-time sign-in link to the address below. Open it on this device — the link expires in 10 minutes."`
5. **Email chip** — `inline-flex items-center gap-2.5 rounded-xl bg-bg-subtle px-3.5 py-2.5`:
   - `<MailIcon className="size-3.5 text-text-tertiary" />`
   - `<span className="font-mono text-[13px] font-medium tracking-[0.2px] text-text-primary">{email}</span>`
   - `<span aria-hidden className="block h-3.5 w-px bg-divider-regular" />`
   - `<Link to={"/login?email=" + encodeURIComponent(email)} className="text-xs font-semibold text-text-accent">Edit</Link>`
6. **Divider** — full-width hairline `h-px w-full bg-divider-subtle`.
7. **Resend group — rate-limit aware** (the email-send endpoint allows 3 per 60s; honor that on the client so the user doesn't get a 429):
   - Tiny eyebrow `text-[10px] font-bold tracking-[1.4px] uppercase text-text-muted` reading `"DIDN'T GET IT?"`
   - Row beneath: clock icon + `"You can resend in"` + `<span className="font-mono">{mm:ss}</span>` + a hairline divider tick + italic `"Check your spam folder too"`.
   - **Initial countdown: 60 seconds** (start the timer on mount, since the user just sent an email to land here). When it hits 0, swap the countdown for a `<button>` text-link `"Resend link"` (`text-xs font-semibold text-text-accent`).
   - On click of "Resend link": call `sendEmailSignInCode(email)`. On success → sonner toast `"Sign-in link sent again — check your inbox."` and reset the timer to 60s. On error → `assertNoAuthClientError` throws; show `toast.error(err.message)`.
   - **Track local resend count** — after 3 resends, replace the "Resend link" button with `text-[11px] italic text-text-muted` reading `"Too many tries — wait a minute, then try again."` and re-enable after a fresh 60s window. (Matches backend rate limit; prevents a 429 round-trip.)
8. **Foot link** — centered row: `"Wrong email?"` text + `<Link to={"/login?email=" + encodeURIComponent(email)}>Use a different one →</Link>`
9. **No card shadow.**

The shared `EntryShell` already provides the page header + footer + skip-to-content anchor. **Do not add a separate top bar or footer to this route.**

**Discoverability — add the "I'll wait for the email" link on `/login`:**

In the existing `/login` OTP-step view (when `codeSent === true` in `login.tsx:663+`), append a small secondary link under the resend button:

```tsx
<Link
  to={`/auth/magic-link-sent?email=${encodeURIComponent(email)}`}
  className="text-xs font-medium italic text-text-tertiary underline underline-offset-4 decoration-divider-regular hover:text-text-secondary"
>
  I'll wait for the email
</Link>
```

This is the only edit to `login.tsx` that the brief sanctions — it's a single 6-line addition, additive, no behavioral change to the inline OTP path. Update the "login.tsx diff should be empty" item in the DoD accordingly: _"login.tsx diff is one addition: the 'I'll wait for the email' link on the OTP step."_

---

## Component extraction (recommended)

You may keep things inline for the first pass; if duplication crosses a threshold, extract:

- `apps/app/src/features/auth/auth-card.tsx` — `<AuthCard>` wrapper: `rounded-2xl border border-divider-subtle bg-background-default p-10 lg:p-14 w-full max-w-[560px]` (no shadow). Optional `eyebrow`, `hero`, `heading`, `subhead`, `children` slots.
- `apps/app/src/features/auth/otp-cells.tsx` — six-cell OTP input. Owns the active-cell ring, the per-cell ref array, paste handling. Returns a controlled string. Reusable across `/two-factor` and any future code-entry flow.
- `apps/app/src/features/auth/resend-countdown.tsx` — `useResendCountdown(seconds = 42)` returning `{ remaining, ready, restart }` + a rendered text. Reused on `/two-factor` and `/auth/magic-link-sent`.

The Google + Microsoft `<svg>` icon components already live inside `login.tsx`. If you need them again, extract to `apps/app/src/features/auth/social-provider-icons.tsx` and re-import in `login.tsx` to keep behavior identical.

---

## Definition of done

- All four screens render under `pnpm dev` without console errors.
- TypeScript clean (`pnpm typecheck`).
- Lint clean (`pnpm lint`).
- No new heavy shadows introduced (`grep` your diff for `shadow-\[`; everything `blur ≥ 8` must be on the existing `/login` card only).
- No hardcoded hex except the existing Google/Microsoft brand SVGs (already in code) and the path `D` literal in the brand mark fallback.
- The shared `EntryShell` is unchanged.
- The shared `EmailOtpSignInForm` and `EntryBrandLockup` are unchanged (or extended additively).
- `/login` still renders and behaves identically. The **only sanctioned change** to `apps/app/src/routes/login.tsx` is the one ~6-line additive "I'll wait for the email" link on the OTP step described in Section D. No other edits.
- A dev-log entry is written at `docs/dev-log/2026-06-10-auth-onboarding-polish.md` summarizing files changed, with one-line links to this brief and the Pencil node IDs touched.

> Memory refs: `feedback_dev_log_on_commit.md`, `feedback_design_docs_on_change.md`, `feedback_main_direct_workflow.md` (commit directly to `main`).

---

## Resolved decisions (2026-06-10, from Yuqi)

All four open questions are answered. Each answer is now grounded in actual code; cited line numbers below come from a parallel code investigation run before this brief was finalized.

### Q1 → **TOTP only.** Use what the backend exposes today.

- Plugin: `twoFactor()` with `otpLength: 6`, `issuer: 'DueDateHQ'`, `allowPasswordless: true` (`packages/auth/src/index.ts:348-354`).
- **No SMS, no email-code, no push.** Only TOTP from an authenticator app, plus backup codes generated at setup.
- Verify endpoint: `orpc.security.verifyTwoFactor({ code })` → wraps `auth.api.verifyTOTP` (`apps/server/src/procedures/security/index.ts:178`).
- Backup codes exist (generated and shown once at `account-security-two-factor-setup.tsx:19-21,182-193`).
- **No resend** — TOTP codes are generated locally by the authenticator app. There is nothing for the server to "resend."

**Implications for Section A (`/two-factor` polish):**

- ❌ **Remove "Resend in 0:42"** from the design — TOTP has no resend. The space below the OTP cells should read something like a one-line italic hint instead: _"Codes refresh every 30 seconds in your authenticator app."_ (Pull from the same `useLingui` source as the existing route.)
- ✅ **Keep** the "Use backup code instead" link. The existing route already has a recovery escape — a `mailto:` to support at line 138-148. Wire the new link to whatever the current route does today; don't invent a different escape path.
- ✅ **Heading + subhead** — use the existing copy verbatim (the current code is intentional):
  - Heading: `"Enter your 2FA code"`
  - Subhead: `"Open your authenticator app and enter the 6 digits you see for DueDateHQ."`
- ✅ **Cells**: 6 numeric cells (input mode `numeric`, `autoComplete="one-time-code"`).
- ❌ **Remove the "sent to m\***@whitmore.cpa" masked-email hint\** — there's no email send for TOTP. Replace with a quieter hint pointing to the user's account email *only if\* the existing route already shows the account (otherwise omit).

### Q2 → **3 steps. Keep the current ones.**

- The current onboarding route already declares the canonical step list:
  ```ts
  const ONBOARDING_STEPS = ['Practice', 'Rules', 'Clients'] as const
  const ACTIVE_STEP_INDEX = 0
  ```
  (`apps/app/src/routes/onboarding.tsx:31-36`)
- Step 1 (`Practice`) is THIS route. Steps 2 + 3 happen at `/migration/new` (rules activation + client import) after the practice is created — `onboarding-firm-flow.ts:62-76` confirms the post-create redirect is `/migration/new?source=onboarding`.
- The current UI already shows `1/3 Practice` (`onboarding.tsx:234`).

**Implications for Section C (`/onboarding` polish):**

- ✅ **Render the 3-step indicator with the real step names.** Source the array from `ONBOARDING_STEPS` (don't hardcode). Three dots, first filled `bg-state-accent-solid`, others `bg-bg-subtle`. Label reads `"Step 1 of 3 · Practice"`.
- ✅ **Keep the existing 5 fields:** practice name, monitoring start date, internal deadline offset, time zone, state rule activation. **Do not** replace them with the Pencil mock's fictional "firm name / team size / obligation focus" fields. The mock illustrates the _visual rhythm_, not the schema.
- ✅ **Field labels stay verbatim** (the current code is intentional):
  - `"Practice name"` / "required, 2+ characters"
  - `"Monitoring start date"` / "ISO date"
  - `"Internal deadline offset"` / "days before the official due date"
  - `"Time zone"` / "drives when alerts and digests send"
- ✅ **CTA stays:** `"Create practice · activate jurisdictions"` (with `<ArrowRightIcon />`).
- ✅ **Heading + subhead stay:** `"Set up your practice"` / `"Five fields the engine needs before it can schedule anything. Edit anytime in Settings."`

### Q3 → **Yes, additive only.** Don't break the inline `/login` OTP flow.

- Inline OTP on `/login` is the current flow (`login.tsx:663` — when `codeSent` is true, the form re-renders an OTP step on the same page). **Leave that working.**
- `/auth/magic-link-sent` is a **new sibling surface**, reachable from:
  1. The deep-link email itself if it lands on a user without a session yet (the link goes to `/login?email=&code=&continue=`; future iteration could add `/auth/magic-link-sent` as a fallback when the email/code params are missing — but that's a follow-up, not this PR).
  2. An explicit `"I'll wait for the email"` text-link added to the `/login` OTP step (small, secondary; under the resend button). This is the user's manual escape if they prefer the dedicated wait surface over the inline one.
- **No email is sent from `/auth/magic-link-sent` on mount.** The email was already sent before the user landed here. The route only shows the wait state.

### Q4 → **Yes, include the skip link.** Wire it to defaults.

- `activateOrCreateOnboardingFirm` (the existing mutation at `onboarding.tsx:191`) accepts all fields with defaults except `practice name` (min 2 chars). Defaults defined at lines 149-159:
  - Practice name → `derivePracticeName(user.name || user.email)`
  - Time zone → `'America/New_York'`
  - Internal deadline offset → `DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS`
  - Monitoring start date → today in derived timezone
  - State rule activation → empty array (the mutation returns early with zero counts — `rules/index.ts:670-679`)
- **Skip link spec:**
  - Below the primary CTA, centered. `text-xs font-medium italic text-text-tertiary underline-offset-2 hover:text-text-secondary` with the actionable word as a `<button type="button">` (don't use `<a>`).
  - Copy: `"I'll set this up later — start with the defaults"`
  - Behavior: calls the same `activateOrCreateOnboardingFirm` mutation with the _current_ defaults (which the form already computes on render — they're sitting in the form state if untouched). No new mutation needed.
  - Toast on success: `"Practice created with defaults. You can edit anything in Settings → Practice."` (sonner).
  - Same redirect as the primary CTA: `postOnboardingTarget(result, redirectTo)` → typically `/migration/new?source=onboarding`.

---

_References — files to read before starting:_

- `apps/app/src/routes/login.tsx` (canonical pattern)
- `apps/app/src/routes/_entry-layout.tsx` (shared shell)
- `apps/app/src/features/auth/entry-brand-lockup.tsx`
- `apps/app/src/features/auth/email-otp-sign-in-form.tsx`
- `apps/app/src/lib/auth.ts` (client wrappers — _no_ changes; just read)
- `apps/app/src/router.tsx` (where the new route gets registered)
- `packages/ui/src/styles/tokens/semantic-light.css` (token names)
