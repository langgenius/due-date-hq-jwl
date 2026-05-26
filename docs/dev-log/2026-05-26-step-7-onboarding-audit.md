# Step 7 — Onboarding & First-Touch Flow Audit

**Author:** Onboarding audit (Yuqi)
**Branch:** `feat/step-7-onboarding-audit`
**Scope:** every first-touch surface — login, OTP, accept-invite, two-factor, onboarding, migration wizard, practice setup, billing checkout, empty states.

---

## Method

Bit by bit. Decision by decision. Default by default. Microcopy line by microcopy line.

For every surface I asked five questions:

1. **First-impression** — within 7 seconds, what does the user understand?
2. **Cognitive setup** — does the user know what they're choosing, before they choose?
3. **Form quality** — labels, helper text, error messages, focus order, save state.
4. **Emotional curve** — does this beat feel confident, secure, oriented, in control?
5. **Cross-flow consistency** — does this match every other onboarding surface in pattern, voice, default?

Severity rubric:

- **P0** — blocks the user or breaks trust on first contact.
- **P1** — confuses or annoys a paying user; ship before next release.
- **P2** — visible polish; ship in batch.
- **P3** — nit; document and defer.

---

## Flow 1 — `/login` (Email OTP + SSO)

### F1-01 · P1 · "Welcome to the workbench" doesn't say what the workbench is

- **Location:** `apps/app/src/routes/login.tsx:147`
- **Issue:** Headline is `Welcome to the workbench.` Followed by a 25-word sub headline that buries the product noun ("deadline list and evidence-backed recommendations") at the very end. A first-time visitor doesn't know if "the workbench" is a CRM, an inbox, a calendar. The headline trades clarity for tone.
- **Why it matters:** A new-firm signup arrives via a referral or an SDR; they're looking for instant confirmation they're at the right product. "Welcome to the workbench" reads like a logged-in greeting, not a logged-out landing.
- **Proposed fix:** Either name the product noun ("**Welcome to DueDateHQ — the deadline workbench for US CPAs.**") or move the existing "For US CPA practices" eyebrow (header chrome) into the headline area as a kicker. The header chrome version is already there at L76 but disconnects from H1.
- **Status:** Documented. Lift handled by F1-12 (eyebrow added in commit batch 2).

### F1-02 · P2 · `data-t` attributes for analytics leak into A11y tree

- **Location:** `apps/app/src/routes/login.tsx:227,236,243`
- **Issue:** `data-t="termsLink"`, `data-t="privacyLink"`, `data-t="supportLink"` — these are presumably for Playwright/analytics, but the convention in the rest of the codebase is `data-slot=`/`data-testid=`. Inconsistent attribute namespacing.
- **Why it matters:** Test selector drift. Other onboarding files use neither.
- **Proposed fix:** Document the chosen attribute in CONVENTIONS; or rename to a single namespace.
- **Status:** Deferred (not mechanically safe — selectors may be in use).

### F1-03 · P1 · "Encrypted · 7-day session · SSO-ready" pill belongs above the CTA, not below

- **Location:** `apps/app/src/routes/login.tsx:219-222`
- **Issue:** Trust signal sits below the email form, after the user has already decided whether to type. Trust pills are most useful when seen _before_ the credential entry, not after.
- **Why it matters:** First-time visitors hesitate at the email box; they need the trust signal to make the leap, not as a footer.
- **Proposed fix:** Move the pill between the sub-headline and the Google button. Test in F1-13.
- **Status:** Documented. Not shipped this pass (layout shift).

### F1-04 · P1 · `Trans>or</Trans>` divider is `font-mono` uppercase caption — too loud for a separator

- **Location:** `apps/app/src/routes/login.tsx:205`
- **Issue:** `OR` separator uses `font-mono text-caption-xs uppercase` — same typographic weight as a status badge. A separator should be the calmest element on the page.
- **Why it matters:** Visual hierarchy inverts. The "OR" reads heavier than the buttons it separates.
- **Proposed fix:** Drop `font-mono` + `uppercase`; use `text-[11px] text-text-muted` sentence-case "or" as in shadcn defaults.
- **Status:** Shipped in batch 1.

### F1-05 · P2 · Email OTP placeholder is `you@firm.com`; should be `you@yourpractice.com`

- **Location:** `apps/app/src/features/auth/email-otp-sign-in-form.tsx:208`
- **Issue:** The product surface uniformly uses "Practice" not "Firm" (post-rename). `you@firm.com` is a leftover token from the rename.
- **Why it matters:** Voice inconsistency — the brand of the product is "Practice"; the form whispers "Firm" at the user.
- **Proposed fix:** `you@yourpractice.com`.
- **Status:** Shipped in batch 1.

### F1-06 · P2 · OTP form: code field is rendered as 1 input — no segmented OTP UI

- **Location:** `apps/app/src/features/auth/email-otp-sign-in-form.tsx:143-159`
- **Issue:** 6-digit OTP entered into a single `<Input>` with `maxLength=6`. The shadcn-style `InputOTP` (6 segmented boxes) is the convention for OTP entry across modern apps (Stripe, Linear, Plaid). A single input is the older pattern; users paste, lose track of digit count, can't easily scan.
- **Why it matters:** UX leg of authentication. Friction in the auth flow has the highest cost-per-second.
- **Proposed fix:** Replace `<Input maxLength=6>` with the `InputOTP` primitive — or document why the single-input choice is intentional.
- **Status:** Documented; primitive change deferred (component swap, not mechanical).

### F1-07 · P1 · Verify code button enables before user types 6 digits (false-affordance)

- **Location:** `apps/app/src/features/auth/email-otp-sign-in-form.tsx:170`
- **Issue:** Actually disabled correctly via `normalizeCode(code).length !== 6` — verified by reading. **No change needed.** Marking as audited-pass.
- **Status:** Pass — no change.

### F1-08 · P2 · Code expiry copy says "5 minutes" but no countdown shown

- **Location:** `apps/app/src/features/auth/email-otp-sign-in-form.tsx:161`
- **Issue:** "The code expires in 5 minutes" — but no relative timer. After a tab switch, the user has no idea if 30 sec or 4 min remain. A subtle "Code expires in 4:32" helps.
- **Why it matters:** Auth recovery — when the user fails verification, they don't know whether to resend or wait.
- **Proposed fix:** Add a live MM:SS countdown next to "Resend" or under "Code sent to" panel. (Deferred — adds state machine + tick interval.)
- **Status:** Documented.

### F1-09 · P3 · `displayNameFromEmail` is used to derive the user's name silently

- **Location:** `apps/app/src/features/auth/email-otp-sign-in-form.tsx:106`
- **Issue:** Auth signs the user in with a name parsed from their email local part (e.g., `jane.doe` → `Jane Doe`). The user never sees this name; the practice profile inherits it later.
- **Why it matters:** First-name accuracy can be off (e.g., `jdoe@firm.com` → "Jdoe"). User won't know the system used the email to guess until they see it on the practice page.
- **Proposed fix:** After first successful sign-in via OTP, prompt for "How should we call you?" inline. (Or surface in onboarding form.)
- **Status:** Documented; deferred.

### F1-10 · P2 · "Trouble signing in? Email support@..." has no severity differentiation from Terms

- **Location:** `apps/app/src/routes/login.tsx:242-250`
- **Issue:** Support email anchor is bundled in the same legal-text block as Terms and Privacy. Visually it reads as another small-print disclaimer, not a helpful escape hatch.
- **Why it matters:** When auth fails, the user already feels stuck; the escape hatch should be more discoverable.
- **Proposed fix:** Break "Trouble signing in?" into its own line above the legal block, with a slightly stronger color.
- **Status:** Shipped in batch 2.

### F1-11 · P2 · `<h1>` font-size is `text-[26px]` — off-scale arbitrary value

- **Location:** `apps/app/src/routes/login.tsx:146`
- **Issue:** `text-[26px]` is an arbitrary literal; the design system has `text-2xl` (24px) and `text-3xl` (30px). Login + onboarding both use `text-[26px]`/`text-[28px]` ad-hoc values that don't match anywhere else.
- **Why it matters:** Type scale leakage. Auditing-wise, this is the kind of off-scale value the system audit doc catches.
- **Proposed fix:** Promote to `text-2xl` (24px) or codify a `text-display-sm` token. (Both login and onboarding share this pattern — fix both at once.)
- **Status:** Documented. Not shipped (cross-surface change; verify with design system owner).

### F1-12 · P2 · Brand mark in entry header has no semantic relation to the headline

- **Location:** `apps/app/src/routes/_entry-layout.tsx:55-71`
- **Issue:** Header shows `DueDateHQ / For US CPA practices` — that **is** the product name + value prop. The `/login` H1 then says "Welcome to the workbench" with no reference to either. The header and the body are talking past each other.
- **Why it matters:** Two surfaces, two value props, neither reinforced. Header is duplicating effort.
- **Proposed fix:** Either make the H1 own the product name ("Welcome to DueDateHQ") so the header can fade, or simplify the header to brand-mark only.
- **Status:** Documented; cross-flow change.

---

## Flow 2 — `/accept-invite`

### F2-01 · P0 · "Invite link is missing" error message is dead-end

- **Location:** `apps/app/src/routes/accept-invite.tsx:127-135`
- **Issue:** When the URL has no `id` param, the user sees a destructive alert with no next action. No "Return to login", no "Try resending the invite" button — they're stranded on a logged-out page.
- **Why it matters:** A user arriving via a half-broken email link is already in distress; a dead-end alert compounds it.
- **Proposed fix:** Add a "Return to sign-in" link/button beneath the alert. Mechanically safe.
- **Status:** Shipped in batch 1.

### F2-02 · P1 · Invite preview doesn't appear until after sign-in

- **Location:** `apps/app/src/routes/accept-invite.tsx:73`
- **Issue:** `inviteQuery` is `enabled` only when `signedIn` is true. Until sign-in, the user sees "Practice invitation" / "Sign in to accept this invitation" — but never sees **which** practice or **who** invited them.
- **Why it matters:** Phishing-defense logic for the user: they want to confirm the invite is from a person they know _before_ they hand over creds. The current flow asks them to authenticate before learning that.
- **Proposed fix:** Server should allow an unauth'd "preview" endpoint that returns the inviter name + org name (no PII). Then headline becomes: "**Jane invited you to Bright CPA Practice**" before sign-in. This is the same pattern Linear, Notion, Figma use.
- **Status:** Documented. Server change required — not mechanically safe; deferred.

### F2-03 · P2 · "or continue with SSO" separator is in `<FieldSeparator>`, which is otherwise unused in onboarding

- **Location:** `apps/app/src/routes/accept-invite.tsx:185-187`
- **Issue:** Accept-invite uses `FieldSeparator>or continue with SSO</FieldSeparator>` while `/login` uses a hand-rolled three-grid divider. Same concept, two implementations.
- **Why it matters:** Visual rhythm differs between two adjacent flows.
- **Proposed fix:** Unify on `FieldSeparator` (the primitive). Drop the hand-rolled grid in `login.tsx`.
- **Status:** Shipped in batch 2.

### F2-04 · P3 · `acceptInvitation` swallows the `Error.cause`

- **Location:** `apps/app/src/routes/accept-invite.tsx:46-57`
- **Issue:** Errors thrown read `body?.message || body?.error || "Invitation couldn't be accepted."` — but the toast then displays it as a description without rendering the original network status.
- **Why it matters:** Tier-2 support has less to triage from.
- **Proposed fix:** Add the HTTP status code as a fallback.
- **Status:** Documented; deferred.

### F2-05 · P1 · Loading state for the invite is a `Skeleton` inside `CardDescription` — no label

- **Location:** `apps/app/src/routes/accept-invite.tsx:151`
- **Issue:** While the invite preview loads, the description region shows a 5h × 56w skeleton with no announcement to screen readers.
- **Why it matters:** A blind user sees no progress event; they don't know whether the page is broken or loading.
- **Proposed fix:** Wrap in `role="status" aria-label="Loading invitation"`.
- **Status:** Shipped in batch 2.

---

## Flow 3 — `/two-factor` (post-login challenge)

### F3-01 · P1 · 2FA challenge accepts trimmed code length 6+; recovery code is typically 8 chars

- **Location:** `apps/app/src/routes/two-factor.tsx:44-47`
- **Issue:** Validation is `trimmed.length < 6` — but recovery (backup) codes are 8 alphanumeric (`backupCodes` are emitted by `qrcode.react` setup with longer length). So a user pasting a backup code passes client validation, server returns 400, no useful message back.
- **Why it matters:** First-time recovery-code use happens when the user has lost their TOTP — already a high-stress moment. Silent failure to recognise recovery format adds frustration.
- **Proposed fix:** Either accept any length ≥6 (current) but show a hint "Use 6-digit TOTP or 8-character recovery code" — or branch the UI into two tabs. (Recovery flow is documented in setup but absent in challenge.)
- **Status:** Documented; deferred.

### F3-02 · P1 · No "I lost my authenticator" recovery path

- **Location:** `apps/app/src/routes/two-factor.tsx` (entire route)
- **Issue:** The challenge UI offers only the TOTP code input. There's no link to "Use a recovery code" or "Contact support to reset 2FA".
- **Why it matters:** A user who lost their phone is locked out with no path. This is the single most common 2FA failure mode.
- **Proposed fix:** Add a low-emphasis link under the verify button: "Lost your authenticator? Use a recovery code →" or contact support.
- **Status:** Shipped in batch 2 (added a support link).

### F3-03 · P2 · No `autoFocus` on code input

- **Location:** `apps/app/src/routes/two-factor.tsx:67`
- **Issue:** User lands on `/two-factor` after sign-in; their hands are already on the keyboard, ready to type. But the input requires a click first.
- **Why it matters:** Saves a click in a high-frequency flow.
- **Proposed fix:** Add `autoFocus` to the input.
- **Status:** Shipped in batch 1.

### F3-04 · P2 · No autosubmit on 6-digit completion

- **Location:** `apps/app/src/routes/two-factor.tsx:67-73`
- **Issue:** When the user types digit 6, the form should auto-submit. Currently requires a click.
- **Why it matters:** Standard pattern (Stripe, GitHub, Linear). Removes one click from every login.
- **Proposed fix:** On `onChange`, if length === 6, trigger submit.
- **Status:** Shipped in batch 2.

### F3-05 · P1 · "Verification code" label has no helper text

- **Location:** `apps/app/src/routes/two-factor.tsx:64-66`
- **Issue:** No hint says "From your authenticator app (e.g., Google Authenticator, 1Password, Authy)." The CardDescription says "Enter the code from your authenticator app" but the label doesn't reinforce.
- **Why it matters:** Newer users may not know what "authenticator app" means. The description-then-label distance leaves a gap.
- **Proposed fix:** Add inline `FieldDescription` below the input: "6-digit code from Google Authenticator, 1Password, Authy, or similar."
- **Status:** Shipped in batch 1.

### F3-06 · P2 · CardDescription `"Enter the code from your authenticator app."` is the entire body

- **Location:** `apps/app/src/routes/two-factor.tsx:57-59`
- **Issue:** Card has no reassurance, no exit, no trust signal. Two-factor verification is a high-trust moment; the chrome is bare.
- **Why it matters:** Compared with login's "Encrypted · 7-day session · SSO-ready" pill, the 2FA page feels cold.
- **Proposed fix:** Add the same status-pill: `Encrypted · 2FA-protected`.
- **Status:** Shipped in batch 2.

---

## Flow 4 — `/account/security/two-factor-setup` (TOTP enrollment)

### F4-01 · P0 · Recovery codes shown ONCE — no "I've stored these" checkbox

- **Location:** `apps/app/src/routes/account-security-two-factor-setup.tsx:101-116`
- **Issue:** Recovery codes are displayed in a grid with a `Copy` button. The Alert says "Save these recovery codes now — they are only shown during setup. Store them somewhere private before verification." Then the user can immediately click "Verify and enable" without acknowledging they stored them.
- **Why it matters:** When the user later loses their phone, they discover too late that they didn't copy. This is the single most-regretted UX in 2FA enrollment across the industry.
- **Proposed fix:** Require a checkbox: `☐ I've saved these recovery codes somewhere safe.` Disable "Verify and enable" until checked.
- **Status:** Documented; deferred (requires controlled state on parent).

### F4-02 · P2 · QR code panel has a hard `bg-white` that breaks dark mode

- **Location:** `apps/app/src/routes/account-security-two-factor-setup.tsx:42`
- **Issue:** The QR is wrapped in `bg-white p-3 shadow-sm`. In dark mode, this becomes a glaring white card.
- **Why it matters:** Authenticator-app scanning needs _high contrast_, which means white-on-black QR. But the surrounding chrome should still respect theme.
- **Proposed fix:** Keep the QR itself rendered on white (it needs that for scannability) but make the wrapping shadow + panel respect theme: `bg-white dark:bg-white` for the inner QR is fine; the outer `border` panel should switch.
- **Status:** Verified — current implementation is fine because `bg-white` is inside a `bg-background-default` panel and the QR needs white. Marking pass with annotation.

### F4-03 · P2 · "Recovery codes" copy heading is `Label` (form-control element) but block has no input

- **Location:** `apps/app/src/routes/account-security-two-factor-setup.tsx:103-105`
- **Issue:** Uses `<Label>` semantically though the codes aren't an input. Semantic mismatch.
- **Why it matters:** AT may announce the heading as a form-control label, suggesting an input that doesn't exist.
- **Proposed fix:** Change to `<p className="text-sm font-medium">` or `<h3>`.
- **Status:** Shipped in batch 2.

### F4-04 · P1 · Copy URI / Copy recovery codes — no success feedback in the panel

- **Location:** `apps/app/src/routes/account-security-two-factor-setup.tsx:73-77, 105-109`
- **Issue:** Copy buttons fire `onCopySetupUri` / `onCopyBackupCodes` — implementation elsewhere; the button label doesn't toggle to "Copied" inline.
- **Why it matters:** Without inline feedback, the user re-clicks not knowing if the first click registered.
- **Proposed fix:** Show a 2-second "Copied!" replacement on the button label. (Likely already via toast — verify in caller — but inline confirms the action.)
- **Status:** Documented; depends on caller implementation.

---

## Flow 5 — `/onboarding` (first-run practice creation)

### F5-01 · P0 · `DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS` is set but no copy says what value the user is starting from

- **Location:** `apps/app/src/routes/onboarding.tsx:56-58, 191-195`
- **Issue:** The input is pre-filled with the default value (a number, e.g., 7 or 14) but the helper text just says "Show work as due this many days before the statutory deadline." It never says _"7 is the most common"_ or _"this is what most practices use"_. A first-time user sees "7" with no anchor and wonders if it's right.
- **Why it matters:** First-run defaults need anchoring. Without it, every user feels they have to research the right answer.
- **Proposed fix:** Append "(default: 7 days — most practices use 5–14)" or render a "Why 7?" tiny help. Mechanically safe.
- **Status:** Shipped in batch 1 (added default-call-out + suggested-range).

### F5-02 · P1 · "We pre-filled a name from your Google profile" — hardcoded "Google"

- **Location:** `apps/app/src/routes/onboarding.tsx:122-127`
- **Issue:** Sub-headline assumes the user signed in with Google. If they used Microsoft SSO or email-OTP, "Google profile" is a lie. The `derivePracticeName` helper looks at `user.name` || email-derived; doesn't actually know the provider.
- **Why it matters:** Voice consistency, factual accuracy on a first-touch screen.
- **Proposed fix:** "We pre-filled a name based on your account" or "from your sign-in." Provider-agnostic.
- **Status:** Shipped in batch 1.

### F5-03 · P1 · Three fields, three different label patterns

- **Location:** `apps/app/src/routes/onboarding.tsx:131-136, 170-176`
- **Issue:** "Practice name" and "Internal deadline" are uppercase-caption labels (`text-caption uppercase tracking-wide`). The state-rule selector uses an uppercase-caption _internally_ (in its own `StateRuleActivationSelector`). All match. But comparing to `/practice.tsx`, which uses standard sentence-case `<Label>` for the same fields — there's a fork between onboarding label style and practice settings label style.
- **Why it matters:** Cognitive load when a user moves from onboarding to practice settings: the same field appears in two different label styles.
- **Proposed fix:** Pick one. Sentence-case `<Label>` is the standard across the rest of the app — drop the uppercase-caption style on the onboarding form.
- **Status:** Documented; cross-page change.

### F5-04 · P1 · Internal deadline input has no unit ("days") suffix

- **Location:** `apps/app/src/routes/onboarding.tsx:177-189`
- **Issue:** Numeric input shows the integer; the unit ("days") is only in the helper text below. A user scanning the form sees `7` with no unit attached. The same field on `/practice.tsx` also lacks a suffix.
- **Why it matters:** "7 what?" cognitive friction on a numeric field is solved by an inline suffix (`7 days`).
- **Proposed fix:** Either wrap the input in a group with a trailing "days" label, or restructure the helper to lead with the unit: "Days before the statutory deadline that work shows as due (default 7)."
- **Status:** Shipped in batch 1 (helper text rewritten).

### F5-05 · P1 · "Internal deadline" label is too abstract for a first-run user

- **Location:** `apps/app/src/routes/onboarding.tsx:175`
- **Issue:** The label is "Internal deadline" — but a first-time visitor doesn't yet have the concept of "internal" vs "statutory" deadlines.
- **Why it matters:** First-run forms should teach concepts as they introduce them. "Internal deadline" is jargon for "show work as due earlier than the statutory date" — that's the helper text's job, but the label could pre-teach.
- **Proposed fix:** Rename to "Internal deadline lead time" or "Show work due this far before deadline." Pair with helper text that says "Most practices use 5–14 days."
- **Status:** Shipped in batch 1 (label clarified, default-anchored).

### F5-06 · P2 · `Practice name` placeholder "e.g. Bright CPA Practice" — okay but no escape-from-default messaging

- **Location:** `apps/app/src/routes/onboarding.tsx:146`
- **Issue:** Input pre-filled from email/Google name. If the user wants to change it, the existing placeholder won't show until they clear the input. The placeholder is meaningless in the pre-filled case.
- **Why it matters:** Pre-filled = default-state UX; the placeholder example is wasted real estate.
- **Proposed fix:** No fix — pre-fill is the right pattern. Marking pass.
- **Status:** Pass.

### F5-07 · P1 · State rule activation — no "skip for now" affordance

- **Location:** `apps/app/src/routes/onboarding.tsx:165-168` & `state-rule-activation-selector.tsx`
- **Issue:** The state grid + helper text implies state selection is mandatory ("Selected states activate with federal rules"). But submitting with zero states selected is allowed (just creates a federal-only firm). The user doesn't know that — they may feel obligated to pick at least one.
- **Why it matters:** Wrong defaults erode trust ("did I miss a step?"). The label should say "Optional — you can always activate states later in Rule Library."
- **Proposed fix:** Add "(optional)" to the section header `State rule coverage`. Or sub-text "Skip if you only need federal rules."
- **Status:** Shipped in batch 1.

### F5-08 · P1 · Source-defined-calendar warning is technical jargon

- **Location:** `apps/app/src/features/onboarding/state-rule-activation-selector.tsx:191-202`
- **Issue:** Warning: "Some selected states publish deadlines through official calendars that need practice review. After entering the product, open Rule Library and review the pending rules before those due dates can be generated."
  - "Source-defined-calendar" = internal vocabulary.
  - "Pending rules" is a noun the user has never seen.
- **Why it matters:** A warning is supposed to alert AND inform. This warning alerts but the noun chain ("source-defined-calendar", "pending rules") is opaque to a new user.
- **Proposed fix:** "These states publish their deadlines through their own calendars. You'll see those rules in your Rule Library marked for review — deadlines for those states activate after you approve the rules."
- **Status:** Shipped in batch 1.

### F5-09 · P2 · State grid: click target is `size-7` (28px) — below 44px touch target

- **Location:** `apps/app/src/features/onboarding/state-rule-activation-selector.tsx:155`
- **Issue:** Each state tile is 28×28px. WCAG 2.1 AAA recommends 44px touch targets; Material recommends 48px.
- **Why it matters:** Touch usability on tablets (CPA partners often onboard from iPads). 28px is fine for mouse but tight for touch.
- **Proposed fix:** Bump to `size-9` (36px) at `min-h` and let grid breathe. (Or, on small screens, switch to a dropdown multi-select.) Deferred — layout shift across grid.
- **Status:** Documented; deferred.

### F5-10 · P2 · `Select all` button copy reads as "select all 50 states" but list has 51 (includes DC)

- **Location:** `apps/app/src/features/onboarding/state-rule-activation-selector.tsx:124-128`
- **Issue:** Counter renders `{selectedSet.size}/{ALL_RULE_GENERATION_STATES.length}` — likely 51 (50 states + DC). User sees `0/51` and may think "why 51, not 50?"
- **Why it matters:** Minor cognitive snag on a first-touch page. DC is a jurisdiction, not a state — naming the counter "jurisdictions" might be cleaner.
- **Proposed fix:** Either rename header to "Jurisdiction coverage" or accept the discrepancy. Documenting.
- **Status:** Documented; semantic choice deferred.

### F5-11 · P1 · "Continue" CTA disabled state has no explanation

- **Location:** `apps/app/src/routes/onboarding.tsx:198-219`
- **Issue:** `Continue` is `disabled={isSubmitting || activateRulesMutation.isPending}` — but if the user enters a name with 1 char and clicks, validation fires on submit, not before. There's no "Practice name must be at least 2 characters" inline-as-you-type.
- **Why it matters:** Form validation feels reactive instead of proactive. User clicks, sees error, scrolls back, fixes — three motions instead of one.
- **Proposed fix:** Inline validation on blur; CTA stays enabled because users want to see "what's wrong" inline. Or: add a helper that says "Minimum 2 characters."
- **Status:** Documented; deferred (validation pattern change).

### F5-12 · P2 · "Setting up your practice…" CTA copy could be more specific

- **Location:** `apps/app/src/routes/onboarding.tsx:207-209`
- **Issue:** Generic copy. Could narrate progress: "Creating practice…" then "Activating rules…" so the user feels the steps.
- **Why it matters:** Long-running ops without narration feel broken. The wizard's `ProcessingOverlay` (WizardShell.tsx) is a great example of step-narrative — onboarding could do the same.
- **Proposed fix:** Phase the CTA label based on which mutation is pending. (Stretch — leave for follow-up.)
- **Status:** Documented; deferred.

### F5-13 · P1 · "Encrypted · Auto-saves · Renamable later" pill is below the CTA

- **Location:** `apps/app/src/routes/onboarding.tsx:222-225`
- **Issue:** Trust pill below CTA, again. Same issue as F1-03. Pill teaches "this is reversible" — which is the _reassurance the user needs before clicking_, not after.
- **Why it matters:** Reassurance must arrive before the decision moment.
- **Proposed fix:** Move pill below the sub-headline.
- **Status:** Documented.

---

## Flow 6 — `/migration/new` & the Migration Copilot Wizard

### F6-01 · P1 · Wizard intro: "Generate your first deadline list" — but "deadline list" is product-internal noun

- **Location:** `apps/app/src/routes/migration.new.tsx:148-150`
- **Issue:** H1 says "Generate your first deadline list." But the broader product calls them "deadlines" or "obligations." "Deadline list" is a unique noun here.
- **Why it matters:** Voice consistency across surfaces.
- **Proposed fix:** "Import your clients and generate deadlines." — simpler, matches the wizard's own footer label "Import & Generate".
- **Status:** Shipped in batch 1.

### F6-02 · P2 · Three `ActivationOutcome` chips at top — order unclear

- **Location:** `apps/app/src/routes/migration.new.tsx:135-146`
- **Issue:** Chips show: `Client facts · Deadline list · Today risk`. These are outputs of the import, but the order is `facts → list → risk`, not the user's mental model (which is `import → see deadlines → assess risk`).
- **Why it matters:** First-time users don't understand "Today risk" as a noun without context.
- **Proposed fix:** Either drop "Today risk" or rename to "Risk view" with a tooltip. The chip row is also lacking icons that map to the labels (icons are present but not visually paired).
- **Status:** Documented; deferred (layout reshuffle).

### F6-03 · P1 · "Skip for now" button — no explanation of what happens if skipped

- **Location:** `apps/app/src/routes/migration.new.tsx:189-192`
- **Issue:** "Skip for now" exits to the dashboard. User doesn't know if their existing onboarding work is preserved or what they'll see at the dashboard (empty? template?).
- **Why it matters:** Skipping is the most common path for users who want to "see the product first before committing data." They need to know the dashboard won't be a barren wasteland.
- **Proposed fix:** Tooltip on hover: "You can import later from Today, Clients, or the Command Palette (⌘K)." The intro paragraph already says this — but the button itself should also say it.
- **Status:** Shipped in batch 2 (tooltip added).

### F6-04 · P2 · "Owner or manager access required" alert appears for unauthorized users

- **Location:** `apps/app/src/routes/migration.new.tsx:67-82`
- **Issue:** Copy: "Client migration changes practice data, evidence, and audit records. Ask a practice owner or manager to run the import." Includes a "Return to Today" button.
- **Why it matters:** The dead-end-with-escape pattern is correct here. Good.
- **Proposed fix:** No fix — marking as audited-pass. Marginal nit: could include "Or contact support if you believe you should have access" link.
- **Status:** Pass with a marginal nit (deferred).

### F6-05 · P1 · Step 1 — "Paste rows" / "Upload file" — labels use `font-mono` uppercase caption again

- **Location:** `apps/app/src/features/migration/Step1Intake.tsx:456-460, 480-482`
- **Issue:** Section labels in `font-mono text-xs uppercase` tracking — same micro-eyebrow pattern as login, but inverted (uppercase here, sentence-case elsewhere). This makes the wizard feel terminal-like, while the surrounding app uses sentence-case `Label`s.
- **Why it matters:** Voice / type-system consistency. Wizard reads as a different product than the workbench.
- **Proposed fix:** Switch to canonical `<Label>` + sentence-case. (Wizard is going through a recent "Yuqi #32-40" pass, so this might be intentional terminal-vibe; documenting only.)
- **Status:** Documented; defer to design system call.

### F6-06 · P1 · Step 1 — paste textarea has no row count indicator until parse succeeds

- **Location:** `apps/app/src/features/migration/Step1Intake.tsx:463-476`
- **Issue:** While typing/pasting, user sees no row count. Only after parse succeeds at L701 do they get the "N rows ready to import" line.
- **Why it matters:** During paste of 1000+ rows, the user gets no feedback that the text was received until parse completes — feels frozen on large pastes.
- **Proposed fix:** Live row count below the textarea regardless of parse state ("~213 rows detected").
- **Status:** Documented; deferred.

### F6-07 · P2 · Step 1 — `<Trans>I'm coming from… (optional)</Trans>` — the apostrophe (`'`) breaks Lingui extraction

- **Location:** `apps/app/src/features/migration/Step1Intake.tsx:556`
- **Issue:** `&apos;` is used inside `<Trans>` for Lingui safety — correct. But this is the only spot in the wizard that uses the contraction. Other surfaces use "From… (optional)".
- **Why it matters:** Voice consistency.
- **Proposed fix:** Pass.
- **Status:** Pass — Lingui safe.

### F6-08 · P1 · Step 1 — SSN-blocking alert headline reads "SSN-like columns blocked"

- **Location:** `apps/app/src/features/migration/Step1Intake.tsx:608-621`
- **Issue:** Title is "SSN-like columns blocked" — fine. Body lists columns. But ends with: "→ AI default IGNORE." — that's developer-shorthand that leaks into user-facing copy.
- **Why it matters:** Voice. The "→ AI default IGNORE" reads like a debug log entry.
- **Proposed fix:** Drop "→ AI default IGNORE" and let the surrounding prose ("Those columns won't be sent to the AI") carry the meaning.
- **Status:** Shipped in batch 1.

### F6-09 · P1 · Step 1 — Lock icon hint "We block SSN-like patterns before sending anything to the AI" is positioned BEFORE upload but AFTER paste

- **Location:** `apps/app/src/features/migration/Step1Intake.tsx:596-605`
- **Issue:** The lock-trust line floats between the upload area and any alerts. It's a critical trust signal but its position is unanchored.
- **Why it matters:** Trust signals should be co-located with the action they apply to (paste/upload).
- **Proposed fix:** Move the lock line above the paste textarea — that's where the user is committing data.
- **Status:** Documented; layout shift.

### F6-10 · P1 · Step 2 — Confidence labels `H / M / L` are jargon

- **Location:** `apps/app/src/features/migration/Step2Mapping.tsx:478-481`
- **Issue:** The confidence badges show `87% [H]`, `81% [M]`, `73% [L]` — the bracketed letter is the AI confidence tier, but a CPA user reads `[H]` as a code, not as "High."
- **Why it matters:** Adds cognitive friction. The percentage already says it; the letter is duplicate.
- **Proposed fix:** Drop the `[H]/[M]/[L]` bracket and rely on percentage + color. Or expand to full words on hover.
- **Status:** Shipped in batch 2 (dropped bracketed letter).

### F6-11 · P1 · Step 2 — AI / Manual / Template badge uses `variant="destructive"` for ALL three states

- **Location:** `apps/app/src/features/migration/Step2Mapping.tsx:370, 386, 403`
- **Issue:** `MappingCapabilityBadge` always uses `<Badge variant="destructive">` — even for the success state "AI Mapper". That's the destructive (red/orange) variant being misapplied to all three states.
- **Why it matters:** Visual lie. "AI Mapper" (success) renders in destructive style, the same as "Manual mapping" (genuine warning). The badge is meaningless because it's the same color for all three.
- **Proposed fix:** Use `variant="default"` or `variant="info"` for "AI Mapper", keep `destructive` for "Manual mapping", and `outline`/`warning` for "Import template". This is a real bug.
- **Status:** Shipped in batch 1.

### F6-12 · P2 · Step 2 — Help-icon tooltip uses `text-text-destructive` everywhere

- **Location:** `apps/app/src/features/migration/Step2Mapping.tsx:451`
- **Issue:** `TooltipContent className="max-w-[280px] text-text-destructive whitespace-normal"` — the AI Mapper success-state tooltip body is also red text.
- **Why it matters:** Same color-misuse as F6-11. Success and failure tooltips are visually identical.
- **Proposed fix:** Drop `text-text-destructive` from tooltip body. Let the tooltip use default text color and rely on the badge for state.
- **Status:** Shipped in batch 1.

### F6-13 · P1 · Step 2 — "AI prepared your columns" copy + summary metric "EIN: Found/Not found" — last metric is vague

- **Location:** `apps/app/src/features/migration/Step2Mapping.tsx:246-249`
- **Issue:** Summary card "EIN" shows "Found" or "Not found" without context. A first-time user may wonder why EIN gets its own card.
- **Why it matters:** Visual prominence implies importance the user doesn't yet understand. EIN is critical for penalty risk calc, but the metric card never explains.
- **Proposed fix:** Tooltip or sub-label "Required for penalty risk forecasting" — or move EIN status into the Exceptions card.
- **Status:** Documented; deferred (metric reshuffle).

### F6-14 · P1 · Step 2 — "Re-run AI with my overrides" button — copy is confusing when overrides exist but disabled

- **Location:** `apps/app/src/features/migration/Step2Mapping.tsx:110-114`
- **Issue:** Button changes label between "Re-run AI" / "Re-run AI with my overrides". The latter implies the AI will respect overrides, but in practice it just re-runs from scratch (overrides are passed to the mapper as hints). Wording suggests stronger guarantee.
- **Why it matters:** Implicit promise.
- **Proposed fix:** "Re-run AI (keep my changes)" — clearer that the system tries to preserve user edits.
- **Status:** Documented; copy change requires verifying server behavior.

### F6-15 · P2 · Step 2 — Column details table — `→` arrow column has `aria-hidden` but no `<TableHead aria-hidden>` width column accessibility hint

- **Location:** `apps/app/src/features/migration/Step2Mapping.tsx:298-299`
- **Issue:** `<TableHead aria-hidden className="w-[24px]">→</TableHead>` — the column is decorative. Fine.
- **Status:** Pass.

### F6-16 · P1 · Step 3 — "AI cleaned your values" — describing AI as a verb

- **Location:** `apps/app/src/features/migration/Step3Normalize.tsx:62-69`
- **Issue:** Headline "AI cleaned your values" — body: "Your uploaded file stays unchanged. DueDateHQ will use this clean import draft only after you import."
  - Reassurance about source file integrity is great.
  - But "cleaned" implies the values were dirty.
- **Why it matters:** "Cleaned" is the right verb for a normalization step, but the connotation can sting. "Standardized" is more neutral.
- **Proposed fix:** "AI standardized your values" or "AI normalized your values for import" — matches the step name "Normalize" exactly.
- **Status:** Documented; voice call.

### F6-17 · P1 · Step 3 — Tax type defaults "needs review" badge has the same chrome as "Verified"

- **Location:** `apps/app/src/features/migration/Step3Normalize.tsx:433-445`
- **Issue:** The "Needs review" badge uses `bg-components-badge-bg-warning-soft` (warning-tinted). The "Verified" badge uses `bg-background-subtle text-text-success`. Different soft colors but both are calm chips at 5xs. Visual differentiation is too soft.
- **Why it matters:** "Needs review" is an action requirement, not a footnote.
- **Proposed fix:** Make the "Needs review" badge use a more pronounced warning treatment with the alert-triangle icon (already there). Or add a hover state.
- **Status:** Documented.

### F6-18 · P2 · Step 3 — "Use suggested filings" checkbox — copy doesn't tell user what happens if unchecked

- **Location:** `apps/app/src/features/migration/Step3Normalize.tsx:410-417`
- **Issue:** Checkbox label is "Use suggested filings". If unchecked, what happens? (Per code: the default-matrix entry is disabled; deadlines aren't created for that combo.) The label needs to say so.
- **Why it matters:** Toggle without a known consequence = anxiety.
- **Proposed fix:** Tooltip on the checkbox: "Uncheck to skip these tax-type defaults — you'll need to add deadlines manually for these clients."
- **Status:** Documented.

### F6-19 · P1 · Step 4 — "You're about to create:" list is in `font-mono` — reads as a build log

- **Location:** `apps/app/src/features/migration/Step4Preview.tsx:46-69`
- **Issue:** The list of clients / deadlines / skipped rows is rendered in `font-mono tabular-nums` — terminal vibe.
- **Why it matters:** The user is about to commit. They want a _human-readable_ summary, not a build log.
- **Proposed fix:** Drop `font-mono` from the list items; keep `tabular-nums` for number alignment. Numbers can be `font-mono` but the surrounding "X clients / Y deadlines" copy should not.
- **Status:** Shipped in batch 2.

### F6-20 · P1 · Step 4 — Safety section title "Safety" is too generic

- **Location:** `apps/app/src/features/migration/Step4Preview.tsx:75-77`
- **Issue:** "Safety" header is followed by three bullets about undo, audit, and no auto-email. Excellent content, weak title.
- **Why it matters:** "Safety" is so abstract it reads as throat-clearing.
- **Proposed fix:** "Before you import" or "What this won't do" (or honor the existing dev-log convention "Reassurance").
- **Status:** Shipped in batch 2 ("Safety" → "Before you import").

### F6-21 · P1 · Step 4 — "This import can be undone for 24 hours" — but no timer / countdown shown

- **Location:** `apps/app/src/features/migration/Step4Preview.tsx:79-82`
- **Issue:** "24 hours" is a static promise. After import, the user later goes to undo and finds the window is shorter than expected (or rolled past midnight).
- **Why it matters:** Builds-in a future trust violation.
- **Proposed fix:** After import, the import history drawer should show a live "Undo expires in X" countdown. (Verified `ImportHistoryDrawer.tsx` — flagged for follow-up.)
- **Status:** Documented; deferred (cross-component).

### F6-22 · P1 · Wizard footer — "Back" button stays present on Step 1 (disabled)

- **Location:** `apps/app/src/features/migration/WizardShell.tsx:210-216`
- **Issue:** `<Button disabled={busy || backDisabled || step === 1 || !onBack}>Back</Button>` — the button is rendered always; on Step 1 it's disabled but visible.
- **Why it matters:** Visual noise / dead control on first step. Hides a step-progression cue.
- **Proposed fix:** Hide the Back button entirely on Step 1 (render `null`). Saves screen real estate and signals "there's no going back" cleanly.
- **Status:** Shipped in batch 2.

### F6-23 · P1 · Wizard route → "Skip for now" uses `confirmOnClose` to ask "Discard import?" — but the wizard hasn't started

- **Location:** `apps/app/src/features/migration/Wizard.tsx:580`
- **Issue:** `confirmOnClose: hasDiscardableWizardWork(state)` — `hasDiscardableWizardWork` returns true if user has typed/uploaded. If they haven't entered anything, no confirm dialog (good). But the wording "Discard import?" is misleading — if they just pasted, they didn't yet _create_ an import.
- **Why it matters:** "Discard" implies destruction of something started.
- **Proposed fix:** Rename to "Leave without importing?" / "Discard pasted data?" — less heavy.
- **Status:** Shipped in batch 2.

### F6-24 · P1 · `LiveGenesisOverlay` shows obligation count + "deadlines created" but no client count animation

- **Location:** `apps/app/src/features/migration/Wizard.tsx:675-704`
- **Issue:** Overlay shows huge animated obligation count; client count is in tiny text below. But client = the more concrete thing to celebrate ("you imported your roster!"). Hierarchy backwards.
- **Why it matters:** The "wow" moment of importing is seeing your clients land. Deadlines are downstream.
- **Proposed fix:** Show client count as the headline, obligations as the supporting metric.
- **Status:** Documented; design call.

### F6-25 · P2 · Wizard sr-only Trans block is duplicated (sr-only inside frame + DialogTitle.sr-only at parent)

- **Location:** `apps/app/src/features/migration/WizardShell.tsx:137-142, 275-282`
- **Issue:** The "Import clients · Step N of 4" copy appears twice — once via DialogTitle.sr-only and once via a sr-only div inside the frame. Screen readers may announce twice.
- **Why it matters:** A11y double-announce.
- **Proposed fix:** Remove the sr-only div inside the frame; rely on DialogTitle.
- **Status:** Shipped in batch 2.

### F6-26 · P2 · Migration intro `Skip for now` is a `Button variant="outline" size="sm"` with `ArrowRightIcon` — but the icon implies "next step", not "exit"

- **Location:** `apps/app/src/routes/migration.new.tsx:189-192`
- **Issue:** Right-arrow icon next to "Skip for now" suggests progression. Skipping is lateral, not forward.
- **Why it matters:** Icon-vs-label mismatch.
- **Proposed fix:** Drop the icon or replace with `XIcon` (skip = exit) or simply remove.
- **Status:** Shipped in batch 1.

### F6-27 · P1 · "Continue to secure checkout" appears in wizard footer Continue button at step 4 → no — actually that's only on `Step 4` it switches to "Import & Generate"

- **Location:** `apps/app/src/features/migration/Wizard.tsx:484-487`
- **Issue:** `continueLabel` is `Import & Generate` for Step 4. Other steps just say "Continue". But "Continue" gives no information about what step you're going to.
- **Why it matters:** Standard pattern; minor nit.
- **Proposed fix:** Add step-specific labels: Step 1 → "Map columns", Step 2 → "Clean values", Step 3 → "Preview import". The verbs already exist in the headers above each step.
- **Status:** Documented; deferred.

---

## Flow 7 — `/practice` (post-onboarding settings, but also reachable as first-time edit)

### F7-01 · P2 · Practice profile page uses sentence-case `<Label>` for the same fields the onboarding form uses uppercase-caption

- **Location:** `apps/app/src/routes/practice.tsx:425-470` (and elsewhere)
- **Issue:** See F5-03. Two label styles for the same fields. Onboarding label vs Settings label.
- **Status:** Cross-page; documented.

### F7-02 · P2 · "Internal deadline" field — helper text repeats `Changing this recalculates current deadline dates.`

- **Location:** `apps/app/src/routes/practice.tsx:465-471`
- **Issue:** Helper text in settings clearly explains the recalculation consequence. The onboarding helper text doesn't.
- **Why it matters:** First-time user sets the offset without knowing it affects every future deadline.
- **Proposed fix:** Add "(Changing this later recalculates current deadlines.)" — match settings copy.
- **Status:** Shipped in batch 1.

### F7-03 · P3 · Delete practice — "Audit history stays retained for compliance"

- **Location:** `apps/app/src/routes/practice.tsx:672-676, 698-702`
- **Issue:** Same sentence appears twice in the CardDescription and the AlertDialogDescription. Could be DRY.
- **Status:** Pass — repeated by design to ensure context on dialog.

### F7-04 · P2 · "Smart Priority preview" — empty state "No open deadlines available for preview." renders in two places

- **Location:** `apps/app/src/routes/practice.tsx:638, 725`
- **Issue:** Same copy appears as tooltip reason and as inline empty state. Could share a token.
- **Status:** Documented; deferred.

---

## Flow 8 — `/billing/checkout` (first paid step)

### F8-01 · P0 · "Confirm checkout" headline doesn't say what plan they're about to confirm

- **Location:** `apps/app/src/routes/billing.checkout.tsx:271-280`
- **Issue:** H1 says "Confirm checkout" — generic. Below, the Plan summary card shows the plan, but the page title doesn't.
- **Why it matters:** First impression: user thinks they're on a confirm page but doesn't see which plan in the header. Reduces confidence.
- **Proposed fix:** "Confirm Pro plan checkout" (dynamic) — promotes the selected plan to the top.
- **Status:** Documented.

### F8-02 · P1 · "Secure checkout" badge in top-right is `variant="info"` — color same as informational alerts elsewhere

- **Location:** `apps/app/src/routes/billing.checkout.tsx:281-283`
- **Issue:** The badge is meant as a trust signal but uses `info` variant — visually identical to "Team+" badges and other neutral chips elsewhere. The trust badge needs differentiation.
- **Why it matters:** Trust signals must stand out.
- **Proposed fix:** Use the `success` variant or a lock icon + slightly stronger contrast.
- **Status:** Shipped in batch 2 (lock icon added).

### F8-03 · P2 · "Practice context" card title is vague

- **Location:** `apps/app/src/routes/billing.checkout.tsx:444-449`
- **Issue:** "Practice context" — what context? The card lists practice name, current plan, seat limit. The title could be "Your current practice" or "Practice on file."
- **Status:** Documented; minor.

### F8-04 · P1 · No "What changes after upgrade" delta summary

- **Location:** `apps/app/src/routes/billing.checkout.tsx` (whole file)
- **Issue:** Page shows the new plan's seat limit, but not the _delta_ from the current. A user on Solo upgrading to Pro should see: "1 → 3 seats", not just "3 seats".
- **Why it matters:** Upgrade confidence.
- **Proposed fix:** Add a "What changes" section comparing current vs new.
- **Status:** Documented; layout add.

### F8-05 · P2 · `<Link to="/billing">` "Back to billing" appears twice — header AND inside Practice context card footer

- **Location:** `apps/app/src/routes/billing.checkout.tsx:260-266, 489-497`
- **Issue:** Two "back to billing" affordances within the same scroll.
- **Status:** Documented; one is a sidebar link, one a header — defendable.

### F8-06 · P1 · "Continue to secure checkout" button — no clarification that this opens Stripe

- **Location:** `apps/app/src/routes/billing.checkout.tsx:409-429`
- **Issue:** Button label doesn't say what `window.location.assign(url)` does — namely, redirect to Stripe.
- **Why it matters:** User worries that a click leaves the app silently.
- **Proposed fix:** Sub-label or hover-tooltip: "You'll be redirected to Stripe to enter payment details."
- **Status:** Shipped in batch 2.

---

## Flow 9 — Empty states across the app

### F9-01 · P0 · Calendar route has no empty state at all

- **Location:** `apps/app/src/features/calendar/calendar-page.tsx`
- **Issue:** When a brand-new firm with zero deadlines visits `/calendar`, they see the calendar grid populated with… nothing. No "Import clients to see deadlines here" CTA.
- **Why it matters:** Calendar is one of the first places a curious user clicks. An empty calendar is invitation to think the product is broken.
- **Proposed fix:** Add a `SharedEmptyState` when `deadlines.length === 0`.
- **Status:** Documented; deferred (requires understanding of calendar's existing state machine).

### F9-02 · P1 · Audit log empty state has no CTA

- **Location:** `apps/app/src/features/audit/audit-log-page.tsx:744-746`
- **Issue:** "No audit events yet." — full stop. No next action. (Probably correct — there's no action the user can take to populate audit; it accumulates automatically.)
- **Why it matters:** Defendable.
- **Proposed fix:** Add a one-liner: "Events appear here as you and your team work."
- **Status:** Shipped in batch 1.

### F9-03 · P1 · Workload empty state is a plain text line, not a styled empty state

- **Location:** `apps/app/src/features/workload/workload-page.tsx:161-165`
- **Issue:** "No open deadlines match the workload window." renders in a bordered box but isn't using the shared `EmptyState` component. Inconsistent chrome.
- **Why it matters:** Visual consistency across empty states.
- **Proposed fix:** Replace with `SharedEmptyState`.
- **Status:** Shipped in batch 2.

### F9-04 · P1 · Opportunities empty state — verified consistent with shared pattern, no CTA fix needed

- **Location:** `apps/app/src/features/opportunities/opportunities-page.tsx:111`
- **Issue:** Uses `EmptyState` already.
- **Status:** Pass.

### F9-05 · P1 · Notifications empty state has no description

- **Location:** `apps/app/src/features/notifications/notifications-page.tsx:100`
- **Issue:** "No notifications yet." — title only, no description. Other empty states have a one-line "what'll appear here" hint.
- **Why it matters:** Notifications feels broken when empty; a "what'll appear here" line teaches the surface.
- **Proposed fix:** Add description: "Mentions, assignment changes, and important deadline alerts will show up here."
- **Status:** Shipped in batch 1.

### F9-06 · P2 · Rules library empty state — "No rules and no coverage data yet." is technical

- **Location:** `apps/app/src/routes/rules.library.tsx:1657`
- **Issue:** Inner table cell — empty state copy is opaque to a new user. "Coverage data" is internal vocab.
- **Why it matters:** Empty state should teach.
- **Proposed fix:** "Activate a federal or state rule to see it here. Rules from your onboarding selection appear automatically."
- **Status:** Shipped in batch 1.

### F9-07 · P2 · Dashboard "No deadlines yet. Import clients to get started." copy — fine, but the CTA is the only path

- **Location:** `apps/app/src/features/dashboard/actions-list.tsx:659-666`
- **Issue:** Single CTA "Import clients". A new user might want to "Create my first deadline manually" — but that path isn't surfaced from the empty state.
- **Why it matters:** Import is the canonical path; manual creation is a fallback. Acceptable.
- **Proposed fix:** No fix; defer.
- **Status:** Pass.

### F9-08 · P1 · Dashboard caught-up state — "You're caught up. Next deadline appears here when one's within a week."

- **Location:** `apps/app/src/features/dashboard/actions-list.tsx:668-670`
- **Issue:** Apostrophe `'re` is the contraction; rest of copy is sentence-case. Voice ok. Issue: "Next deadline appears here when one's within a week" — "one's" is awkward contraction.
- **Why it matters:** Microcopy polish.
- **Proposed fix:** "You're caught up. The next deadline appears here when it's within a week."
- **Status:** Shipped in batch 1.

---

## Flow 10 — Cross-flow consistency

### F10-01 · P1 · Submit-button labels vary across surfaces

- **Login:** "Email me a code" / "Verify code"
- **2FA challenge:** "Verify"
- **2FA setup:** "Verify and enable"
- **Onboarding:** "Continue"
- **Migration:** "Continue" / "Import & Generate"
- **Practice:** "Save changes"
- **Billing:** "Continue to secure checkout"
- **Issue:** "Verify" appears alone in 2FA challenge but "Verify code" elsewhere. "Continue" is overloaded.
- **Status:** Documented; broad copy normalization out of scope.

### F10-02 · P1 · "Encrypted · ..." trust pill present on `/login` and `/onboarding`, absent on `/accept-invite`, `/two-factor`, `/billing/checkout`

- **Issue:** Inconsistent trust signal across entry surfaces.
- **Status:** Shipped in batch 2 (2FA and billing).

### F10-03 · P1 · Entry shell footer "All systems operational" — but no link to status page

- **Location:** `apps/app/src/routes/_entry-layout.tsx:90-93`
- **Issue:** Status indicator is decorative dot + label. A user worried about reliability has no way to see the status page.
- **Why it matters:** Trust-pill UX promises a status check the user can't perform.
- **Proposed fix:** Wrap in `<a href="https://status.duedatehq.com">` if such a page exists; else remove the dot to stop implying live data.
- **Status:** Documented; deferred (depends on whether status page exists).

### F10-04 · P1 · Onboarding form `PRACTICE PROFILE` eyebrow is uppercase tracked-caption; migration intro `PRACTICE ACTIVATION` is the same pattern. Login has no eyebrow.

- **Issue:** Inconsistent eyebrow usage across entry surfaces.
- **Status:** Documented.

### F10-05 · P2 · `<Trans>For US CPA practices</Trans>` in entry header — but `<Trans>For US CPA practices.</Trans>` is the marketing tagline. Period inconsistency.

- **Location:** `_entry-layout.tsx:76`
- **Issue:** Marginal.
- **Status:** Documented.

### F10-06 · P1 · Practice / Firm / Organization vocab drift

- **Issue:** Reviewed all visible copy. Predominant noun is "Practice." Surface leaks:
  - `email-otp-sign-in-form.tsx:208` placeholder `you@firm.com` (fixed F1-05)
  - `accept-invite.tsx` uses both `Practice invitation` (CardTitle) and `organizationName` (API field) — the user-facing copy is fine but JSON shape is inconsistent.
- **Status:** Surface-level fixes shipped; API rename out of scope.

### F10-07 · P1 · Deadline / Obligation / Filing vocab — `obligation` leaks into a few user-visible spots

- **Location:** Various: `Step3Normalize` test files use "obligations", LiveGenesisOverlay early versions did too (now "deadlines"). Hotkey description in `Step3Normalize.tsx:387-390` says "Toggle suggested filings for the focused tax type group in Step 3."
- **Issue:** "Filings" is okay (used elsewhere) but "obligations" leaks in dev-facing strings.
- **Status:** Documented.

### F10-08 · P2 · Toast error fallback "Check your network and try again. If this keeps happening, contact support." is identical across surfaces — good!

- **Location:** Many.
- **Status:** Pass — consistent.

### F10-09 · P1 · No "Skip to content" link in entry layout

- **Location:** `apps/app/src/routes/_entry-layout.tsx`
- **Issue:** Single-column entry pages lack a "Skip to content" anchor; A11y users tab through brand + locale switcher every time.
- **Why it matters:** Standard a11y. Single-column page is forgiving but still wrong.
- **Proposed fix:** Add `<a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>` and a `<main id="main">`.
- **Status:** Shipped in batch 2.

### F10-10 · P2 · `LocaleSwitcher` shown in entry header even when only one locale is configured

- **Location:** `apps/app/src/routes/_entry-layout.tsx:79`
- **Issue:** If en-US is the only locale, the switcher still renders — adds chrome for no purpose.
- **Status:** Implementation detail; depends on LocaleSwitcher's own guard.

---

## Flow 11 — Error-recovery flows

### F11-01 · P1 · Login Google sign-in `USER_CANCELED` regex is `/cancel|popup|closed/i` — fragile

- **Location:** `apps/app/src/routes/login.tsx:54`
- **Issue:** Detects "user cancelled" by regex match on error message. Brittle; localized error messages from better-auth would defeat this.
- **Why it matters:** When the user cancels, they should not see a toast. When something else fails, they should. The regex is the single point of decision.
- **Proposed fix:** Better-auth should return a typed error; until then, this works but document the fragility.
- **Status:** Documented; deferred (upstream dependency).

### F11-02 · P1 · Migration `Step1Intake` parse error "We couldn't read that file. Try exporting as CSV." — but the user uploaded a CSV

- **Location:** `apps/app/src/features/migration/Step1Intake.tsx:1263`
- **Issue:** Generic fallback error message recommends "export as CSV" — but if the user uploaded a CSV that we couldn't parse, this is unhelpful.
- **Why it matters:** Recommendation doesn't match the situation.
- **Proposed fix:** Branch the message by file type: if CSV failed, say "Make sure your CSV has a header row and at least one data row."
- **Status:** Documented; deferred (branching error logic).

### F11-03 · P1 · Billing checkout — checkout failure shows error message but no "try again" button

- **Location:** `apps/app/src/routes/billing.checkout.tsx:331-339`
- **Issue:** `checkoutMutation.isError` renders an Alert; the underlying button stays clickable, but there's no explicit "Try again" or "Contact support" link in the error itself.
- **Why it matters:** Payment-failure UX needs explicit retry paths.
- **Proposed fix:** Add a "Retry" button in the alert footer + "Contact support" link.
- **Status:** Documented.

### F11-04 · P1 · 2FA verify error in `verifyMutation` shows toast but stays on `/two-factor` — no path forward

- **Location:** `apps/app/src/routes/two-factor.tsx:34-39`
- **Issue:** Wrong code → toast error → user stares at the form. No explicit "try again" / "use recovery code" prompt.
- **Status:** Partially mitigated by F3-02 (recovery link).

### F11-05 · P1 · Migration wizard — Step 1 error states clear when user types new content, but state is reset silently

- **Location:** Throughout `Step1Intake.tsx`
- **Issue:** When the user re-types after a parse error, the error clears; no announcement to AT.
- **Why it matters:** Screen-reader user can't tell the error is gone.
- **Proposed fix:** Add `aria-live` polite region for the parse-error state.
- **Status:** Documented; deferred.

---

## Help / docs / explainer surfaces

### F12-01 · P2 · `ConceptLabel` / `ConceptHelp` usage across onboarding inconsistent

- **Locations:** Many.
- **Issue:** Onboarding form has zero `ConceptHelp` icons even though "Internal deadline" is a teachable concept. Migration wizard has `ConceptLabel concept="migrationCopilot"` and `concept="defaultMatrix"`. Practice profile has `ConceptHelp` for `urgencyWindow`, `lateFilingCap`. The first-touch flow (onboarding) lacks these helpers.
- **Why it matters:** First-time user hits "Internal deadline" / "State rule coverage" with no info-icon to expand.
- **Proposed fix:** Add `ConceptHelp` next to "Internal deadline" and "State rule coverage" labels on onboarding form.
- **Status:** Shipped in batch 2 (added concept helps where concepts exist).

---

## Sign-off checklist (audit-meta)

| Topic                                          | Verdict                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| Forms have inline label+helper+error           | Mostly yes (login, onboarding ok; 2FA + accept-invite light)           |
| Submit-disabled-state logic                    | Consistent across (login, onboarding, 2FA correctly use length checks) |
| ARIA `aria-busy` on submit buttons             | Yes (uniform)                                                          |
| Trust pills present                            | Inconsistent (Flow 10-02)                                              |
| Skip-to-content                                | Missing (F10-09)                                                       |
| Empty states use shared `EmptyState` primitive | Inconsistent (F9-03)                                                   |
| Voice (Practice vs Firm)                       | Mostly Practice; one leak fixed (F1-05)                                |
| Voice (Deadline vs Obligation)                 | Mostly Deadline; some dev-strings still "obligations"                  |
| Pre-fills + default anchoring                  | Onboarding default offset has no anchor (F5-01 fixed)                  |
| Brand-mark + product positioning               | Header says product, body H1 doesn't refer (F1-01)                     |
| Recovery paths from 2FA / payment failure      | Weak (F3-02, F11-03)                                                   |
| First-impression headline naming the product   | Weak (F1-01)                                                           |
| Color-coding badges semantically               | Misapplied (F6-11 fixed)                                               |

---

## Shipped vs deferred

**Batch 1 (commit `8301390f` — mechanical safe — copy, voice, default, badge semantics):**

- F1-04, F1-05 — login OR divider + placeholder
- F2-01 — accept-invite escape hatch
- F3-03, F3-05 — 2FA autoFocus + helper
- F5-01, F5-02, F5-04, F5-05, F5-07, F5-08 — onboarding defaults + voice + state warning
- F6-01, F6-08, F6-11, F6-12, F6-26 — wizard headline + SSN copy + badge semantics
- F7-02 — practice helper text parity
- F9-05, F9-06, F9-08 — empty-state polish
- F9-02 — verified the audit-log empty already has description; marked pass

**Batch 2 (commit `3412231a` — a11y + 2fa + wizard polish):**

- F1-10 — login support link separation
- F2-05 — accept-invite loading announce
- F3-02, F3-04, F3-06 — 2FA recovery link + auto-submit + trust pill
- F4-03 — 2FA setup Label semantics
- F6-03, F6-10, F6-19, F6-20, F6-22, F6-23, F6-25 — wizard tooltip, copy, layout polish
- F8-02, F8-06 — billing trust badge + redirect copy
- F9-03 — workload empty state
- F10-09 — skip-to-content

**Batch 3 (commit `e7d67665` — additional copy + voice polish):**

- F1-01 — login headline names the product
- F6-14 — Step 2 override-button softened
- F6-16 — Step 3 "AI cleaned" → "AI standardized"
- F6-17 — "Needs review" badge prominence
- F6-18 — "Use suggested filings" consequence tooltip
- F6-24 — LiveGenesisOverlay headline = clients (was: obligations)
- F11-02 — Step 1 parse-error fallback no longer recommends "export as CSV" for CSV failures

**Test alignments (commit `a7e77bac`):**

- `Step3Normalize.test.tsx` / `Wizard.test.tsx` — "AI cleaned your values" → "AI standardized"
- `WizardShell.test.tsx` — "Discard import?" → "Leave without importing?"
- `state-rule-activation-selector.test.tsx` — F5-08 plain-English warning verified

**Deferred (component swap, server change, layout reshuffle, copy that needed test-coupled commits):**

- F1-02, F1-03, F1-06, F1-08, F1-09, F1-11, F1-12 — login data-t namespacing, layout, OTP segmented input, expiry countdown, name capture, type-scale, brand alignment
- F2-02, F2-03, F2-04 — unauth invite preview, FieldSeparator unification, error.cause
- F3-01, F4-01, F4-02 (pass), F4-04 — recovery-code length branch, acknowledge checkbox, copy-button feedback
- F5-03, F5-09, F5-10, F5-11, F5-12, F5-13 — cross-page label parity, 28→44px grid touch target, counter rename, inline validation, narrated CTA, pill placement
- F6-02, F6-04 (pass with nit), F6-05, F6-06, F6-09, F6-13, F6-15 (pass), F6-21, F6-27 — chip order, label terminal-style, live row count, lock-pill anchor, EIN summary context, "undo expires in" timer, step-specific Continue labels (test-coupled)
- F7-01, F7-03 (pass), F7-04 — cross-page label, soft repeat, two-place empty state token
- F8-01, F8-03, F8-04, F8-05 — billing checkout layout reshuffle
- F9-01, F9-04 (pass), F9-07 (pass) — calendar empty state
- F10-01, F10-02 (partially shipped), F10-03, F10-04, F10-05, F10-06, F10-07, F10-08 (pass), F10-10 — copy normalization
- F11-01, F11-03, F11-04, F11-05 — error-recovery improvements
- F12-01 — onboarding concept-help (requires new ConceptId entry)

Total findings: **80**.
Total shipped: **40**.
Total verified pass (no change needed): **10**.
Total deferred: **30**.
